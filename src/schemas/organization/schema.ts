import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import { MetadataSchema } from '../common/schema.js';

export const OrganizationIdParamSchema = z.object({
  organizationId: z.uuid(),
});

export const OrganizationMemberParamSchema = OrganizationIdParamSchema.extend({
  userId: z.uuid(),
});

export const CreateOrganizationRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(100).optional(),
  metadata: MetadataSchema,
});

export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequestSchema>;

export const UpdateOrganizationRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(100).optional(),
  metadata: MetadataSchema,
});

export type UpdateOrganizationRequest = z.infer<typeof UpdateOrganizationRequestSchema>;

const MembershipRoleSchema = z.string().trim().min(1).max(80);
const MembershipScopeSchema = z.string().trim().min(1).max(120);

export const AddOrganizationMemberRequestSchema = z
  .object({
    userId: z.uuid().optional(),
    email: z.email().optional(),
    roles: z.array(MembershipRoleSchema).optional(),
    scopes: z.array(MembershipScopeSchema).optional(),
  })
  .refine((value) => Boolean(value.userId || value.email), {
    message: 'userId or email is required',
  });

export type AddOrganizationMemberRequest = z.infer<typeof AddOrganizationMemberRequestSchema>;

export const UpdateOrganizationMemberRequestSchema = z.object({
  roles: z.array(MembershipRoleSchema).optional(),
  scopes: z.array(MembershipScopeSchema).optional(),
});

export type UpdateOrganizationMemberRequest = z.infer<typeof UpdateOrganizationMemberRequestSchema>;

const OrganizationMembershipUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  roles: z.array(z.string()),
});

export const OrganizationMembershipSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  roles: z.array(z.string()),
  scopes: z.array(z.string()),
  createdAt: IsoDate,
  updatedAt: IsoDate,
  user: OrganizationMembershipUserSchema.optional(),
});

export type OrganizationMembership = z.infer<typeof OrganizationMembershipSchema>;

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdByUserId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
  membership: OrganizationMembershipSchema.optional(),
  memberCount: z.number().int().nonnegative().optional(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const OrganizationEnvelopeResponseSchema = z.object({
  organization: OrganizationSchema,
});

export const OrganizationListResponseSchema = z.object({
  organizations: z.array(OrganizationSchema),
  activeOrganizationId: z.string().nullable(),
});

export type OrganizationListResponse = z.infer<typeof OrganizationListResponseSchema>;

export const AdminOrganizationListResponseSchema = z.object({
  organizations: z.array(OrganizationSchema),
  total: z.number().int().nonnegative(),
});

export const OrganizationMembersResponseSchema = z.object({
  members: z.array(OrganizationMembershipSchema),
  total: z.number().int().nonnegative(),
});

export const OrganizationMembershipEnvelopeResponseSchema = z.object({
  membership: OrganizationMembershipSchema,
});

export const OrganizationSwitchResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
  sub: z.string(),
  sessionId: z.string(),
  organizationId: z.string(),
  organization: OrganizationSchema,
  ttl: z.number(),
});

export type OrganizationSwitchResponse = z.infer<typeof OrganizationSwitchResponseSchema>;
