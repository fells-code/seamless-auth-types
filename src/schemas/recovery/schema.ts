import { z } from 'zod';

import { IsoDate } from '../../shared.js';
import { NextStepSchema, RefreshSuccessResponseSchema } from '../auth/auth.schema.js';
import { AuthDeliverySchema } from '../messaging/schema.js';

/**
 * Ten base32 characters, shown as `XXXXX-XXXXX`. Accepted with or without the dash
 * and in either case, because people copy them from paper.
 */
export const RecoveryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z2-7]{5}-?[A-Za-z2-7]{5}$/, { message: 'Not a recovery code' });

export type RecoveryCode = z.infer<typeof RecoveryCodeSchema>;

/** `GET /recovery-codes`. `createdAt` is null until the user has generated a set. */
export const RecoveryCodesStatusSchema = z.object({
  enabled: z.boolean(),
  remaining: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  createdAt: IsoDate.nullable(),
});

export type RecoveryCodesStatus = z.infer<typeof RecoveryCodesStatusSchema>;

/**
 * `POST /recovery-codes`. The only time the codes are ever returned; the server keeps
 * them hashed. Generating a set invalidates the previous one.
 */
export const RecoveryCodesGeneratedSchema = z.object({
  message: z.string(),
  codes: z.array(RecoveryCodeSchema).min(1),
  createdAt: IsoDate,
});

export type RecoveryCodesGenerated = z.infer<typeof RecoveryCodesGeneratedSchema>;

/** `POST /recovery-codes/redeem`, with the pre-auth token from `/login`. */
export const RecoveryCodeRedeemRequestSchema = z.object({
  code: RecoveryCodeSchema,
});

export type RecoveryCodeRedeemRequest = z.infer<typeof RecoveryCodeRedeemRequestSchema>;

/**
 * The session a recovery issues. `recovery: true` marks a restricted session: until
 * the user enrolls a new passkey or TOTP, the API answers `403 enrollment_required` on
 * everything but enrollment, recovery codes, `/users/me` and logout, and the server
 * adapters' `requireAuth` refuse it unless told otherwise. Enrolling rotates it into a
 * normal session.
 */
export const RecoverySessionResponseSchema = RefreshSuccessResponseSchema.omit({
  sessionId: true,
}).extend({
  recovery: z.literal(true),
  nextStep: NextStepSchema,
});

export type RecoverySessionResponse = z.infer<typeof RecoverySessionResponseSchema>;

export const AccountRecoveryChannelSchema = z.enum(['email', 'phone']);

export type AccountRecoveryChannel = z.infer<typeof AccountRecoveryChannelSchema>;

/**
 * `POST /recovery/start`, with the pre-auth token from `/login`. Sends a code to the
 * verified address on file for that channel. The answer is the same whether or not
 * the account has one, so it does not say which channels an account has.
 */
export const AccountRecoveryStartRequestSchema = z.object({
  channel: AccountRecoveryChannelSchema.default('email'),
});

export type AccountRecoveryStartRequest = z.infer<typeof AccountRecoveryStartRequestSchema>;

export const AccountRecoveryStartResponseSchema = z.object({
  message: z.string(),
  delivery: AuthDeliverySchema.optional(),
});

export type AccountRecoveryStartResponse = z.infer<typeof AccountRecoveryStartResponseSchema>;

/** `POST /recovery/verify`: the code from `/recovery/start` opens the request. */
export const AccountRecoveryVerifyRequestSchema = z.object({
  code: z.string().trim().min(1),
});

export type AccountRecoveryVerifyRequest = z.infer<typeof AccountRecoveryVerifyRequestSchema>;

export const AccountRecoveryStateSchema = z.enum(['pending', 'ready', 'cancelled', 'completed']);

export type AccountRecoveryState = z.infer<typeof AccountRecoveryStateSchema>;

/**
 * `POST /recovery/verify` and `GET /recovery/status`. `pending` until `completesAt`,
 * then `ready`; every other channel and active session was told when it opened, and
 * any of them can cancel it.
 */
export const AccountRecoveryStatusSchema = z.object({
  state: AccountRecoveryStateSchema,
  requestedAt: IsoDate,
  completesAt: IsoDate,
});

export type AccountRecoveryStatus = z.infer<typeof AccountRecoveryStatusSchema>;

/**
 * `POST /recovery/cancel`. Either the token from the notice sent to the other
 * channels, or no body with an access session for the account.
 */
export const AccountRecoveryCancelRequestSchema = z.object({
  cancelToken: z.string().trim().min(1).optional(),
});

export type AccountRecoveryCancelRequest = z.infer<typeof AccountRecoveryCancelRequestSchema>;
