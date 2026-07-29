import { z } from 'zod';
import { AuthEventSchema } from '../authEvent/schema.js';
import { CredentialResponseSchema } from '../credential/schema.js';
import { SessionSchema } from '../session/schema.js';
import { ApiUserSchema } from '../user/schema.js';

export const UserIdParamSchema = z.object({
  userId: z.string(),
});

/**
 * What an operator clears when a user replaces a lost device. Each step is
 * opt-out rather than opt-in so a hurried recovery does not leave the old
 * device's credentials in place.
 */
export const DeviceReplacementRecoverySchema = z
  .object({
    revokeSessions: z.boolean().default(true),
    removePasskeys: z.boolean().default(true),
    disableTotp: z.boolean().default(true),
  })
  .strict();

export type DeviceReplacementRecoveryRequest = z.infer<typeof DeviceReplacementRecoverySchema>;

export const DeviceReplacementRecoveryResponseSchema = z.object({
  userId: z.string(),
  revokedSessions: z.number().int().nonnegative(),
  removedCredentials: z.number().int().nonnegative(),
  disabledTotpCredentials: z.number().int().nonnegative(),
});

export type DeviceReplacementRecoveryResponse = z.infer<
  typeof DeviceReplacementRecoveryResponseSchema
>;

export const AdminUserDetailResponseSchema = z.object({
  user: ApiUserSchema,
  sessions: z.array(SessionSchema),
  credentials: z.array(CredentialResponseSchema),
  events: z.array(AuthEventSchema),
});

export type AdminUserDetailResponse = z.infer<typeof AdminUserDetailResponseSchema>;

export const AdminUserAnomaliesResponseSchema = z.object({
  suspiciousEvents: z.array(AuthEventSchema),
  relatedIps: z.array(z.string()),
  relatedAgents: z.array(z.string()),
});

export type AdminUserAnomaliesResponse = z.infer<typeof AdminUserAnomaliesResponseSchema>;
