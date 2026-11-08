import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import { CalloutFailureSchema, CalloutSecretSchema, CalloutUrlSchema } from '../callout/schema.js';

export * from './constants.js';

/**
 * Signed, retried webhooks (API ADR 0005). Routes are on the private API under `/admin`, behind
 * `admin:write` with step-up on every write.
 *
 * Delivery is at least once and unordered. A receiver dedupes on `webhook-id`, which is the
 * event's `id` and stays the same across retries and redelivery.
 */
export const WebhookRoutes = {
  endpoints: '/admin/webhooks',
  endpoint: '/admin/webhooks/:id',
  endpointSecret: '/admin/webhooks/:id/secret',
  endpointTest: '/admin/webhooks/:id/test',
  deliveries: '/admin/webhook-deliveries',
  delivery: '/admin/webhook-deliveries/:deliveryId',
  redeliver: '/admin/webhook-deliveries/:deliveryId/redeliver',
} as const;

/** Every type a subscription can name. The catalog is a public contract and grows by addition. */
export const WEBHOOK_EVENT_TYPES = [
  'user.created',
  'user.deleted',
  'user.signed_in',
  'user.recovered',
  'session.revoked',
  'credential.added',
  'credential.removed',
  'organization.member_added',
  'organization.member_updated',
  'organization.member_removed',
] as const;

export const WebhookEventTypeSchema = z.enum(WEBHOOK_EVENT_TYPES);

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

/** Only sent by the test endpoint, to the endpoint tested, whatever it subscribes to. */
export const WEBHOOK_TEST_EVENT_TYPE = 'webhook.test';

export const WEBHOOK_PAYLOAD_VERSION = 1;

const Id = z.string().min(1);

