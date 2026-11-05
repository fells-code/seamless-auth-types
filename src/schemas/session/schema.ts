import { z } from 'zod';
import { RefreshSuccessResponseSchema } from '../auth/auth.schema.js';

export const SessionSchema = z.object({
  id: z.string(),
  deviceName: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  lastUsedAt: z.string(),
  expiresAt: z.string(),
  current: z.boolean(),
  /** The session a token exchange linked this one to. Absent on an ordinary session. */
  parentSessionId: z.string().nullable().optional(),
  /** The native client that exchanged for this session. */
  exchangeClientId: z.string().nullable().optional(),
  /** The grant behind the provider sign-in the exchange came from. */
  exchangeGrantType: z.string().nullable().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const SessionIdParamsSchema = z.object({
  id: z.string(),
});

export type SessionIdParams = z.infer<typeof SessionIdParamsSchema>;

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionSchema),
  total: z.number(),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

/**
 * `POST /sessions/exchange` (ADR 0003): a native client turns the single-use provider access
 * token it just received into a first-party session of its own. RFC 8693 parameter names, in
 * the API's JSON body style.
 */
export const SESSION_EXCHANGE_SCOPE = 'session:exchange';
export const SESSION_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';
export const SESSION_EXCHANGE_SUBJECT_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';
export const SESSION_EXCHANGE_ISSUED_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:refresh_token';

export const SessionExchangeRequestSchema = z
  .object({
    grant_type: z.literal(SESSION_EXCHANGE_GRANT_TYPE),
    subject_token: z.string().min(1).max(8192),
    subject_token_type: z.literal(SESSION_EXCHANGE_SUBJECT_TOKEN_TYPE),
    requested_token_type: z.literal(SESSION_EXCHANGE_ISSUED_TOKEN_TYPE).optional(),
  })
  .strict();

export type SessionExchangeRequest = z.infer<typeof SessionExchangeRequestSchema>;

/** The `/refresh` response, plus `issued_token_type` (RFC 8693 section 2.2.1). */
export const SessionExchangeResponseSchema = RefreshSuccessResponseSchema.extend({
  issued_token_type: z.literal(SESSION_EXCHANGE_ISSUED_TOKEN_TYPE),
});

export type SessionExchangeResponse = z.infer<typeof SessionExchangeResponseSchema>;

/**
 * RFC 8693 section 2.2.2. One body for every subject token failure, so the route cannot be
 * used to probe sessions. `token_already_used` tells the client its sign-in may have been
 * intercepted, which only it and a thief can know.
 */
export const SessionExchangeErrorSchema = z.object({
  error: z.literal('invalid_request'),
  error_description: z.literal('token_already_used').optional(),
});

export type SessionExchangeError = z.infer<typeof SessionExchangeErrorSchema>;
