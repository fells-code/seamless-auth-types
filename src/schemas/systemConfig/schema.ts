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

export type OAuthProviderId = z.infer<typeof OAuthProviderIdSchema>;

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

export const AuthenticatorAttachmentPolicySchema = z.enum(['any', 'platform', 'cross-platform']);

export type AuthenticatorAttachmentPolicy = z.infer<typeof AuthenticatorAttachmentPolicySchema>;

/**
 * Which authenticators a deployment will enrol.
 *
 * `attachment` is the standing default for the browser picker at registration.
 * `any` offers both built-in and roaming authenticators, which is what a
 * deployment issuing hardware security keys needs. Naming one narrows the picker
 * and also bounds what a per-request override may ask for.
 */
export const AuthenticatorPolicySchema = z.object({
  attachment: AuthenticatorAttachmentPolicySchema.default('any'),
});

export type AuthenticatorPolicy = z.infer<typeof AuthenticatorPolicySchema>;

export const DefaultAuthenticatorPolicy = {
  attachment: 'any',
} as const;

const DurationSchema = z.string().regex(/^\d+[smhd]$/);

export const SystemConfigSchema = z.object({
  app_name: z.string().min(3),
  default_roles: z.array(RoleNameSchema).min(1),
  available_roles: z.array(RoleNameSchema).min(1),
  login_methods: z.array(LoginMethodSchema).min(1),
  passkey_login_fallback_enabled: z.boolean(),
  oauth_providers: z.array(OAuthProviderConfigSchema).default([]),
  lockout_policy: LockoutPolicySchema.default(DefaultLockoutPolicy),
  authenticator_policy: AuthenticatorPolicySchema.default(DefaultAuthenticatorPolicy),

  access_token_ttl: z.string().regex(/^\d+[smhd]$/),

  /**
   * How long a session may live without being refreshed.
   *
   * The absolute session lifetime is `refresh_token_ttl`, since the refresh token
   * is the session credential. This is the idle bound underneath it, and it only
   * does anything when it is shorter, so keep the two distinct.
   */
  session_idle_ttl: DurationSchema.default('8h'),
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
    authenticator_policy: AuthenticatorPolicySchema.optional(),
    access_token_ttl: SystemConfigSchema.shape.access_token_ttl.optional(),
    session_idle_ttl: DurationSchema.optional(),
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

export type OAuthProviderCreate = z.infer<typeof OAuthProviderCreateSchema>;

export const OAuthProviderIdParamSchema = z.object({
  id: OAuthProviderIdSchema,
});

export type OAuthProviderIdParam = z.infer<typeof OAuthProviderIdParamSchema>;

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

export type OAuthProvidersListResponse = z.infer<typeof OAuthProvidersListResponseSchema>;

export const OAuthProviderResponseSchema = z.object({
  provider: OAuthProviderConfigSchema,
});

export type OAuthProviderResponse = z.infer<typeof OAuthProviderResponseSchema>;

export const OAuthProviderDeletedResponseSchema = z.object({
  success: z.literal(true),
  id: z.string(),
});

export type OAuthProviderDeletedResponse = z.infer<typeof OAuthProviderDeletedResponseSchema>;

export const GetSystemConfigResponseSchema = SystemConfigSchema;

export type GetSystemConfigResponse = z.infer<typeof GetSystemConfigResponseSchema>;

export const UpdateSystemConfigResponseSchema = z.object({
  success: z.boolean(),
  updatedKeys: z.array(z.string()),
});

export type UpdateSystemConfigResponse = z.infer<typeof UpdateSystemConfigResponseSchema>;

export const AvailableRolesResponseSchema = z.object({
  roles: z.array(z.string()),
});

export type AvailableRolesResponse = z.infer<typeof AvailableRolesResponseSchema>;

/**
 * The slice of the system configuration a signed-out client may read.
 *
 * Served unauthenticated so the bundled sign-in screens can match how an
 * instance is actually configured before anyone has a session, rather than
 * guessing at a default set of methods. It also tells a client whether declining
 * a passkey during registration would leave the user with no way back in, which
 * is the difference between offering a skip and trapping someone out of their
 * own account.
 *
 * Everything else in SystemConfigSchema stays behind the admin routes. Only add
 * a key here when a signed-out client genuinely cannot work without it.
 */
export const PublicSystemConfigResponseSchema = z.object({
  loginMethods: z.array(LoginMethodSchema).min(1),
});

export type PublicSystemConfigResponse = z.infer<typeof PublicSystemConfigResponseSchema>;
