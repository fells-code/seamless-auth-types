import { describe, it, expect } from 'vitest';
import {
  AuthenticatorPolicySchema,
  DefaultLockoutPolicy,
  OAuthProviderConfigSchema,
  OAuthProviderUpdateSchema,
  PublicSystemConfigResponseSchema,
  SystemConfigPatchSchema,
  SystemConfigSchema,
  createPatchSystemConfigSchema,
} from './schema.js';

const baseProvider = {
  id: 'acme-idp',
  name: 'Acme',
  clientId: 'client-id',
  clientSecretEnv: 'ACME_CLIENT_SECRET',
  authorizationUrl: 'https://idp.example.com/authorize',
  tokenUrl: 'https://idp.example.com/token',
  userInfoUrl: 'https://idp.example.com/userinfo',
};

const baseConfig = {
  app_name: 'Seamless',
  default_roles: ['user'],
  available_roles: ['user', 'admin'],
  login_methods: ['passkey'],
  passkey_login_fallback_enabled: true,
  access_token_ttl: '15m',
  refresh_token_ttl: '30d',
  rate_limit: 100,
  delay_after: 50,
  rpid: 'example.com',
  origins: ['https://example.com'],
};

describe('OAuthProviderConfigSchema', () => {
  it('applies defaults for the optional discovery fields', () => {
    const parsed = OAuthProviderConfigSchema.parse(baseProvider);

    expect(parsed.enabled).toBe(true);
    expect(parsed.scopes).toEqual([]);
    expect(parsed.redirectUris).toEqual([]);
    expect(parsed.subjectJsonPath).toBe('sub');
    expect(parsed.emailJsonPath).toBe('email');
    expect(parsed.emailVerifiedJsonPath).toBe('email_verified');
    expect(parsed.allowSignup).toBe(true);
    expect(parsed.accountLinking).toBe('email');
    expect(parsed.requireEmailVerified).toBe(false);
  });

  it.each(['A', 'acme_idp', 'x', 'a'.repeat(41)])('rejects the provider id %j', (id) => {
    expect(() => OAuthProviderConfigSchema.parse({ ...baseProvider, id })).toThrow();
  });

  it('rejects a non-URL endpoint', () => {
    expect(() =>
      OAuthProviderConfigSchema.parse({ ...baseProvider, tokenUrl: 'not-a-url' }),
    ).toThrow();
  });
});

describe('OAuthProviderUpdateSchema', () => {
  it('accepts a single field', () => {
    expect(OAuthProviderUpdateSchema.parse({ enabled: false }).enabled).toBe(false);
  });

  // Optional fields that carry a default still resolve to that default, so a
  // caller merging a patch must merge the raw body rather than the parsed one.
  it('fills defaults for the fields the caller omitted', () => {
    expect(OAuthProviderUpdateSchema.parse({ enabled: false }).subjectJsonPath).toBe('sub');
  });

  it('rejects an attempt to change the id', () => {
    expect(() => OAuthProviderUpdateSchema.parse({ id: 'other' })).toThrow();
  });
});

describe('SystemConfigSchema', () => {
  it('applies the default lockout policy', () => {
    const parsed = SystemConfigSchema.parse(baseConfig);

    expect(parsed.lockout_policy).toEqual(DefaultLockoutPolicy);
    expect(parsed.oauth_providers).toEqual([]);
  });

  it.each(['15', '15 m', 'fifteen'])('rejects the ttl %j', (ttl) => {
    expect(() => SystemConfigSchema.parse({ ...baseConfig, access_token_ttl: ttl })).toThrow();
  });

  it('requires at least one login method', () => {
    expect(() => SystemConfigSchema.parse({ ...baseConfig, login_methods: [] })).toThrow();
  });

  it('rejects an unknown login method', () => {
    expect(() => SystemConfigSchema.parse({ ...baseConfig, login_methods: ['carrier'] })).toThrow();
  });

  it('rejects a non-URL origin', () => {
    expect(() => SystemConfigSchema.parse({ ...baseConfig, origins: ['example.com'] })).toThrow();
  });
});

describe('SystemConfigPatchSchema', () => {
  it('accepts a partial update', () => {
    expect(SystemConfigPatchSchema.parse({ rate_limit: 5 })).toEqual({ rate_limit: 5 });
  });

  it('rejects unknown keys', () => {
    expect(() => SystemConfigPatchSchema.parse({ nope: true })).toThrow();
  });
});

