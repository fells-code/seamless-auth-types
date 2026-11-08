import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import { CalloutFailureSchema, CalloutUrlSchema } from '../callout/schema.js';

/**
 * Streaming the audit log to a SIEM (API ADR 0005). Each record is the event's
 * `seamless-auth-events/1` export line, with `seq`, `prevHash`, `hash` and `payload`, so the hash
 * chain verifies downstream exactly as an export does.
 *
 * - `otlp`: OTLP/HTTP with JSON encoding, posted to `<endpoint>/v1/logs`.
 * - `syslog`: RFC 5424 over TLS (RFC 5425) with octet counting. Plain TCP only outside production.
 *
 * A sink has its own cursor and retries until its destination takes the events. There is no dead
 * letter: a sink falls behind, and `status.lagEvents` says by how much.
 */
export const AuditSinkRoutes = {
  sinks: '/admin/audit-sinks',
  sink: '/admin/audit-sinks/:id',
  sinkTest: '/admin/audit-sinks/:id/test',
} as const;

/**
 * Credentials are never stored. A sink names env vars on the API host, and the names must end in
 * `_AUDIT_SINK_SECRET`, so configuration cannot send a secret the server holds for something
 * else.
 */
export const AUDIT_SINK_SECRET_ENV_PATTERN = /^[A-Z][A-Z0-9_]{0,59}_AUDIT_SINK_SECRET$/;

export const AuditSinkSecretEnvSchema = z.string().regex(AUDIT_SINK_SECRET_ENV_PATTERN);

export type AuditSinkSecretEnv = z.infer<typeof AuditSinkSecretEnvSchema>;

const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,100}$/;

// Headers the transport sets itself, or that would change where or how the request goes.
const FORBIDDEN_HEADERS = new Set([
  'host',
  'content-length',
  'content-type',
  'content-encoding',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'upgrade',
  'te',
  'trailer',
  'proxy-authorization',
]);

export const AuditSinkHeaderNameSchema = z
  .string()
  .regex(HEADER_NAME)
  .refine((name) => !FORBIDDEN_HEADERS.has(name.toLowerCase()), 'is set by the transport');

export type AuditSinkHeaderName = z.infer<typeof AuditSinkHeaderNameSchema>;

export const OtlpSinkSettingsSchema = z.object({
  kind: z.literal('otlp'),
  /** The collector's base URL. `/v1/logs` is appended. */
  endpoint: CalloutUrlSchema,
  /** Header name to the env var holding its value, such as `{ "DD-API-KEY": "DD_AUDIT_SINK_SECRET" }`. */
  headersFromEnv: z.record(AuditSinkHeaderNameSchema, AuditSinkSecretEnvSchema).default({}),
  serviceName: z.string().trim().min(1).max(100).default('seamless-auth'),
});

export type OtlpSinkSettings = z.infer<typeof OtlpSinkSettingsSchema>;

export const SyslogSinkSettingsSchema = z.object({
  kind: z.literal('syslog'),
  host: z.string().trim().min(1).max(253),
  port: z.number().int().min(1).max(65535).default(6514),
  transport: z.enum(['tls', 'tcp']).default('tls'),
  appName: z
    .string()
    .regex(/^[!-~]{1,48}$/)
    .default('seamless-auth'),
  /** RFC 5424 facility. The default, 10, is authpriv. */
  facility: z.number().int().min(0).max(23).default(10),
  /** PEM, from env vars, for collectors that check a client certificate or use a private CA. */
  tlsCaEnv: AuditSinkSecretEnvSchema.optional(),
  tlsClientCertEnv: AuditSinkSecretEnvSchema.optional(),
  tlsClientKeyEnv: AuditSinkSecretEnvSchema.optional(),
});

export type SyslogSinkSettings = z.infer<typeof SyslogSinkSettingsSchema>;

export const AuditSinkSettingsSchema = z.discriminatedUnion('kind', [
  OtlpSinkSettingsSchema,
  SyslogSinkSettingsSchema,
]);

export type AuditSinkSettings = z.infer<typeof AuditSinkSettingsSchema>;

export const AuditSinkStatusSchema = z.object({
  /** The last event the destination accepted. */
  cursorSeq: z.number().int().nullable(),
  lagEvents: z.number().int().nonnegative().nullable(),
  lastDeliveredAt: IsoDate.nullable(),
  lastFailure: CalloutFailureSchema.nullable(),
  lastFailureAt: IsoDate.nullable(),
});

export type AuditSinkStatus = z.infer<typeof AuditSinkStatusSchema>;

export const AuditSinkSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  settings: AuditSinkSettingsSchema,
  status: AuditSinkStatusSchema,
  createdAt: IsoDate,
  updatedAt: IsoDate,
});

export type AuditSink = z.infer<typeof AuditSinkSchema>;

export const AuditSinkIdParamSchema = z.object({ id: z.uuid() });

export type AuditSinkIdParam = z.infer<typeof AuditSinkIdParamSchema>;

const NameSchema = z.string().trim().min(1).max(100);

export const CreateAuditSinkRequestSchema = z.object({
  name: NameSchema,
  settings: AuditSinkSettingsSchema,
  enabled: z.boolean().default(true),
  /**
   * Where the stream starts. Absent, it starts after the newest event. A `seq` replays from
   * there, for a sink catching up on history the export does not cover.
   */
  startAfterSeq: z.number().int().nonnegative().optional(),
});

export type CreateAuditSinkRequest = z.infer<typeof CreateAuditSinkRequestSchema>;

export const UpdateAuditSinkRequestSchema = z
  .object({
    name: NameSchema,
    settings: AuditSinkSettingsSchema,
    enabled: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'nothing to update');

export type UpdateAuditSinkRequest = z.infer<typeof UpdateAuditSinkRequestSchema>;

export const AuditSinkResponseSchema = z.object({ sink: AuditSinkSchema });

export type AuditSinkResponse = z.infer<typeof AuditSinkResponseSchema>;

export const AuditSinkListResponseSchema = z.object({ sinks: z.array(AuditSinkSchema) });

export type AuditSinkListResponse = z.infer<typeof AuditSinkListResponseSchema>;

export const AUDIT_EXPORT_FORMAT = 'seamless-auth-events/1';

/**
 * One event as the export, the retention archive and every sink write it. Verify a run of them
 * by checking that `hash` is the hex SHA-256 of `prevHash` (empty when null) followed by
 * `payload`, in UTF-8, and that each `prevHash` is the previous event's `hash`.
 */
export const AuditExportEventSchema = z.object({
  seq: z.number().int(),
  id: z.string(),
  createdAt: z.string(),
  type: z.string(),
  userId: z.string().nullable(),
  actorUserId: z.string().nullable(),
  sessionId: z.string().nullable(),
  attemptId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  deploymentId: z.string().nullable(),
  deviceClass: z.string().nullable(),
  mailProvider: z.string().nullable(),
  owner: z.boolean().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  prevHash: z.string().nullable(),
  hash: z.string(),
  payload: z.string(),
});

export type AuditExportEvent = z.infer<typeof AuditExportEventSchema>;
