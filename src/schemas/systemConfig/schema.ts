import { z } from 'zod';
import { OAuthProviderIdSchema } from '../common/schema.js';
import { UserImportSourceSchema } from '../userImport/schema.js';
import { RoleNameSchema } from '../role/schema.js';

export const LoginMethodSchema = z.enum([
  'passkey',
  'magic_link',
  'email_otp',
  'phone_otp',
  'oauth',
]);

export type LoginMethod = z.infer<typeof LoginMethodSchema>;

/**
 * Schemes that must never be a redirect target.
 *
 * `z.url()` accepts anything the URL parser does, which includes
 * `javascript:alert(1)` and `data:text/html,...`. A magic link target is rendered as
 * an href in an email, so one of those stored in config would be a script-execution
 * sink reachable through the admin API. Denied rather than allowlisted because the
 * point of this list is to permit arbitrary application schemes (`myapp://`), which
 * an allowlist of known-good schemes could not express.
 */
const DENIED_REDIRECT_PROTOCOLS = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
  'about:',
]);

export const RedirectTargetSchema = z.url().refine(
  (value) => {
    try {
      return !DENIED_REDIRECT_PROTOCOLS.has(new URL(value).protocol.toLowerCase());
    } catch {
      return false;
    }
  },
  { message: 'Redirect target uses a scheme that cannot be a link destination' },
);

export type RedirectTarget = z.infer<typeof RedirectTargetSchema>;

// Provider endpoints the server fetches, and the authorization URL the browser is sent
// to. `z.url()` alone accepts any scheme, including `javascript:`.
const ProviderUrlSchema = z.url({ protocol: /^https?$/ });

/**
 * The auth server reads a provider's secret from this env var, so the name is held to
 * the shape of an OAuth client secret: configuration cannot point the token exchange at
 * any other secret the server holds (GHSA-qx82-28gf-w744).
 */
export const OAuthClientSecretEnvSchema = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9_]{0,59}_CLIENT_SECRET$/, {
    message: 'Must be an env var name ending in _CLIENT_SECRET, for example GOOGLE_CLIENT_SECRET',
  });

export type OAuthClientSecretEnv = z.infer<typeof OAuthClientSecretEnvSchema>;

