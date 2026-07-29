import { z } from 'zod';
import { RoleNameSchema } from '../role/schema.js';

export const LoginMethodSchema = z.enum([
  'passkey',
  'magic_link',
  'email_otp',
  'phone_otp',
  'oauth',
]);

export type LoginMethod = z.infer<typeof LoginMethodSchema>;

export const OAuthProviderIdSchema = z.string().regex(/^[a-z0-9-]{2,40}$/);

export const OAuthProviderConfigSchema = z.object({
  id: OAuthProviderIdSchema,
  name: z.string().trim().min(1).max(80),
  enabled: z.boolean().default(true),
  clientId: z.string().trim().min(1),
  // The secret itself never lives in config; this names the environment
  // variable the server reads it from.
  clientSecretEnv: z.string().trim().min(1),
  authorizationUrl: z.url(),
  tokenUrl: z.url(),
  userInfoUrl: z.url(),
  scopes: z.array(z.string().trim().min(1)).default([]),
  redirectUri: z.url().optional(),
  redirectUris: z.array(z.url()).default([]),
  subjectJsonPath: z.string().trim().min(1).default('sub'),
  emailJsonPath: z.string().trim().min(1).default('email'),
  emailVerifiedJsonPath: z.string().trim().min(1).default('email_verified'),
  nameJsonPath: z.string().trim().min(1).optional(),
  allowSignup: z.boolean().default(true),
  accountLinking: z.enum(['email', 'disabled']).default('email'),
  requireEmailVerified: z.boolean().default(false),
  pkce: z.boolean().optional(),
});

export type OAuthProviderConfig = z.infer<typeof OAuthProviderConfigSchema>;

export const LockoutPolicySchema = z.object({
  enabled: z.boolean().default(true),
  maxFailures: z.number().int().positive().default(10),
  windowSeconds: z
    .number()
    .int()
    .positive()
    .default(15 * 60),
  lockoutSeconds: z
    .number()
    .int()
    .positive()
    .default(15 * 60),
});

export type LockoutPolicy = z.infer<typeof LockoutPolicySchema>;

export const DefaultLockoutPolicy = {
  enabled: true,
  maxFailures: 10,
  windowSeconds: 15 * 60,
  lockoutSeconds: 15 * 60,
} as const;

export const SystemConfigSchema = z.object({
  app_name: z.string().min(3),
  default_roles: z.array(RoleNameSchema).min(1),
  available_roles: z.array(RoleNameSchema).min(1),
  login_methods: z.array(LoginMethodSchema).min(1),
  passkey_login_fallback_enabled: z.boolean(),
  oauth_providers: z.array(OAuthProviderConfigSchema).default([]),
  lockout_policy: LockoutPolicySchema.default(DefaultLockoutPolicy),

  access_token_ttl: z.string().regex(/^\d+[smhd]$/),
  refresh_token_ttl: z.string().regex(/^\d+[smhd]$/),

  rate_limit: z.number().int().positive(),
  delay_after: z.number().int().nonnegative(),

  rpid: z.string().min(1),
  origins: z.array(z.url()).min(1),

  frontend_url: z.url().optional(),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export const SystemConfigPatchSchema = z
  .object({
    app_name: SystemConfigSchema.shape.app_name.optional(),
    default_roles: SystemConfigSchema.shape.default_roles.optional(),
    available_roles: SystemConfigSchema.shape.available_roles.optional(),
    login_methods: SystemConfigSchema.shape.login_methods.optional(),
    passkey_login_fallback_enabled:
      SystemConfigSchema.shape.passkey_login_fallback_enabled.optional(),
    oauth_providers: z.array(OAuthProviderConfigSchema).optional(),
    lockout_policy: LockoutPolicySchema.optional(),
    access_token_ttl: SystemConfigSchema.shape.access_token_ttl.optional(),
    refresh_token_ttl: SystemConfigSchema.shape.refresh_token_ttl.optional(),
    rate_limit: SystemConfigSchema.shape.rate_limit.optional(),
    delay_after: SystemConfigSchema.shape.delay_after.optional(),
    rpid: SystemConfigSchema.shape.rpid.optional(),
    origins: SystemConfigSchema.shape.origins.optional(),
  })
  .strict();

export type SystemConfigPatch = z.infer<typeof SystemConfigPatchSchema>;

/**
 * A patch schema bound to the config currently stored, so role edits can be
 * checked against the merged result rather than the patch alone.
 */
export function createPatchSystemConfigSchema(existing: SystemConfig) {
  return SystemConfigPatchSchema.superRefine((data, ctx) => {
    const nextAvailable = data.available_roles ?? existing.available_roles;
    const nextDefault = data.default_roles ?? existing.default_roles;

    const removedDefaults =
      data.available_roles !== undefined &&
      existing.default_roles.some((role) => !data.available_roles?.includes(role));

    if (removedDefaults) {
      ctx.addIssue({
        code: 'custom',
        path: ['available_roles'],
        message: 'Cannot remove roles currently set as default',
      });
    }

    if (!nextDefault.every((role) => nextAvailable.includes(role))) {
      ctx.addIssue({
        code: 'custom',
        path: ['default_roles'],
        message: 'All default roles must exist in available_roles',
      });
    }
  });
}

export const OAuthProviderCreateSchema = OAuthProviderConfigSchema;

export const OAuthProviderIdParamSchema = z.object({
  id: OAuthProviderIdSchema,
});

// The id is immutable and taken from the path, so it is omitted here. Every other
// field is optional so callers can patch a single attribute without resending the
// whole provider; the merged result is re-validated against the full schema.
export const OAuthProviderUpdateSchema = OAuthProviderConfigSchema.omit({ id: true })
  .partial()
  .strict();

export type OAuthProviderUpdate = z.infer<typeof OAuthProviderUpdateSchema>;

export const OAuthProvidersListResponseSchema = z.object({
  providers: z.array(OAuthProviderConfigSchema),
});

export const OAuthProviderResponseSchema = z.object({
  provider: OAuthProviderConfigSchema,
});

export const OAuthProviderDeletedResponseSchema = z.object({
  success: z.literal(true),
  id: z.string(),
});

export const GetSystemConfigResponseSchema = SystemConfigSchema;

export const UpdateSystemConfigResponseSchema = z.object({
  success: z.boolean(),
  updatedKeys: z.array(z.string()),
});

export type UpdateSystemConfigResponse = z.infer<typeof UpdateSystemConfigResponseSchema>;

export const AvailableRolesResponseSchema = z.object({
  roles: z.array(z.string()),
});
