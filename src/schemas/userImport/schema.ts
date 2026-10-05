import { z } from 'zod';
import { MembershipRoleSchema, MembershipScopeSchema } from '../organization/schema.js';
import { RoleNameSchema } from '../role/schema.js';

export const USER_IMPORT_MAX_ROWS = 200;

/** Names the system the users come from, so the same external id can be matched on a re-run. */
export const UserImportSourceSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, 'lowercase letters, digits and hyphens, up to 64');

export type UserImportSource = z.infer<typeof UserImportSourceSchema>;

export const UserImportOrganizationSchema = z
  .object({
    organizationId: z.uuid().optional(),
    slug: z.string().trim().min(1).max(100).optional(),
    roles: z.array(MembershipRoleSchema).max(50).optional(),
    scopes: z.array(MembershipScopeSchema).max(50).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.organizationId) !== Boolean(value.slug), {
    message: 'exactly one of organizationId or slug is required',
  });

export type UserImportOrganization = z.infer<typeof UserImportOrganizationSchema>;

export const UserImportRowSchema = z
  .object({
    externalId: z.string().trim().min(1).max(255).optional(),
    email: z.email(),
    phone: z.string().min(5).nullish(),
    roles: z.array(RoleNameSchema).max(50).optional(),
    organizations: z.array(UserImportOrganizationSchema).max(50).optional(),
  })
  .strict();

export type UserImportRow = z.infer<typeof UserImportRowSchema>;

/**
 * A batch of users to bring across from another identity system.
 *
 * Imports never carry credentials: an imported user signs in for the first time by
 * registering with the imported email, which proves control of the address and then
 * enrolls a passkey. Imports only ever add roles and memberships, never remove them,
 * so re-running one after correcting the source data cannot take access away.
 */
export const ImportUsersRequestSchema = z
  .object({
    source: UserImportSourceSchema,
    dryRun: z.boolean().default(false),
    users: z.array(UserImportRowSchema).min(1).max(USER_IMPORT_MAX_ROWS),
  })
  .strict();

export type ImportUsersRequest = z.infer<typeof ImportUsersRequestSchema>;

export const UserImportStatusSchema = z.enum(['created', 'updated', 'unchanged', 'rejected']);

export type UserImportStatus = z.infer<typeof UserImportStatusSchema>;

export const UserImportRejectionSchema = z.enum([
  'admin_role_not_allowed',
  'role_unavailable',
  'organization_not_found',
  'duplicate_in_batch',
  'email_mismatch',
  'phone_invalid',
  'phone_in_use',
  'external_id_conflict',
  'write_failed',
]);

export type UserImportRejection = z.infer<typeof UserImportRejectionSchema>;

export const UserImportChangeSchema = z.enum([
  'created',
  'linked',
  'phone',
  'roles',
  'organizations',
]);

export type UserImportChange = z.infer<typeof UserImportChangeSchema>;

export const UserImportResultSchema = z.object({
  index: z.number().int().nonnegative(),
  email: z.string(),
  externalId: z.string().optional(),
  status: UserImportStatusSchema,
  userId: z.string().optional(),
  changes: z.array(UserImportChangeSchema).optional(),
  reason: UserImportRejectionSchema.optional(),
  detail: z.string().optional(),
});

export type UserImportResult = z.infer<typeof UserImportResultSchema>;

export const ImportUsersResponseSchema = z.object({
  source: z.string(),
  dryRun: z.boolean(),
  summary: z.object({
    created: z.number().int().nonnegative(),
    updated: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  }),
  results: z.array(UserImportResultSchema),
});

export type ImportUsersResponse = z.infer<typeof ImportUsersResponseSchema>;
