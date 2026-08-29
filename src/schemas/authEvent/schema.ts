import z from 'zod';
import { IsoDate } from '../../shared.js';

export const AUTH_EVENT_TYPES = [
  'admin_device_replacement_recovery',
  'admin_session_revoked',
  'auth_action_incremented',
  'bearer_token_failed',
  'bearer_token_success',
  'bearer_token_suspicious',
  'credentials_deleted',
  'informational',
  'internal_user_updated_by_owner',
  'jwks_failed',
  'jwks_success',
  'jwks_suspicious',
  'login_challenge',
  'login_failed',
  'login_success',
  'login_suspicious',
  'logout_failed',
  'logout_success',
  'logout_suspicious',
  'magic_link_failed',
  'magic_link_poll_completed_successfully',
  'magic_link_requested',
  'magic_link_success',
  'mfa_otp_failed',
  'mfa_otp_success',
  'mfa_otp_suspicious',
  'notification_sent',
  'oauth_login_failed',
  'oauth_login_started',
  'oauth_login_success',
  'otp_failed',
  'otp_success',
  'otp_suspicious',
  'recovery_otp_failed',
  'recovery_otp_success',
  'recovery_otp_suspicious',
  'refresh_token_failed',
  'refresh_token_success',
  'refresh_token_suspicious',
  'registration_failed',
  'registration_success',
  'registration_suspicious',
  'request_suspicious',
  'service_token_failed',
  'service_token_rotated',
  'service_token_success',
  'service_token_suspicious',
  'step_up_challenge',
  'step_up_failed',
  'step_up_success',
  'step_up_suspicious',
  'system_config_error',
  'system_config_read',
  'system_config_updated',
  'totp_disabled',
  'totp_enrollment_started',
  'totp_enrollment_success',
  'totp_failed',
  'totp_success',
  'totp_suspicious',
  'user_created',
  'user_data_failed',
  'user_data_success',
  'user_data_suspicious',
  'user_deleted',
  'verify_otp_failed',
  'verify_otp_success',
  'verify_otp_suspicious',
  'webauthn_login_failed',
  'webauthn_login_success',
  'webauthn_login_suspicious',
  'webauthn_registration_failed',
  'webauthn_registration_success',
  'webauthn_registration_suspicious',
] as const;

export const AuthEventTypeEnum = z.enum(AUTH_EVENT_TYPES);

export type AuthEventType = z.infer<typeof AuthEventTypeEnum>;

// `type` stays a plain string: a stored event written by a newer server must
// still parse on an older consumer. Use AuthEventTypeEnum to validate input.
export const AuthEventSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable().optional(),
  /**
   * Who performed the action, when that is not the subject of it.
   *
   * An administrator acting on someone else's account is recorded with the
   * target in `user_id` and the administrator here. Null for the ordinary case
   * where a user acted on their own account, and for events written before the
   * column existed.
   */
  actor_user_id: z.string().nullable().optional(),
  /**
   * The session the action was taken from.
   *
   * Null for anything that happened before a session existed, which is most of
   * the pre-auth surface: login challenges, OTP sends, magic link requests.
   */
  session_id: z.string().nullable().optional(),
  type: z.string(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export type AuthEvent = z.infer<typeof AuthEventSchema>;

export const AuthEventQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),

  userId: z.string().optional(),
  /** Filters to what one administrator did, rather than what happened to one user. */
  actorUserId: z.string().optional(),
  /** Filters to everything that happened in one session. */
  sessionId: z.string().optional(),
  type: z
    .union([AuthEventTypeEnum, z.string(), z.array(z.union([AuthEventTypeEnum, z.string()]))])
    .optional(),

  from: z.string().optional(),
  to: z.string().optional(),
});

export type AuthEventQuery = z.infer<typeof AuthEventQuerySchema>;

export const AuthEventsResponseSchema = z.object({
  events: z.array(AuthEventSchema),
  total: z.number(),
});

export type AuthEventsResponse = z.infer<typeof AuthEventsResponseSchema>;
