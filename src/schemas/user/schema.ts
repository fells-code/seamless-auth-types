import { z } from 'zod';
import { IsoDate } from '../../shared.js';

export const RoleSchema = z.string().regex(/^(?!.*[_/\\\s])[A-Za-z0-9-]{1,31}$/);

export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  phone: z.string(),
  roles: z.array(RoleSchema).default([]),
  revoked: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  verified: z.boolean().default(false),
  lastLogin: IsoDate.nullable().optional(),
  createdAt: IsoDate,
  updatedAt: IsoDate.nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.email(),
  phone: z.string(),
  roles: z.array(RoleSchema).min(1),
});

export const UpdateUserSchema = z
  .object({
    email: z.email().optional(),
    phone: z.string().min(5).optional(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
    roles: z.array(RoleSchema).min(1).optional(),
  })
  .strict();
