import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import { RoleNameSchema } from '../role/schema.js';

export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  phone: z.string(),
  roles: z.array(RoleNameSchema).default([]),
  revoked: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  verified: z.boolean().default(false),
  lastLogin: IsoDate.nullable().optional(),
  createdAt: IsoDate,
  updatedAt: IsoDate.nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * The user as it crosses the wire. Looser than {@link UserSchema}: the id is an
 * opaque string rather than a UUID, phone is nullable for email-only accounts,
 * and the verification flags are absent on endpoints that do not expose them.
 */
export const ApiUserSchema = z
  .object({
    id: z.string(),
    email: z.email(),
    phone: z.string().nullable(),
    roles: z.array(RoleNameSchema).default([]),
    revoked: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
    verified: z.boolean().optional(),
    lastLogin: IsoDate.nullable().optional(),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
  })
  .strict();

export type ApiUser = z.infer<typeof ApiUserSchema>;

export const CreateUserSchema = z.object({
  email: z.email(),
  phone: z.string().min(5).nullish(),
  roles: z.array(RoleNameSchema).min(1),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    email: z.email().optional(),
    phone: z.string().min(5).nullish(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
    roles: z.array(RoleNameSchema).min(1).optional(),
  })
  .strict();

export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;

export const UserResponseSchema = z.object({
  user: ApiUserSchema,
});

export const UsersListResponseSchema = z.object({
  users: z.array(ApiUserSchema),
  total: z.number(),
});
