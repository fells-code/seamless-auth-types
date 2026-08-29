import { z } from 'zod';
import { AuthEventSchema } from '../authEvent/schema.js';
import { CredentialResponseSchema } from '../credential/schema.js';
import { SessionSchema } from '../session/schema.js';
import { ApiUserSchema } from '../user/schema.js';

export const UserIdParamSchema = z.object({
  userId: z.string(),
});

export type UserIdParam = z.infer<typeof UserIdParamSchema>;

export const RecoveryProofingMethodSchema = z.enum(['in_person', 'remote_exception']);

export type RecoveryProofingMethod = z.infer<typeof RecoveryProofingMethodSchema>;

/**
 * How the operator established that the person asking is who they say they are.
 *
 * Admin-assisted recovery revokes every session, removes every passkey and
 * disables TOTP, so it is the step social engineering aims at. Recording the
 * proofing makes a recovery reviewable after the fact and forces the operator to
 * have done it.
 *
 * `evidenceRef` is a pointer, for example a ticket or case number, not the
 * evidence itself. Do not put personal data here: it is written to the audit
 * trail, where identifiers are redacted.
 */
export const RecoveryProofingSchema = z
  .object({
    method: RecoveryProofingMethodSchema,
    evidenceRef: z.string().trim().min(1).max(200),
    approver: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.method === 'remote_exception' && !value.approver) {
      ctx.addIssue({
        code: 'custom',
        path: ['approver'],
        message: 'A remote exception requires a named approver',
      });
    }
  });

export type RecoveryProofing = z.infer<typeof RecoveryProofingSchema>;

/**
 * What an operator clears when a user replaces a lost device. Each step is
 * opt-out rather than opt-in so a hurried recovery does not leave the old
 * device's credentials in place.
 *
 * `proofing` is required: this endpoint cannot be called without stating how
 * identity was established.
 */
export const DeviceReplacementRecoverySchema = z
  .object({
    revokeSessions: z.boolean().default(true),
    removePasskeys: z.boolean().default(true),
    disableTotp: z.boolean().default(true),
    proofing: RecoveryProofingSchema,
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