export const UserCreatedDataSchema = z.object({
  userId: Id,
  /** What the account was made with, so a receiver can provision without a second call. */
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export type UserCreatedData = z.infer<typeof UserCreatedDataSchema>;

export const UserDeletedDataSchema = z.object({ userId: Id });

export type UserDeletedData = z.infer<typeof UserDeletedDataSchema>;

export const UserSignedInDataSchema = z.object({
  userId: Id,
  sessionId: Id.nullable(),
  /** How the sign-in was completed, such as `passkey`, `otp` or `break_glass`. */
  method: z.string().nullable(),
  organizationId: Id.nullable(),
});

export type UserSignedInData = z.infer<typeof UserSignedInDataSchema>;

export const UserRecoveredDataSchema = z.object({ userId: Id });

export type UserRecoveredData = z.infer<typeof UserRecoveredDataSchema>;

export const SessionRevokedReasonSchema = z.enum(['logout', 'admin', 'evicted', 'provider']);

export type SessionRevokedReason = z.infer<typeof SessionRevokedReasonSchema>;

export const SessionRevokedDataSchema = z.object({
  userId: Id.nullable(),
  sessionId: Id.nullable(),
  reason: SessionRevokedReasonSchema,
});

export type SessionRevokedData = z.infer<typeof SessionRevokedDataSchema>;

export const CredentialKindSchema = z.enum(['passkey', 'totp', 'recovery_codes']);

export type CredentialKind = z.infer<typeof CredentialKindSchema>;

export const CredentialChangedDataSchema = z.object({
  userId: Id,
  kind: CredentialKindSchema,
  credentialId: Id.nullable(),
});

export type CredentialChangedData = z.infer<typeof CredentialChangedDataSchema>;

export const OrganizationMemberDataSchema = z.object({
  organizationId: Id,
  userId: Id,
  /** The member's roles after the change. Empty on removal. */
  roles: z.array(z.string()),
});

export type OrganizationMemberData = z.infer<typeof OrganizationMemberDataSchema>;

export const WebhookTestDataSchema = z.object({ endpointId: Id });

export type WebhookTestData = z.infer<typeof WebhookTestDataSchema>;

function envelope<T extends string, D extends z.ZodType>(type: T, data: D) {
  return z.object({
    id: Id,
    type: z.literal(type),
    version: z.literal(WEBHOOK_PAYLOAD_VERSION),
    /** When the event happened, which can be well before a retried delivery. */
    timestamp: IsoDate,
    data,
  });
}

/**
 * The body of every webhook. Parse the raw body only after its signature verifies, and verify
 * against the raw bytes: re-serializing parsed JSON breaks the signature.
 */
export const WebhookEventSchema = z.discriminatedUnion('type', [
  envelope('user.created', UserCreatedDataSchema),
  envelope('user.deleted', UserDeletedDataSchema),
  envelope('user.signed_in', UserSignedInDataSchema),
  envelope('user.recovered', UserRecoveredDataSchema),
  envelope('session.revoked', SessionRevokedDataSchema),
  envelope('credential.added', CredentialChangedDataSchema),
  envelope('credential.removed', CredentialChangedDataSchema),
  envelope('organization.member_added', OrganizationMemberDataSchema),
  envelope('organization.member_updated', OrganizationMemberDataSchema),
  envelope('organization.member_removed', OrganizationMemberDataSchema),
  envelope(WEBHOOK_TEST_EVENT_TYPE, WebhookTestDataSchema),
]);

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * `gone`: the endpoint answered 410. `failing`: every delivery failed for three days.
 * `manual`: an administrator turned it off.
 */
export const WebhookDisabledReasonSchema = z.enum(['gone', 'failing', 'manual']);

export type WebhookDisabledReason = z.infer<typeof WebhookDisabledReasonSchema>;

export const WebhookEndpointSchema = z.object({
  id: Id,
  url: z.string(),
  description: z.string().nullable(),
  eventTypes: z.array(WebhookEventTypeSchema),
  enabled: z.boolean(),
  disabledReason: WebhookDisabledReasonSchema.nullable(),
  version: z.literal(WEBHOOK_PAYLOAD_VERSION),
  /** While set, the previous secret still signs beside the current one. */
  previousSecretExpiresAt: IsoDate.nullable(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});

export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;

export const WebhookEndpointIdParamSchema = z.object({ id: z.uuid() });

export type WebhookEndpointIdParam = z.infer<typeof WebhookEndpointIdParamSchema>;

const EventTypesSchema = z
  .array(WebhookEventTypeSchema)
  .min(1)
  .refine((types) => new Set(types).size === types.length, 'event types must not repeat');

const DescriptionSchema = z.string().trim().min(1).max(500);

export const CreateWebhookEndpointRequestSchema = z.object({
  url: CalloutUrlSchema,
  description: DescriptionSchema.optional(),
  eventTypes: EventTypesSchema,
  enabled: z.boolean().optional(),
});

export type CreateWebhookEndpointRequest = z.infer<typeof CreateWebhookEndpointRequestSchema>;

export const UpdateWebhookEndpointRequestSchema = z
  .object({
    url: CalloutUrlSchema,
    description: DescriptionSchema.nullable(),
    eventTypes: EventTypesSchema,
    /** Turning an endpoint back on clears `disabledReason`. */
    enabled: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'nothing to update');

export type UpdateWebhookEndpointRequest = z.infer<typeof UpdateWebhookEndpointRequestSchema>;

export const WebhookEndpointResponseSchema = z.object({ endpoint: WebhookEndpointSchema });

export type WebhookEndpointResponse = z.infer<typeof WebhookEndpointResponseSchema>;

/** The signing secret is returned here and on rotation only. It cannot be read back. */
export const WebhookEndpointCreatedResponseSchema = WebhookEndpointResponseSchema.extend({
  secret: CalloutSecretSchema,
});

export type WebhookEndpointCreatedResponse = z.infer<typeof WebhookEndpointCreatedResponseSchema>;

export const WebhookEndpointListResponseSchema = z.object({
  endpoints: z.array(WebhookEndpointSchema),
});

export type WebhookEndpointListResponse = z.infer<typeof WebhookEndpointListResponseSchema>;

export const WebhookSecretRotatedResponseSchema = z.object({
  secret: CalloutSecretSchema,
  previousSecretExpiresAt: IsoDate,
});

export type WebhookSecretRotatedResponse = z.infer<typeof WebhookSecretRotatedResponseSchema>;

/** `dead` is the dead letter state: every scheduled attempt failed. */
export const WebhookDeliveryStatusSchema = z.enum(['pending', 'succeeded', 'failed', 'dead']);

export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusSchema>;

export const WebhookDeliverySchema = z.object({
  id: Id,
  endpointId: Id,
  eventType: z.union([WebhookEventTypeSchema, z.literal(WEBHOOK_TEST_EVENT_TYPE)]),
  status: WebhookDeliveryStatusSchema,
  attempts: z.number().int().nonnegative(),
  nextAttemptAt: IsoDate.nullable(),
  lastAttemptAt: IsoDate.nullable(),
  lastStatusCode: z.number().int().nullable(),
  lastFailure: CalloutFailureSchema.nullable(),
  createdAt: IsoDate,
});

export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

export const WebhookDeliveryDetailSchema = WebhookDeliverySchema.extend({
  event: WebhookEventSchema,
});

export type WebhookDeliveryDetail = z.infer<typeof WebhookDeliveryDetailSchema>;

export const WebhookDeliveryIdParamSchema = z.object({ deliveryId: z.uuid() });

export type WebhookDeliveryIdParam = z.infer<typeof WebhookDeliveryIdParamSchema>;

export const WebhookDeliveryQuerySchema = z.object({
  endpointId: z.uuid().optional(),
  status: WebhookDeliveryStatusSchema.optional(),
  eventType: WebhookEventTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** The `nextCursor` of the previous page. */
  cursor: z.string().max(200).optional(),
});

export type WebhookDeliveryQuery = z.infer<typeof WebhookDeliveryQuerySchema>;

export const WebhookDeliveryListResponseSchema = z.object({
  deliveries: z.array(WebhookDeliverySchema),
  nextCursor: z.string().nullable(),
});

export type WebhookDeliveryListResponse = z.infer<typeof WebhookDeliveryListResponseSchema>;

export const WebhookDeliveryResponseSchema = z.object({ delivery: WebhookDeliveryDetailSchema });

export type WebhookDeliveryResponse = z.infer<typeof WebhookDeliveryResponseSchema>;
