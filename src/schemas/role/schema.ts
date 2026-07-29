import { z } from 'zod';

import { ROLE_NAME_PATTERN } from './matching.js';

export * from './matching.js';

export const RoleNameSchema = z.string().trim().regex(ROLE_NAME_PATTERN);

export type RoleName = z.infer<typeof RoleNameSchema>;

/** @deprecated Use {@link RoleNameSchema}. */
export const RoleSchema = RoleNameSchema;

/** @deprecated Use {@link RoleName}. */
export type Role = z.infer<typeof RoleSchema>;
