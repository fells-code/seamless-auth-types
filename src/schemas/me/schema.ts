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
});

export type MeUser = z.infer<typeof MeUserSchema>;

/** @deprecated Use {@link MeUser}. */
export type SeamlessUser = MeUser;

export const MeResponseSchema = z.object({
  user: MeUserSchema,
  credentials: z.array(CredentialResponseSchema),
  organizations: z.array(OrganizationSchema).optional(),
  activeOrganization: OrganizationSchema.nullable().optional(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
