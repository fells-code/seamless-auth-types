import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import { MembershipRoleSchema } from '../organization/schema.js';
import { ROLE_NAME_PATTERN, RoleNameSchema } from '../role/schema.js';

export * from './matching.js';

/** The same alphabet as a role name, so it is as safe in a JWT claim and a URL segment. */
export const PermissionNameSchema = z.string().trim().regex(ROLE_NAME_PATTERN);

export type PermissionName = z.infer<typeof PermissionNameSchema>;

const DescriptionSchema = z.string().trim().min(1).max(500);

export const PermissionSchema = z.object({
  id: z.string(),
  name: PermissionNameSchema,
  description: z.string().nullable(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});

export type Permission = z.infer<typeof PermissionSchema>;

export const PermissionNameParamSchema = z.object({
  permissionName: PermissionNameSchema,
});

export type PermissionNameParam = z.infer<typeof PermissionNameParamSchema>;

export const CreatePermissionRequestSchema = z.object({
  name: PermissionNameSchema,
  description: DescriptionSchema.optional(),
});

export type CreatePermissionRequest = z.infer<typeof CreatePermissionRequestSchema>;

export const UpdatePermissionRequestSchema = z.object({
  description: DescriptionSchema.nullable(),
});

export type UpdatePermissionRequest = z.infer<typeof UpdatePermissionRequestSchema>;

export const PermissionEnvelopeResponseSchema = z.object({
  permission: PermissionSchema,
});

export type PermissionEnvelopeResponse = z.infer<typeof PermissionEnvelopeResponseSchema>;

export const PermissionListResponseSchema = z.object({
  permissions: z.array(PermissionSchema),
  total: z.number().int().nonnegative(),
});

export type PermissionListResponse = z.infer<typeof PermissionListResponseSchema>;

/**
 * An instance role is held on the user and reaches the token as `roles`. An organization role
 * is held on a membership and reaches the token as `org_roles`. The two never share grants: an
 * organization `admin` is not an instance `admin`.
 */
export const RoleKindSchema = z.enum(['instance', 'organization']);

export type RoleKind = z.infer<typeof RoleKindSchema>;

export const RoleDefinitionSchema = z.object({
  /**
   * Read as a membership role rather than a role name: an organization role from before the
   * catalogue existed keeps its original spelling, whether or not a new one could use it.
   */
  name: MembershipRoleSchema,
  kind: RoleKindSchema,
  description: z.string().nullable(),
  /** `owner`, `admin` and `member`, which the API's own organization routes depend on. */
  builtIn: z.boolean(),
  permissions: z.array(PermissionNameSchema),
});

export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;

export const RoleListResponseSchema = z.object({
  roles: z.array(RoleDefinitionSchema),
});

export type RoleListResponse = z.infer<typeof RoleListResponseSchema>;

export const RoleEnvelopeResponseSchema = z.object({
  role: RoleDefinitionSchema,
});

export type RoleEnvelopeResponse = z.infer<typeof RoleEnvelopeResponseSchema>;

export const RolePermissionsParamSchema = z.object({
  kind: RoleKindSchema,
  roleName: MembershipRoleSchema,
});

export type RolePermissionsParam = z.infer<typeof RolePermissionsParamSchema>;

/** Replaces the role's whole mapping, so a client cannot leave a stale grant behind by omission. */
export const SetRolePermissionsRequestSchema = z.object({
  permissions: z.array(PermissionNameSchema).max(200),
});

export type SetRolePermissionsRequest = z.infer<typeof SetRolePermissionsRequestSchema>;

export const OrganizationRoleParamSchema = z.object({
  roleName: MembershipRoleSchema,
});

export type OrganizationRoleParam = z.infer<typeof OrganizationRoleParamSchema>;

export const CreateOrganizationRoleRequestSchema = z.object({
  name: RoleNameSchema,
  description: DescriptionSchema.optional(),
  permissions: z.array(PermissionNameSchema).max(200).optional(),
});

export type CreateOrganizationRoleRequest = z.infer<typeof CreateOrganizationRoleRequestSchema>;

export const UpdateOrganizationRoleRequestSchema = z.object({
  description: DescriptionSchema.nullable(),
});

export type UpdateOrganizationRoleRequest = z.infer<typeof UpdateOrganizationRoleRequestSchema>;

/**
 * The authorization claims of a first-party access token. Loose because a verifier reads the
 * claims it knows and must not refuse a token for carrying one added later.
 *
 * - `roles` and `permissions` apply across the instance.
 * - `org_id`, `org_roles` and `org_permissions` apply to the active organization only, and are
 *   absent when the session has none.
 * - `permissions_omitted` replaces `permissions`, `org_roles` and `org_permissions` when they
 *   would not fit in the token. Absent arrays then mean "ask", not "none": read the live set
 *   from `GET /users/me/permissions`.
 */
export const AccessTokenClaimsSchema = z.looseObject({
  sub: z.string(),
  sid: z.string(),
  typ: z.literal('access'),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  org_id: z.string().optional(),
  org_roles: z.array(z.string()).optional(),
  org_permissions: z.array(z.string()).optional(),
  permissions_omitted: z.literal(true).optional(),
  recovery: z.literal(true).optional(),
});

export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;

/** The caller's live authorization, for a token that omits it and for a check that cannot wait. */
export const EffectivePermissionsResponseSchema = z.object({
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  organizationId: z.string().nullable(),
  organizationRoles: z.array(z.string()),
  organizationPermissions: z.array(z.string()),
});

export type EffectivePermissionsResponse = z.infer<typeof EffectivePermissionsResponseSchema>;
