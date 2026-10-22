import { z } from 'zod';

import { IsoDate } from '../../shared.js';
import { SystemConfigSchema } from '../systemConfig/schema.js';

/**
 * The system config keys that decide who can sign in, and how. These are the ones a
 * change can lock people out with, so each published change is kept as a version that
 * can be restored in one step, and can be staged as a draft and dry-run first.
 */
export const POLICY_KEYS = [
  'login_methods',
  'passkey_login_fallback_enabled',
  'phishing_resistant_only',
  'prompt_passkey_enrollment',
  'authenticator_policy',
  'lockout_policy',
  'recovery_codes',
  'account_recovery',
] as const;

export const PolicyKeySchema = z.enum(POLICY_KEYS);

export type PolicyKey = z.infer<typeof PolicyKeySchema>;

export const PolicyDocumentSchema = SystemConfigSchema.pick({
  login_methods: true,
  passkey_login_fallback_enabled: true,
  phishing_resistant_only: true,
  prompt_passkey_enrollment: true,
  authenticator_policy: true,
  lockout_policy: true,
  recovery_codes: true,
  account_recovery: true,
});

export type PolicyDocument = z.infer<typeof PolicyDocumentSchema>;

/**
 * How a version came to be. Drafts are optional: a whole-config PATCH that touches a
 * policy key still applies immediately, and is recorded as a `config_patch` version so
 * it can be rolled back like any other.
 */
export const PolicyVersionSourceSchema = z.enum([
  'publish',
  'rollback',
  'config_patch',
  'bootstrap',
]);

export type PolicyVersionSource = z.infer<typeof PolicyVersionSourceSchema>;

export const PolicyVersionSchema = z.object({
  version: z.number().int().positive(),
  policy: PolicyDocumentSchema,
  source: PolicyVersionSourceSchema,
  publishedAt: IsoDate,
  /** User id of the administrator, or null for a version the server wrote itself. */
  publishedBy: z.string().nullable(),
  /** The version a rollback restored. */
  rolledBackTo: z.number().int().positive().optional(),
});

export type PolicyVersion = z.infer<typeof PolicyVersionSchema>;

export const PolicyDraftSchema = z.object({
  policy: PolicyDocumentSchema,
  /** The published version the draft was started from. */
  basedOnVersion: z.number().int().positive(),
  updatedAt: IsoDate,
  updatedBy: z.string().nullable(),
});

export type PolicyDraft = z.infer<typeof PolicyDraftSchema>;

/** `GET /system-config/policy`. */
export const PolicyStateResponseSchema = z.object({
  published: PolicyVersionSchema,
  draft: PolicyDraftSchema.nullable(),
});

export type PolicyStateResponse = z.infer<typeof PolicyStateResponseSchema>;

/** `PUT /system-config/policy/draft`. */
export const PolicyDraftSaveRequestSchema = z
  .object({
    policy: PolicyDocumentSchema,
  })
  .strict();

export type PolicyDraftSaveRequest = z.infer<typeof PolicyDraftSaveRequestSchema>;

/**
 * `POST /system-config/policy/publish`. `expectedVersion` is the published version the
 * caller reviewed; publishing answers `409` if another version was published since, so
 * a stale draft cannot silently undo someone else's change.
 */
export const PolicyPublishRequestSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export type PolicyPublishRequest = z.infer<typeof PolicyPublishRequestSchema>;

/** `POST /system-config/policy/rollback`: publishes a copy of `version` as a new version. */
export const PolicyRollbackRequestSchema = z
  .object({
    version: z.number().int().positive(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export type PolicyRollbackRequest = z.infer<typeof PolicyRollbackRequestSchema>;

/** `GET /system-config/policy/versions`, newest first. */
export const PolicyVersionsResponseSchema = z.object({
  versions: z.array(PolicyVersionSchema),
});

export type PolicyVersionsResponse = z.infer<typeof PolicyVersionsResponseSchema>;

/**
 * `POST /system-config/policy/dry-run`. Without `policy`, evaluates the current draft.
 */
export const PolicyDryRunRequestSchema = z
  .object({
    policy: PolicyDocumentSchema.optional(),
    days: z.number().int().min(1).max(30).default(7),
  })
  .strict();

export type PolicyDryRunRequest = z.infer<typeof PolicyDryRunRequestSchema>;

export const PolicyDryRunReasonSchema = z.enum([
  'method_disabled',
  'phishing_resistant_required',
  'fallback_disabled',
  'synced_passkey_blocked',
  'authenticator_not_allowed',
  'user_verification_required',
]);

export type PolicyDryRunReason = z.infer<typeof PolicyDryRunReasonSchema>;

export const PolicyDryRunUserSchema = z.object({
  userId: z.string(),
  email: z.string(),
  /** Sign-ins in the window this policy would have refused. */
  signIns: z.number().int().nonnegative(),
  reasons: z.array(PolicyDryRunReasonSchema).min(1),
  /** True when none of the user's enrolled factors would still sign them in. */
  lockedOut: z.boolean(),
});

export type PolicyDryRunUser = z.infer<typeof PolicyDryRunUserSchema>;

export const PolicyDryRunResponseSchema = z.object({
  window: z.object({ from: IsoDate, to: IsoDate }),
  signInsEvaluated: z.number().int().nonnegative(),
  usersEvaluated: z.number().int().nonnegative(),
  wouldFail: z.array(PolicyDryRunUserSchema),
  usersLockedOut: z.number().int().nonnegative(),
  /** Break-glass accounts are exempt from policy, so they are counted, never refused. */
  breakGlassAccounts: z.number().int().nonnegative(),
});

export type PolicyDryRunResponse = z.infer<typeof PolicyDryRunResponseSchema>;