describe('createPatchSystemConfigSchema', () => {
  const existing = SystemConfigSchema.parse(baseConfig);
  const schema = createPatchSystemConfigSchema(existing);

  it('accepts a patch that keeps the defaults available', () => {
    expect(() => schema.parse({ available_roles: ['user', 'admin', 'auditor'] })).not.toThrow();
  });

  it('rejects removing a role that is still a default', () => {
    expect(() => schema.parse({ available_roles: ['admin'] })).toThrow();
  });

  it('rejects a default role that is not available', () => {
    expect(() => schema.parse({ default_roles: ['auditor'] })).toThrow();
  });

  it('validates the merged result when both role lists change together', () => {
    expect(() =>
      schema.parse({ default_roles: ['auditor'], available_roles: ['user', 'auditor'] }),
    ).not.toThrow();

    expect(() =>
      schema.parse({ default_roles: ['auditor'], available_roles: ['user', 'admin'] }),
    ).toThrow();
  });
});

describe('PublicSystemConfigResponseSchema', () => {
  it('accepts the configured login methods', () => {
    expect(() =>
      PublicSystemConfigResponseSchema.parse({ loginMethods: ['passkey', 'magic_link'] }),
    ).not.toThrow();
  });

  it('rejects an empty method list, which would leave a client with nothing to offer', () => {
    expect(() => PublicSystemConfigResponseSchema.parse({ loginMethods: [] })).toThrow();
  });

  it('rejects a method outside the enum', () => {
    expect(() => PublicSystemConfigResponseSchema.parse({ loginMethods: ['password'] })).toThrow();
  });

  it('drops any config key that is not part of the public slice', () => {
    const parsed = PublicSystemConfigResponseSchema.parse({
      loginMethods: ['passkey'],
      rpid: 'localhost',
      origins: ['http://localhost:5173'],
    });

    expect(parsed).toEqual({ loginMethods: ['passkey'] });
  });
});

describe('AuthenticatorPolicySchema', () => {
  it('defaults to offering both authenticator kinds', () => {
    expect(AuthenticatorPolicySchema.parse({})).toEqual({
      attachment: 'any',
      userVerification: 'required',
    });
  });

  it('accepts each attachment a deployment may pin to', () => {
    for (const attachment of ['any', 'platform', 'cross-platform'] as const) {
      expect(AuthenticatorPolicySchema.parse({ attachment }).attachment).toBe(attachment);
    }
  });

  it('rejects an unknown attachment', () => {
    expect(AuthenticatorPolicySchema.safeParse({ attachment: 'usb-only' }).success).toBe(false);
  });
});

describe('SystemConfigSchema authenticator_policy', () => {
  it('defaults the block when config predates it', () => {
    const parsed = SystemConfigSchema.parse(baseConfig);

    expect(parsed.authenticator_policy).toEqual({
      attachment: 'any',
      userVerification: 'required',
    });
  });

  it('keeps a pinned attachment', () => {
    const parsed = SystemConfigSchema.parse({
      ...baseConfig,
      authenticator_policy: { attachment: 'cross-platform' },
    });

    expect(parsed.authenticator_policy.attachment).toBe('cross-platform');
  });

  it('is patchable through the strict patch schema', () => {
    const parsed = SystemConfigPatchSchema.safeParse({
      authenticator_policy: { attachment: 'platform' },
    });

    expect(parsed.success).toBe(true);
  });
});

describe('SystemConfigSchema session_idle_ttl', () => {
  it('defaults when config predates the key', () => {
    expect(SystemConfigSchema.parse(baseConfig).session_idle_ttl).toBe('8h');
  });

  it('keeps a configured value', () => {
    const parsed = SystemConfigSchema.parse({ ...baseConfig, session_idle_ttl: '30m' });

    expect(parsed.session_idle_ttl).toBe('30m');
  });

  it('rejects a malformed duration', () => {
    expect(
      SystemConfigSchema.safeParse({ ...baseConfig, session_idle_ttl: 'half an hour' }).success,
    ).toBe(false);
  });

  it('is patchable', () => {
    const parsed = SystemConfigPatchSchema.safeParse({ session_idle_ttl: '15m' });

    expect(parsed.success).toBe(true);
  });

  it('does not inject a default when absent from a patch', () => {
    const parsed = SystemConfigPatchSchema.parse({ app_name: 'Seamless' });

    expect('session_idle_ttl' in parsed).toBe(false);
  });
});

describe('AuthenticatorPolicySchema user verification', () => {
  it('requires user verification unless a deployment says otherwise', () => {
    expect(AuthenticatorPolicySchema.parse({}).userVerification).toBe('required');
  });

  it('accepts each value the WebAuthn specification defines', () => {
    for (const value of ['required', 'preferred', 'discouraged'] as const) {
      expect(AuthenticatorPolicySchema.parse({ userVerification: value }).userVerification).toBe(
        value,
      );
    }
  });

  it('rejects anything outside that set', () => {
    expect(AuthenticatorPolicySchema.safeParse({ userVerification: 'maybe' }).success).toBe(false);
  });

  it('leaves attachment alone when only verification is set', () => {
    const parsed = AuthenticatorPolicySchema.parse({ userVerification: 'preferred' });

    expect(parsed.attachment).toBe('any');
  });
});
