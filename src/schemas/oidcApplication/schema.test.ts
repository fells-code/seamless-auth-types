import { describe, it, expect } from 'vitest';
import {
  OidcApplicationCreateRequestSchema,
  OidcApplicationKeysRequestSchema,
  OidcApplicationResourcesRequestSchema,
  OidcApplicationUpdateRequestSchema,
  OidcRedirectUriSchema,
  OidcResourceCreateRequestSchema,
  OidcResourceIdentifierSchema,
  OidcResourceUpdateRequestSchema,
  OidcScopeSchema,
  oidcRedirectUriKind,
  oidcRedirectUriProblem,
} from './schema.js';
import { HostedUiSchema, SystemConfigPatchSchema } from '../systemConfig/schema.js';

const jwk = { kty: 'RSA', kid: 'k1', alg: 'RS256', n: 'abc', e: 'AQAB' };

describe('oidcRedirectUriProblem', () => {
  it.each([
    ['https://app.example.com/callback', 'https'],
    ['http://127.0.0.1/callback', 'loopback'],
    ['http://127.0.0.1:51234/callback', 'loopback'],
    ['http://[::1]/callback', 'loopback'],
    ['com.example.app:/callback', 'private_use'],
    ['com.example.app://callback', 'private_use'],
  ])('accepts %s as %s', (uri, kind) => {
    expect(oidcRedirectUriProblem(uri)).toBeNull();
    expect(oidcRedirectUriKind(uri)).toBe(kind);
  });

  it.each([
    'http://localhost/callback',
    'http://localhost:3000/callback',
    'https://localhost/callback',
    'http://app.localhost/callback',
    'http://app.example.com/callback',
    'http://192.168.1.10/callback',
    'https://app.example.com/callback#frag',
    'https://user:pass@app.example.com/callback',
    'javascript:alert(1)',
    'data:text/html,hi',
    'file:///etc/passwd',
    'myapp:/callback',
    '/relative/callback',
    ' https://app.example.com/callback',
    `https://app.example.com/${'a'.repeat(2048)}`,
  ])('refuses %s', (uri) => {
    expect(oidcRedirectUriProblem(uri)).not.toBeNull();
    expect(oidcRedirectUriKind(uri)).toBeNull();
    expect(OidcRedirectUriSchema.safeParse(uri).success).toBe(false);
  });

  it('names the RFC 8252 rule for localhost', () => {
    expect(oidcRedirectUriProblem('http://localhost/cb')).toMatch(/127\.0\.0\.1/);
  });
});

describe('OidcApplicationCreateRequestSchema', () => {
  const web = {
    name: 'Grafana',
    clientType: 'confidential',
    redirectUris: ['https://grafana.example.com/login/generic_oauth'],
  };

  it('defaults a confidential client to the code flow with refresh', () => {
    expect(OidcApplicationCreateRequestSchema.parse(web)).toMatchObject({
      firstParty: false,
      grantTypes: ['authorization_code', 'refresh_token'],
      deviceFlowEnabled: false,
      noticesEnabled: false,
    });
  });

  it('accepts a native public client with loopback and private-use redirects', () => {
    expect(
      OidcApplicationCreateRequestSchema.safeParse({
        name: 'Desktop',
        clientType: 'public',
        redirectUris: ['http://127.0.0.1/callback', 'com.example.desktop:/callback'],
      }).success,
    ).toBe(true);
  });

  it('accepts a private_key_jwt client with a JWKS', () => {
    expect(
      OidcApplicationCreateRequestSchema.safeParse({ ...web, jwks: { keys: [jwk] } }).success,
    ).toBe(true);
  });

  it.each([
    [
      'a public client with a shared secret',
      { clientType: 'public', tokenEndpointAuthMethod: 'client_secret_basic' },
    ],
    [
      'a public client with keys',
      { clientType: 'public', jwksUri: 'https://app.example.com/jwks' },
    ],
    ['a confidential client with no authentication', { tokenEndpointAuthMethod: 'none' }],
    [
      'both a JWKS and a JWKS URI',
      { jwks: { keys: [jwk] }, jwksUri: 'https://app.example.com/jwks' },
    ],
    [
      'keys on a shared-secret client',
      { tokenEndpointAuthMethod: 'client_secret_post', jwks: { keys: [jwk] } },
    ],
    [
      'a public client with client_credentials',
      { clientType: 'public', grantTypes: ['authorization_code', 'client_credentials'] },
    ],
    ['refresh_token alone', { grantTypes: ['refresh_token'] }],
    ['duplicate grants', { grantTypes: ['authorization_code', 'authorization_code'] }],
    ['no grant at all', { grantTypes: [] }],
    ['the code flow with no redirect URI', { redirectUris: [] }],
    ['the device grant on a third-party client', { deviceFlowEnabled: true }],
    ['implicit', { grantTypes: ['implicit'] }],
    ['the password grant', { grantTypes: ['password'] }],
    ['client_secret_jwt', { tokenEndpointAuthMethod: 'client_secret_jwt' }],
    ['a JWKS carrying a private key', { jwks: { keys: [{ ...jwk, d: 'secret' }] } }],
    ['an http JWKS URI', { jwksUri: 'http://app.example.com/jwks' }],
    ['an http back-channel logout URI', { backchannelLogoutUri: 'http://app.example.com/logout' }],
    [
      'duplicate redirect URIs',
      { redirectUris: ['https://a.example.com/cb', 'https://a.example.com/cb'] },
    ],
    ['an access token lifetime over a day', { accessTokenTtlSeconds: 86_401 }],
    ['an unknown field', { client_secret: 'x' }],
  ])('refuses %s', (_label, change) => {
    expect(OidcApplicationCreateRequestSchema.safeParse({ ...web, ...change }).success).toBe(false);
  });

  it('allows the device grant on a first-party client with no redirect URIs', () => {
    expect(
      OidcApplicationCreateRequestSchema.safeParse({
        name: 'TV',
        clientType: 'public',
        firstParty: true,
        grantTypes: ['refresh_token'],
        deviceFlowEnabled: true,
      }).success,
    ).toBe(true);
  });

  it('allows a client_credentials service with no redirect URI', () => {
    expect(
      OidcApplicationCreateRequestSchema.safeParse({
        name: 'Worker',
        clientType: 'confidential',
        grantTypes: ['client_credentials'],
        jwksUri: 'https://worker.example.com/jwks',
      }).success,
    ).toBe(true);
  });
});

