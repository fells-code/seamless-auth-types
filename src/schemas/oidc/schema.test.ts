import { describe, it, expect } from 'vitest';
import {
  OidcAccessTokenClaimsSchema,
  OidcClientCredentialsTokenResponseSchema,
  OidcDiscoveryDocumentSchema,
  OidcIdTokenClaimsSchema,
  OidcInsufficientScopeErrorSchema,
  OidcScopeStringSchema,
  OidcStepUpChallengeSchema,
  OidcTokenErrorResponseSchema,
  OidcTokenResponseSchema,
  parseOidcScope,
} from './schema.js';

// The payloads of two accepted tokens in the adapters' shared verify-only vectors
// (seamless-auth-server packages/core/tests/fixtures/verify-only/vectors.json).
const userAccessToken = {
  iss: 'https://login.example.test',
  aud: 'https://api.example.test',
  exp: 1798765200,
  iat: 1798761480,
  jti: 'jti-1',
  sub: 'user-123',
  client_id: 'app-web',
  scope: 'openid orders:read orders:write',
  sid: 'sess-1',
  org_id: 'org-9',
  roles: ['orders:write', 'member'],
  acr: 'phrh',
  amr: ['hwk', 'user', 'mfa'],
  auth_time: 1798761480,
};

const clientCredentialsToken = {
  iss: 'https://login.example.test',
  aud: 'https://api.example.test',
  exp: 1798765200,
  iat: 1798761480,
  jti: 'jti-1',
  sub: 'svc-reports',
  client_id: 'svc-reports',
  scope: 'reports:read',
};

describe('OidcAccessTokenClaimsSchema', () => {
  it('parses a user token and a client credentials token', () => {
    expect(OidcAccessTokenClaimsSchema.parse(userAccessToken)).toEqual(userAccessToken);
    expect(OidcAccessTokenClaimsSchema.parse(clientCredentialsToken)).toEqual(
      clientCredentialsToken,
    );
  });

  it('accepts an audience list and a DPoP confirmation', () => {
    expect(() =>
      OidcAccessTokenClaimsSchema.parse({
        ...userAccessToken,
        aud: ['https://api.example.test', 'https://other.example.test'],
        cnf: { jkt: '0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I' },
      }),
    ).not.toThrow();
  });

  it('requires client_id and jti', () => {
    for (const claim of ['client_id', 'jti']) {
      const claims: Record<string, unknown> = { ...userAccessToken };
      delete claims[claim];
      expect(() => OidcAccessTokenClaimsSchema.parse(claims)).toThrow();
    }
  });

  it('rejects acr and amr values the API never derives', () => {
    expect(() =>
      OidcAccessTokenClaimsSchema.parse({ ...userAccessToken, acr: 'webauthn' }),
    ).toThrow();
    expect(() => OidcAccessTokenClaimsSchema.parse({ ...userAccessToken, amr: ['pwd'] })).toThrow();
  });

  it('rejects a scope that is not a space-delimited string', () => {
    expect(() =>
      OidcAccessTokenClaimsSchema.parse({ ...userAccessToken, scope: ['orders:read'] }),
    ).toThrow();
    expect(() =>
      OidcAccessTokenClaimsSchema.parse({ ...userAccessToken, scope: 'a  b' }),
    ).toThrow();
  });
});

describe('OidcIdTokenClaimsSchema', () => {
  it('parses an ID token for a client', () => {
    expect(() =>
      OidcIdTokenClaimsSchema.parse({
        iss: 'https://login.example.test',
        sub: 'user-123',
        aud: 'app-web',
        exp: 1798765200,
        iat: 1798761480,
        nonce: 'n-1',
        sid: 'sess-1',
        auth_time: 1798761480,
        acr: 'phr',
        amr: ['swk', 'user', 'mfa'],
        email: 'a@example.test',
        email_verified: true,
      }),
    ).not.toThrow();
  });
});

describe('scopes', () => {
  it('splits a scope string', () => {
    expect(parseOidcScope('openid orders:read')).toEqual(['openid', 'orders:read']);
    expect(parseOidcScope(undefined)).toEqual([]);
  });

  it('rejects characters outside NQCHAR', () => {
    expect(() => OidcScopeStringSchema.parse('orders"read')).toThrow();
    expect(() => OidcScopeStringSchema.parse('orders\\read')).toThrow();
    expect(() => OidcScopeStringSchema.parse('')).toThrow();
  });
});

describe('OidcDiscoveryDocumentSchema', () => {
  it('parses a discovery document with step-up and device flow', () => {
    const doc = OidcDiscoveryDocumentSchema.parse({
      issuer: 'https://login.example.test',
      authorization_endpoint: 'https://login.example.test/auth',
      token_endpoint: 'https://login.example.test/token',
      jwks_uri: 'https://login.example.test/jwks',
      device_authorization_endpoint: 'https://login.example.test/device/auth',
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      acr_values_supported: ['phr', 'phrh'],
      frontchannel_logout_supported: false,
    });
    expect(doc.acr_values_supported).toEqual(['phr', 'phrh']);
    expect(doc.frontchannel_logout_supported).toBe(false);
  });

  it('requires jwks_uri', () => {
    expect(() =>
      OidcDiscoveryDocumentSchema.parse({
        issuer: 'https://login.example.test',
        authorization_endpoint: 'https://login.example.test/auth',
        token_endpoint: 'https://login.example.test/token',
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
      }),
    ).toThrow();
  });
});

describe('token endpoint', () => {
  it('parses an authorization code response', () => {
    expect(() =>
      OidcTokenResponseSchema.parse({
        access_token: 'at',
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: 'rt',
        id_token: 'a.b.c',
        scope: 'openid offline_access',
      }),
    ).not.toThrow();
  });

  it('accepts a DPoP token type', () => {
    expect(() =>
      OidcTokenResponseSchema.parse({ access_token: 'at', token_type: 'DPoP' }),
    ).not.toThrow();
  });

  it('refuses a refresh token or ID token on a client credentials response', () => {
    expect(() =>
      OidcClientCredentialsTokenResponseSchema.parse({
        access_token: 'at',
        token_type: 'Bearer',
        refresh_token: 'rt',
      }),
    ).toThrow();
    expect(() =>
      OidcClientCredentialsTokenResponseSchema.parse({
        access_token: 'at',
        token_type: 'Bearer',
        id_token: 'a.b.c',
      }),
    ).toThrow();
  });

  it('parses the device flow errors', () => {
    for (const error of ['authorization_pending', 'slow_down', 'expired_token', 'access_denied']) {
      expect(() => OidcTokenErrorResponseSchema.parse({ error })).not.toThrow();
    }
    expect(() => OidcTokenErrorResponseSchema.parse({ error: 'server_error' })).toThrow();
  });
});

describe('resource server errors', () => {
  it('parses the step-up challenge the adapters answer with', () => {
    expect(
      OidcStepUpChallengeSchema.parse({
        error: 'insufficient_user_authentication',
        error_description: 'More recent authentication is required',
        acr_values: 'phr',
        max_age: 300,
      }),
    ).toMatchObject({ acr_values: 'phr', max_age: 300 });
  });

  it('parses an insufficient scope error', () => {
    expect(() =>
      OidcInsufficientScopeErrorSchema.parse({
        error: 'insufficient_scope',
        scope: 'orders:read orders:write',
      }),
    ).not.toThrow();
  });
});
