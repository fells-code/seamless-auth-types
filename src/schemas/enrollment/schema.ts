import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import { PaginationQuerySchema } from '../common/schema.js';
import { AuthDeliverySchema } from '../messaging/schema.js';
import { RedirectTargetSchema } from '../systemConfig/schema.js';

/**
 * How far a user is through passkey enrollment, counted in WebAuthn credentials
 * (passkeys and security keys; TOTP does not count). Two or more is the goal, so
 * losing one authenticator does not lock the user out.
 */
export const EnrollmentStatusSchema = z.enum(['none', 'one', 'two_or_more']);

export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;

// Accepts the parsed boolean as well as the query string, so parsing an already
// parsed query (as the server does to recover coerced types) gives the same answer.
const BooleanQuerySchema = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
]);

export const AdminEnrollmentQuerySchema = PaginationQuerySchema.extend({
  organizationId: z.uuid().optional(),
  status: EnrollmentStatusSchema.optional(),
  /** Only users brought in through `POST /admin/users/import`. */
  imported: BooleanQuerySchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type AdminEnrollmentQuery = z.infer<typeof AdminEnrollmentQuerySchema>;

export const EnrollmentSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  none: z.number().int().nonnegative(),
  one: z.number().int().nonnegative(),
  twoOrMore: z.number().int().nonnegative(),
});

export type EnrollmentSummary = z.infer<typeof EnrollmentSummarySchema>;

export const EnrollmentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  imported: z.boolean(),
  credentialCount: z.number().int().nonnegative(),
  status: EnrollmentStatusSchema,
  lastLogin: IsoDate.nullable(),
  enrollmentInvitedAt: IsoDate.nullable(),
});

export type EnrollmentUser = z.infer<typeof EnrollmentUserSchema>;

/**
 * `summary` counts every user matching `organizationId` and `imported`, whatever the
 * `status` filter; `users` and `total` are the filtered, paginated list.
 */
export const AdminEnrollmentResponseSchema = z.object({
  summary: EnrollmentSummarySchema,
  users: z.array(EnrollmentUserSchema),
  total: z.number().int().nonnegative(),
});

export type AdminEnrollmentResponse = z.infer<typeof AdminEnrollmentResponseSchema>;

export const ENROLLMENT_INVITE_MAX_USERS = 200;

/**
 * Invites either the listed users or, with `organizationId`, the organization's members
 * whose enrollment is at or below `status`. An organization-wide call sends at most
 * `ENROLLMENT_INVITE_MAX_USERS` and reports how many remain, skipping anyone invited
 * within the last day, so repeating it works through a large organization.
 */
export const EnrollmentInviteRequestSchema = z
  .object({
    userIds: z.array(z.uuid()).min(1).max(ENROLLMENT_INVITE_MAX_USERS).optional(),
    organizationId: z.uuid().optional(),
    status: z.enum(['none', 'one']).default('none'),
    /** Where the email sends the user. Defaults to the tenant's sign-in page. */
    signInUrl: RedirectTargetSchema.optional(),
  })
  .strict()
  .refine((value) => Boolean(value.userIds) !== Boolean(value.organizationId), {
    message: 'exactly one of userIds or organizationId is required',
  });

export type EnrollmentInviteRequest = z.infer<typeof EnrollmentInviteRequestSchema>;

export const ENROLLMENT_INVITE_SKIP_REASONS = [
  'not_found',
  'already_enrolled',
  'recently_invited',
  'delivery_failed',
] as const;

export const EnrollmentInviteSkipReasonSchema = z.enum(ENROLLMENT_INVITE_SKIP_REASONS);

export type EnrollmentInviteSkipReason = z.infer<typeof EnrollmentInviteSkipReasonSchema>;

export const EnrollmentInviteResultSchema = z.object({
  userId: z.string(),
  status: z.enum(['sent', 'skipped']),
  reason: EnrollmentInviteSkipReasonSchema.optional(),
  /** Present in external delivery mode, for the caller to send itself. */
  delivery: AuthDeliverySchema.optional(),
});

export type EnrollmentInviteResult = z.infer<typeof EnrollmentInviteResultSchema>;

export const EnrollmentInviteResponseSchema = z.object({
  sent: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  /** Organization-wide calls only: eligible members left for a later call. */
  remaining: z.number().int().nonnegative().optional(),
  results: z.array(EnrollmentInviteResultSchema),
});

export type EnrollmentInviteResponse = z.infer<typeof EnrollmentInviteResponseSchema>;
