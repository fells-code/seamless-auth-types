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

describe('magic_link_redirect_uris', () => {
  it('defaults to empty, so a config predating the key parses unchanged', () => {
    expect(SystemConfigSchema.parse(baseConfig).magic_link_redirect_uris).toEqual([]);
  });

  it('accepts an application scheme, which is the case it exists for', () => {
    const parsed = SystemConfigSchema.parse({
      ...baseConfig,
      magic_link_redirect_uris: ['myapp://auth/magic', 'com.example.app://callback'],
    });

    expect(parsed.magic_link_redirect_uris).toEqual([
      'myapp://auth/magic',
      'com.example.app://callback',
    ]);
  });

  it('accepts a universal link on a host that is not a configured origin', () => {
    const parsed = SystemConfigSchema.parse({
      ...baseConfig,
      magic_link_redirect_uris: ['https://links.example.com/m'],
    });

    expect(parsed.magic_link_redirect_uris).toEqual(['https://links.example.com/m']);
  });

  // z.url() alone accepts these. A magic link target is rendered as an href in an
  // email, so a javascript: or data: entry reachable through the admin API would be a
  // script-execution sink.
  it.each(['javascript:alert(1)', 'data:text/html,<script>x</script>', 'file:///etc/passwd'])(
    'rejects %s',
    (uri) => {
      expect(
        SystemConfigSchema.safeParse({ ...baseConfig, magic_link_redirect_uris: [uri] }).success,
      ).toBe(false);
    },
  );

  it('rejects a value that is not a URL at all', () => {
    expect(
      SystemConfigSchema.safeParse({ ...baseConfig, magic_link_redirect_uris: ['not a url'] })
        .success,
    ).toBe(false);
  });

  it('guards the patch surface the admin API writes through', () => {
    expect(
      SystemConfigPatchSchema.safeParse({ magic_link_redirect_uris: ['javascript:alert(1)'] })
        .success,
    ).toBe(false);
    expect(
      SystemConfigPatchSchema.safeParse({ magic_link_redirect_uris: ['myapp://auth'] }).success,
    ).toBe(true);
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
      attestation: 'none',
      requireKnownAuthenticator: false,
      syncedPasskeys: 'block',
      aaguidAllowList: [],
      aaguidDenyList: [],
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
      attestation: 'none',
      requireKnownAuthenticator: false,
      syncedPasskeys: 'block',
      aaguidAllowList: [],
      aaguidDenyList: [],
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

describe('SystemConfigSchema max_concurrent_sessions', () => {
  it('defaults to no limit when config predates the key', () => {
    expect(SystemConfigSchema.parse(baseConfig).max_concurrent_sessions).toBeNull();
  });

  it('keeps a configured limit', () => {
    const parsed = SystemConfigSchema.parse({ ...baseConfig, max_concurrent_sessions: 3 });

    expect(parsed.max_concurrent_sessions).toBe(3);
  });

  it('accepts an explicit null as no limit', () => {
    const parsed = SystemConfigSchema.parse({ ...baseConfig, max_concurrent_sessions: null });

    expect(parsed.max_concurrent_sessions).toBeNull();
  });

  // Unlimited is expressed as null, so zero would otherwise read as "no sessions
  // allowed" and lock every user out of a deployment that meant to remove the cap.
  it('rejects zero', () => {
    expect(
      SystemConfigSchema.safeParse({ ...baseConfig, max_concurrent_sessions: 0 }).success,
    ).toBe(false);
  });

  it('rejects a negative or fractional limit', () => {
    expect(
      SystemConfigSchema.safeParse({ ...baseConfig, max_concurrent_sessions: -1 }).success,
    ).toBe(false);
    expect(
      SystemConfigSchema.safeParse({ ...baseConfig, max_concurrent_sessions: 2.5 }).success,
    ).toBe(false);
  });

  it('is patchable, including back to no limit', () => {
    expect(SystemConfigPatchSchema.safeParse({ max_concurrent_sessions: 5 }).success).toBe(true);
    expect(SystemConfigPatchSchema.safeParse({ max_concurrent_sessions: null }).success).toBe(true);
  });

  it('refuses a zero limit through a patch as well', () => {
    expect(SystemConfigPatchSchema.safeParse({ max_concurrent_sessions: 0 }).success).toBe(false);
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

describe('AuthenticatorPolicySchema attestation', () => {
  it('asks for no attestation unless a deployment opts in', () => {
    expect(AuthenticatorPolicySchema.parse({}).attestation).toBe('none');
  });

  it('accepts direct attestation', () => {
    expect(AuthenticatorPolicySchema.parse({ attestation: 'direct' }).attestation).toBe('direct');
  });

  it('rejects an attestation conveyance it cannot act on', () => {
    // 'indirect' and 'enterprise' are valid WebAuthn values but are not supported
    // here, so accepting them would promise handling that does not exist.
    for (const value of ['indirect', 'enterprise', 'yes']) {
      expect(AuthenticatorPolicySchema.safeParse({ attestation: value }).success).toBe(false);
    }
  });

  it('registers authenticators the metadata service does not list, by default', () => {
    expect(AuthenticatorPolicySchema.parse({}).requireKnownAuthenticator).toBe(false);
  });

  it('can be told to refuse them', () => {
    const parsed = AuthenticatorPolicySchema.parse({ requireKnownAuthenticator: true });

    expect(parsed.requireKnownAuthenticator).toBe(true);
  });
});

describe('AuthenticatorPolicySchema synced passkeys', () => {
  it('blocks credentials that can leave the device by default', () => {
    expect(AuthenticatorPolicySchema.parse({}).syncedPasskeys).toBe('block');
  });

  it('can be relaxed for a consumer deployment', () => {
    expect(AuthenticatorPolicySchema.parse({ syncedPasskeys: 'allow' }).syncedPasskeys).toBe(
      'allow',
    );
  });

  it('rejects anything outside that choice', () => {
    expect(AuthenticatorPolicySchema.safeParse({ syncedPasskeys: 'sometimes' }).success).toBe(
      false,
    );
  });
});

describe('AuthenticatorPolicySchema authenticator lists', () => {
  it('restricts nothing by default', () => {
    const parsed = AuthenticatorPolicySchema.parse({});

    expect(parsed.aaguidAllowList).toEqual([]);
    expect(parsed.aaguidDenyList).toEqual([]);
  });

  it('carries both lists', () => {
    const parsed = AuthenticatorPolicySchema.parse({
      aaguidAllowList: ['ee882879-721c-4913-9775-3dfcce97072a'],
      aaguidDenyList: ['00000000-0000-0000-0000-000000000000'],
    });

    expect(parsed.aaguidAllowList).toHaveLength(1);
    expect(parsed.aaguidDenyList).toHaveLength(1);
  });
});

describe('SystemConfigSchema authenticator policy default', () => {
  // The whole-object default is derived from the field defaults rather than
  // restated, so this asserts the two agree.
  it('matches what the policy schema produces on its own', () => {
    const fromConfig = SystemConfigSchema.parse(baseConfig).authenticator_policy;

    expect(fromConfig).toEqual(AuthenticatorPolicySchema.parse({}));
  });
});
