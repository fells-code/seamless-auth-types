import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import { CredentialResponseSchema } from '../credential/schema.js';
import { OrganizationSchema } from '../organization/schema.js';
import { RoleNameSchema } from '../role/schema.js';

/**
 * The caller's own user record. `lastLogin` is null until the first login, and
 * `activeOrganizationId` is null when the access token carries no org context.
 */
export const MeUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  roles: z.array(RoleNameSchema),
  lastLogin: IsoDate.nullable().optional(),
  activeOrganizationId: z.string().nullable().optional(),
  /**
   * For a cookie client, which cannot read its access token. Optional because an older API
   * does not send them, so absence means unknown rather than none. For showing and hiding UI
   * only: the server still has to enforce.
   */
  permissions: z.array(z.string()).optional(),
  organizationRoles: z.array(z.string()).optional(),
  organizationPermissions: z.array(z.string()).optional(),
});

export type MeUser = z.infer<typeof MeUserSchema>;

/** @deprecated Use {@link MeUser}. */
export type SeamlessUser = MeUser;

export const MeResponseSchema = z.object({
  user: MeUserSchema,
  credentials: z.array(CredentialResponseSchema),
  organizations: z.array(OrganizationSchema).optional(),
  activeOrganization: OrganizationSchema.nullable().optional(),
  /**
   * True for a recovery session, from account recovery or a recovery code: it can only
   * enroll a new passkey or authenticator app until one is enrolled. A cookie client
   * cannot read its access token, so this is how it learns that after a reload.
   */
  recovery: z.boolean().optional(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