export const OAuthProviderConfigSchema = z.object({
  id: OAuthProviderIdSchema,
  name: z.string().trim().min(1).max(80),
  enabled: z.boolean().default(true),
  clientId: z.string().trim().min(1),
  // The secret itself never lives in config; this names the environment
  // variable the server reads it from.
  clientSecretEnv: OAuthClientSecretEnvSchema,
  authorizationUrl: ProviderUrlSchema,
  tokenUrl: ProviderUrlSchema,
  userInfoUrl: ProviderUrlSchema,
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
  /**
   * OpenID Connect. With `issuer` and `jwksUri` set, the token response must carry an
   * ID token, which is verified (signature, issuer, audience, expiry and nonce) and
   * read for the profile claims instead of calling `userInfoUrl`.
   */
  issuer: z.url().optional(),
  jwksUri: ProviderUrlSchema.optional(),
  /**
   * Links a first sign-in to a user imported under this source (see
   * `ImportUsersRequestSchema`) whose external id equals the ID token claim at
   * `externalIdJsonPath`, such as Entra ID's `oid`. Only honoured for a provider with
   * `issuer` and `jwksUri`, since the claim must come from a verified ID token.
   */
  externalIdSource: UserImportSourceSchema.optional(),
  externalIdJsonPath: z.string().trim().min(1).optional(),
  /**
   * After a sign-in through this provider by a user with no passkey, the callback
   * response carries `nextStep: 'enroll_passkey'`. Meant for a legacy identity provider
   * that users are being moved off.
   */
  promptPasskeyEnrollment: z.boolean().default(false),
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

const PerIpLimitSchema = z.number().int().positive();

/**
 * How many times one caller may start a message-carrying or provider flow per
 * window, before the general `rate_limit` applies to everything else.
 *
 * Two keys per flow because they guard different things. `perIdentity` bounds
 * how often one address or phone can be messaged, which is the abuse a sender
 * cares about. `perIp` bounds how many distinct addresses one network location
 * can drive, which is the enumeration and spam guard. The per-IP values were
 * fixed constants before this key existed, and those constants are the defaults
 * here, so a deployment that sets nothing behaves as it did.
 *
 * Per-IP limits are the ones a native app runs into first. Mobile carriers put
 * thousands of subscribers behind one address, so a value that never troubles a
 * web audience can refuse a mobile audience at modest scale. Raise `perIp` for a
 * deployment that serves phones; leave `perIdentity` where it is.
 */
export const FlowRateLimitsSchema = z.object({
  windowSeconds: z
    .number()
    .int()
    .positive()
    .default(15 * 60),
  otp: z
    .object({
      perIp: PerIpLimitSchema.default(10),
      perIdentity: PerIpLimitSchema.default(5),
    })
    .default({ perIp: 10, perIdentity: 5 }),
  magicLink: z
    .object({
      perIp: PerIpLimitSchema.default(20),
      perIdentity: PerIpLimitSchema.default(5),
    })
    .default({ perIp: 20, perIdentity: 5 }),
  oauth: z
    .object({
      perIp: PerIpLimitSchema.default(30),
      perProvider: PerIpLimitSchema.default(10),
    })
    .default({ perIp: 30, perProvider: 10 }),
});

export type FlowRateLimits = z.infer<typeof FlowRateLimitsSchema>;

export const DefaultFlowRateLimits = {
  windowSeconds: 15 * 60,
  otp: { perIp: 10, perIdentity: 5 },
  magicLink: { perIp: 20, perIdentity: 5 },
  oauth: { perIp: 30, perProvider: 10 },
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
export const AttestationPolicySchema = z.enum(['none', 'direct']);

export const SyncedPasskeyPolicySchema = z.enum(['allow', 'block']);

export type SyncedPasskeyPolicy = z.infer<typeof SyncedPasskeyPolicySchema>;

export type AttestationPolicy = z.infer<typeof AttestationPolicySchema>;

export const UserVerificationPolicySchema = z.enum(['required', 'preferred', 'discouraged']);

export type UserVerificationPolicy = z.infer<typeof UserVerificationPolicySchema>;

export const AuthenticatorPolicySchema = z.object({
  attachment: AuthenticatorAttachmentPolicySchema.default('any'),
  /**
   * Whether the authenticator must verify the human, by PIN, biometric or
   * equivalent, rather than only proving it holds the key.
   *
   * One value drives both what the browser is asked for and what the server
   * enforces, so the two cannot disagree. Asking for less than is enforced sends
   * a user through an entire ceremony that fails at the last step.
   *
   * `required` is the default because user verification is what separates a
   * second factor from a second signature, and it is the basis of any AAL2
   * claim.
   */
  userVerification: UserVerificationPolicySchema.default('required'),
  /**
   * Whether to ask the authenticator to identify itself with an attestation
   * statement.
   *
   * `none`, the default, asks for nothing and is right for a consumer
   * deployment: attestation carries a privacy cost and most relying parties have
   * no use for it. `direct` requests a statement, which is what makes metadata
   * validation and any allow or deny list of approved models possible, and is
   * what an organisation issuing its own authenticators wants.
   */
  attestation: AttestationPolicySchema.default('none'),
  /**
   * What to do with an authenticator the FIDO Metadata Service does not list.
   *
   * `false`, the default, registers it anyway. `true` refuses it, which is the
   * stricter posture an organisation wanting only known, certified models would
   * choose. Only meaningful when `attestation` is `direct`, since an
   * authenticator that was never asked to identify itself cannot be looked up.
   */
  requireKnownAuthenticator: z.boolean().default(false),
  /**
   * Whether a credential that can leave the device it was created on may be
   * registered.
   *
   * A multi-device credential is synced by a platform password manager, so the
   * private key exists somewhere outside the authenticator that made it. That is
   * exactly what a consumer wants and exactly what an organisation issuing its
   * own authenticators does not.
   *
   * `allow` is the default because it is the only value under which a stock
   * deployment enrols the passkey a normal device actually offers. Every iCloud
   * Keychain and Google Password Manager credential is multi-device, so
   * defaulting to `block` refuses the common case and makes a first registration
   * fail on hardware the operator has no way to change. An organisation issuing
   * its own authenticators sets `block`, which is a deliberate posture rather
   * than something to be inherited by accident.
   *
   * Judged on backup eligibility rather than current backup state: a credential
   * that *can* sync is the exposure, whether or not it has yet.
   */
  syncedPasskeys: SyncedPasskeyPolicySchema.default('allow'),
  /**
   * Authenticator models that may register, by AAGUID.
   *
   * Empty, the default, means no restriction. A non-empty list admits only those
   * models, which is how an organisation limits enrolment to the keys it issues
   * or to certified hardware. Requires `attestation: 'direct'` to be meaningful,
   * since an authenticator that was never asked to identify itself reports no
   * usable AAGUID.
   */
  aaguidAllowList: z.array(z.string()).default([]),
  /** Authenticator models that may not register, by AAGUID. Applied before the allow list. */
  aaguidDenyList: z.array(z.string()).default([]),
});

export type AuthenticatorPolicy = z.infer<typeof AuthenticatorPolicySchema>;

export const DefaultAuthenticatorPolicy = {
  attachment: 'any',
  userVerification: 'required',
  attestation: 'none',
  requireKnownAuthenticator: false,
  syncedPasskeys: 'allow',
  aaguidAllowList: [],
  aaguidDenyList: [],
} as const;

const DurationSchema = z.string().regex(/^\d+[smhd]$/);

const DURATION_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const;

function durationSeconds(value: string) {
  const unit = value.slice(-1) as keyof typeof DURATION_SECONDS;
  return Number(value.slice(0, -1)) * DURATION_SECONDS[unit];
}

/**
 * Single-use recovery codes. On by default: a user only has codes after generating
 * them, so the switch only matters once someone has. Not a login method, so no
 * `login_methods` change can take a user's way back in away from them.
 */
export const RecoveryCodesPolicySchema = z.object({
  enabled: z.boolean().default(true),
  /** Ask for a set of codes as part of first passkey enrollment. */
  requireAtEnrollment: z.boolean().default(false),
});

export type RecoveryCodesPolicy = z.infer<typeof RecoveryCodesPolicySchema>;

/**
 * Self-service recovery through a verified email or phone, completed only after
 * `delay` and announced on every other channel and session so the owner can cancel.
 * Off by default: it is a way into an account that does not need its factors.
 */
export const AccountRecoveryPolicySchema = z.object({
  enabled: z.boolean().default(false),
  delay: DurationSchema.refine(
    (value) => durationSeconds(value) >= 3600 && durationSeconds(value) <= 30 * 86400,
    { message: 'delay must be between 1h and 30d' },
  ).default('24h'),
});

export type AccountRecoveryPolicy = z.infer<typeof AccountRecoveryPolicySchema>;

const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, { message: 'must be a hex color' });

/**
 * Branding for the OpenID Provider service's hosted pages (ADR 0001, D7). The service
 * injects these into its pages as CSS variables at serve time, so every value is
 * constrained to a form that cannot break out of a CSS declaration.
 */
export const HostedUiSchema = z
  .object({
    /** Shown in place of `app_name` on the hosted pages. */
    appName: z.string().trim().min(1).max(100).optional(),
    logoUrl: z
      .url({ protocol: /^https$/ })
      .max(2048)
      .optional(),
    colors: z
      .object({
        primary: HexColorSchema.optional(),
        onPrimary: HexColorSchema.optional(),
        background: HexColorSchema.optional(),
        surface: HexColorSchema.optional(),
        text: HexColorSchema.optional(),
      })
      .strict()
      .optional(),
    /** A CSS font stack of installed or system fonts, such as `Inter, system-ui, sans-serif`. */
    fontFamily: z
      .string()
      .max(200)
      .regex(/^[A-Za-z0-9 ,'-]+$/, { message: 'must be a list of font names' })
      .optional(),
  })
  .strict();

export type HostedUi = z.infer<typeof HostedUiSchema>;

export const SystemConfigSchema = z.object({
  app_name: z.string().min(3),
  default_roles: z.array(RoleNameSchema).min(1),
  available_roles: z.array(RoleNameSchema).min(1),
  login_methods: z.array(LoginMethodSchema).min(1),
  passkey_login_fallback_enabled: z.boolean(),
  /**
   * After an email or phone code sign-in, or a magic link sign-in, by a user with no
   * passkey, the session response carries `nextStep: 'enroll_passkey'`. For moving an
   * organization onto passkeys, for example after importing its users. OAuth
   * providers have their own `promptPasskeyEnrollment`.
   */
  prompt_passkey_enrollment: z.boolean().default(false),
  /**
   * Phishing-resistant authentication only. Sign-in accepts a passkey and nothing
   * else: email and phone codes, magic links, TOTP and OAuth are refused as ways to
   * start a session, whatever `login_methods` and `passkey_login_fallback_enabled`
   * say. A code is still accepted once, to verify the address of a new account before
   * its first passkey is enrolled.
   */
  phishing_resistant_only: z.boolean().default(false),
  oauth_providers: z.array(OAuthProviderConfigSchema).default([]),
  lockout_policy: LockoutPolicySchema.default(DefaultLockoutPolicy),
  // Derived from the field defaults rather than restated, so the two cannot drift.
  // DefaultAuthenticatorPolicy stays exported for consumers that need the shape.
  authenticator_policy: AuthenticatorPolicySchema.default(() =>
    AuthenticatorPolicySchema.parse({}),
  ),
  recovery_codes: RecoveryCodesPolicySchema.default(() => RecoveryCodesPolicySchema.parse({})),
  account_recovery: AccountRecoveryPolicySchema.default(() =>
    AccountRecoveryPolicySchema.parse({}),
  ),

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

  /**
   * How many sessions one user may hold at once, or `null` for no limit.
   *
   * `null` rather than `0` for unlimited, so a deployment cannot express "no
   * sessions allowed" by accident and the absence of a limit reads as an absence
   * rather than as a magic number. Defaults to `null`, which is what every
   * deployment predating this key already behaves like.
   *
   * NIST 800-53 AC-10. Also an operational concern wherever workstations are
   * shared, since an unbounded count leaves sessions alive on machines the user
   * has walked away from.
   */
  max_concurrent_sessions: z.number().int().positive().nullable().default(null),

  rate_limit: z.number().int().positive(),
  delay_after: z.number().int().nonnegative(),
  flow_rate_limits: FlowRateLimitsSchema.default(DefaultFlowRateLimits),

  rpid: z.string().min(1),
  /**
   * The WebAuthn origins this deployment accepts, and the fallback for the magic
   * link and OAuth destinations (`origins[0]`), so the web origin belongs first.
   *
   * `z.url()` here is deliberately loose. An Android app's WebAuthn origin is
   * `android:apk-key-hash:<base64url>`, which is a valid URL with an opaque path
   * and no host, and it must be accepted here for native passkeys to verify. Do
   * not tighten this to a hostname check without carrying that form along.
   */
  origins: z.array(z.url()).min(1),

  frontend_url: z.url().optional(),

  /**
   * Exact-match destinations a magic link may be sent to, beyond what `origins`
   * already covers. Empty by default, which leaves the server comparing a requested
   * target against `origins` as it did before this key existed.
   *
   * Exact match rather than origin comparison, because the cases this exists for have
   * no origin to compare: a custom scheme such as `myapp://auth`, or a universal link
   * on a host that should not also be a WebAuthn origin.
   */
  magic_link_redirect_uris: z.array(RedirectTargetSchema).default([]),

  /**
   * Turns on the API's `/oidc/*` routes for the OpenID Provider service. Off by default,
   * and the API refuses to turn it on until `oidc_issuer` is set and covered by `rpid` and
   * the provider signing keys are present.
   */
  oidc_provider_enabled: z.boolean().default(false),
  /** The provider service's public URL. Never equal to the API's own `ISSUER`. */
  oidc_issuer: z.url().nullable().default(null),
  /** Lets an admin opt individual provider clients in to shared secrets. */
  allow_client_secrets: z.boolean().default(false),
  third_party_clients_enabled: z.boolean().default(false),
  /** Branding for the provider's hosted pages, or `null` for the defaults. */
  hosted_ui: HostedUiSchema.nullable().default(null),
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
    prompt_passkey_enrollment: z.boolean().optional(),
    phishing_resistant_only: z.boolean().optional(),
    oauth_providers: z.array(OAuthProviderConfigSchema).optional(),
    lockout_policy: LockoutPolicySchema.optional(),
    authenticator_policy: AuthenticatorPolicySchema.optional(),
    recovery_codes: RecoveryCodesPolicySchema.optional(),
    account_recovery: AccountRecoveryPolicySchema.optional(),
    access_token_ttl: SystemConfigSchema.shape.access_token_ttl.optional(),
    session_idle_ttl: DurationSchema.optional(),
    refresh_token_ttl: SystemConfigSchema.shape.refresh_token_ttl.optional(),
    max_concurrent_sessions: z.number().int().positive().nullable().optional(),
    rate_limit: SystemConfigSchema.shape.rate_limit.optional(),
    delay_after: SystemConfigSchema.shape.delay_after.optional(),
    flow_rate_limits: FlowRateLimitsSchema.optional(),
    rpid: SystemConfigSchema.shape.rpid.optional(),
    origins: SystemConfigSchema.shape.origins.optional(),
    magic_link_redirect_uris: z.array(RedirectTargetSchema).optional(),
    oidc_provider_enabled: z.boolean().optional(),
    oidc_issuer: z.url().nullable().optional(),
    allow_client_secrets: z.boolean().optional(),
    third_party_clients_enabled: z.boolean().optional(),
    hosted_ui: HostedUiSchema.nullable().optional(),
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

type WithoutDefaults<Shape extends z.ZodRawShape> = {
  [Key in keyof Shape]: Shape[Key] extends z.ZodDefault<infer Inner> ? Inner : Shape[Key];
};

function withoutDefaults<Shape extends z.ZodRawShape>(shape: Shape): WithoutDefaults<Shape> {
  return Object.fromEntries(
    Object.entries(shape).map(([key, field]) => [
      key,
      field instanceof z.ZodDefault ? field.unwrap() : field,
    ]),
  ) as WithoutDefaults<Shape>;
}

// The id is immutable and taken from the path, so it is omitted here. Every other
// field is optional so callers can patch a single attribute without resending the
// whole provider; the merged result is re-validated against the full schema.
//
// Defaults are stripped first: `.partial()` keeps them, so a patch of one field would
// parse to that field plus every default, and merging that over the stored provider
// silently reset settings such as `accountLinking` and `allowSignup`.
export const OAuthProviderUpdateSchema = z
  .object(withoutDefaults(OAuthProviderConfigSchema.omit({ id: true }).shape))
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
  // Optional so a client still parses a server from before v0.20. Lets the sign-in
  // screens offer "use a recovery code" and "can't sign in?" only where they work.
  recoveryCodes: z.boolean().optional(),
  accountRecovery: z.boolean().optional(),
});

export type PublicSystemConfigResponse = z.infer<typeof PublicSystemConfigResponseSchema>;