describe('OidcApplicationUpdateRequestSchema', () => {
  it('parses a single field without filling defaults', () => {
    expect(OidcApplicationUpdateRequestSchema.parse({ name: 'Renamed' })).toEqual({
      name: 'Renamed',
    });
  });

  it('cannot change the client type or keys', () => {
    expect(OidcApplicationUpdateRequestSchema.safeParse({ clientType: 'public' }).success).toBe(
      false,
    );
    expect(OidcApplicationUpdateRequestSchema.safeParse({ jwks: { keys: [jwk] } }).success).toBe(
      false,
    );
  });

  it('still checks each redirect URI', () => {
    expect(
      OidcApplicationUpdateRequestSchema.safeParse({ redirectUris: ['http://localhost/cb'] })
        .success,
    ).toBe(false);
  });
});

describe('OidcApplicationKeysRequestSchema', () => {
  it('takes a JWKS or a JWKS URI, not both or neither', () => {
    expect(OidcApplicationKeysRequestSchema.safeParse({ jwks: { keys: [jwk] } }).success).toBe(
      true,
    );
    expect(
      OidcApplicationKeysRequestSchema.safeParse({ jwksUri: 'https://a.example.com/jwks' }).success,
    ).toBe(true);
    expect(
      OidcApplicationKeysRequestSchema.safeParse({
        jwks: { keys: [jwk] },
        jwksUri: 'https://a.example.com/jwks',
      }).success,
    ).toBe(false);
    expect(OidcApplicationKeysRequestSchema.safeParse({}).success).toBe(false);
    expect(OidcApplicationKeysRequestSchema.safeParse({ jwks: { keys: [] } }).success).toBe(false);
  });
});

describe('OidcScopeSchema', () => {
  it('accepts scope tokens', () => {
    expect(OidcScopeSchema.safeParse('orders:read').success).toBe(true);
  });

  it.each(['openid', 'offline_access', 'seamless', 'two words', 'quote"', ''])(
    'refuses %j',
    (s) => {
      expect(OidcScopeSchema.safeParse(s).success).toBe(false);
    },
  );
});

describe('OidcResourceIdentifierSchema', () => {
  it.each(['https://api.example.com', 'https://api.example.com/v1', 'urn:example:orders'])(
    'accepts %s',
    (value) => {
      expect(OidcResourceIdentifierSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each([
    'api.example.com',
    'https://api.example.com/#x',
    'https://api.example.com/?a=1',
    'ftp://api.example.com',
    'https://u:p@api.example.com',
    ' https://api.example.com',
  ])('refuses %s', (value) => {
    expect(OidcResourceIdentifierSchema.safeParse(value).success).toBe(false);
  });
});

describe('OidcResource requests', () => {
  it('defaults scopes to none', () => {
    expect(
      OidcResourceCreateRequestSchema.parse({ identifier: 'https://api.example.com', name: 'API' })
        .scopes,
    ).toEqual([]);
  });

  it('refuses duplicate scopes', () => {
    expect(
      OidcResourceCreateRequestSchema.safeParse({
        identifier: 'https://api.example.com',
        name: 'API',
        scopes: ['a', 'a'],
      }).success,
    ).toBe(false);
  });

  it('keeps the identifier fixed on update', () => {
    expect(
      OidcResourceUpdateRequestSchema.safeParse({ identifier: 'https://other.example.com' })
        .success,
    ).toBe(false);
  });
});

describe('OidcApplicationResourcesRequestSchema', () => {
  const resourceId = '0e1b4a52-9a43-4a8f-9e57-3f0b2d1f7c11';

  it('accepts a set of grants', () => {
    expect(
      OidcApplicationResourcesRequestSchema.safeParse({
        resources: [{ resourceId, scopes: ['orders:read'] }],
      }).success,
    ).toBe(true);
  });

  it('refuses the same resource twice', () => {
    expect(
      OidcApplicationResourcesRequestSchema.safeParse({
        resources: [
          { resourceId, scopes: [] },
          { resourceId, scopes: ['orders:read'] },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('HostedUiSchema', () => {
  it('accepts branding', () => {
    expect(
      HostedUiSchema.safeParse({
        appName: 'Acme',
        logoUrl: 'https://cdn.example.com/logo.svg',
        colors: { primary: '#1a73e8', background: '#fff' },
        fontFamily: "'Inter', system-ui, sans-serif",
      }).success,
    ).toBe(true);
  });

  it.each([
    { colors: { primary: 'red;} body{display:none' } },
    { fontFamily: 'Inter; } * { color: red' },
    { logoUrl: 'http://cdn.example.com/logo.svg' },
    { logoUrl: 'javascript:alert(1)' },
    { colors: { unknown: '#fff' } },
  ])('refuses %j', (value) => {
    expect(HostedUiSchema.safeParse(value).success).toBe(false);
  });

  it('can be cleared through a config patch', () => {
    expect(SystemConfigPatchSchema.parse({ hosted_ui: null })).toEqual({ hosted_ui: null });
  });
});
