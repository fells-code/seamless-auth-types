import { describe, it, expect } from 'vitest';
import {
  OidcAccountQuerySchema,
  OidcAuthContextSchema,
  OidcClientMetadataSchema,
  OidcClientResourcesResponseSchema,
  OidcEdgeConfigResponseSchema,
  OidcEdgeEventSchema,
  OidcJwksResponseSchema,
  OidcPayloadParamsSchema,
  OidcPayloadRecordSchema,
  OidcPayloadUpsertRequestSchema,
  OidcSignRefusalSchema,
  OidcSignRequestSchema,
} from './schema.js';

const edgeConfig = {
  contractVersion: 1,
  issuer: 'https://login.example.com',
  appName: 'Acme',
  allowClientSecrets: false,
  thirdPartyClientsEnabled: false,
};

describe('OidcEdgeConfigResponseSchema', () => {
  it('accepts a config with no branding', () => {
    expect(OidcEdgeConfigResponseSchema.parse(edgeConfig)).toEqual(edgeConfig);
  });

  it('carries hosted page branding', () => {
    const hostedUi = {
      logoUrl: 'https://cdn.example.com/logo.svg',
      colors: { primary: '#123456' },
    };
    expect(OidcEdgeConfigResponseSchema.parse({ ...edgeConfig, hostedUi }).hostedUi).toEqual(
      hostedUi,
    );
  });

  it('refuses branding the hosted pages could not inject safely', () => {
    expect(
      OidcEdgeConfigResponseSchema.safeParse({
        ...edgeConfig,
        hostedUi: { colors: { primary: 'red;}' } },
      }).success,
    ).toBe(false);
  });
});

const signingInput = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ';

describe('OidcPayloadParamsSchema', () => {
  it('accepts a stored model', () => {
    expect(OidcPayloadParamsSchema.parse({ model: 'Grant', id: 'g1' })).toEqual({
      model: 'Grant',
      id: 'g1',
    });
  });

  it('rejects Client, which comes from the client registry', () => {
    expect(() => OidcPayloadParamsSchema.parse({ model: 'Client', id: 'c1' })).toThrow();
  });

  it('rejects the API-internal OAuth state replay model', () => {
    expect(() => OidcPayloadParamsSchema.parse({ model: 'OAuthStateReplay', id: 's' })).toThrow();
  });
});

describe('OidcPayloadUpsertRequestSchema', () => {
  it('requires a positive whole expiresIn', () => {
    expect(() => OidcPayloadUpsertRequestSchema.parse({ payload: {}, expiresIn: 0 })).toThrow();
    expect(() => OidcPayloadUpsertRequestSchema.parse({ payload: {}, expiresIn: 1.5 })).toThrow();
    expect(() =>
      OidcPayloadUpsertRequestSchema.parse({ payload: { grantId: 'g1' }, expiresIn: 600 }),
    ).not.toThrow();
  });
});

describe('OidcPayloadRecordSchema', () => {
  it('parses an unconsumed record', () => {
    expect(() =>
      OidcPayloadRecordSchema.parse({
        payload: { kind: 'AuthorizationCode' },
        sessionId: null,
        expiresAt: '2026-10-30T12:00:00.000Z',
        consumedAt: null,
      }),
    ).not.toThrow();
  });
});

describe('OidcSignRequestSchema', () => {
  it('requires sessionId for user tokens', () => {
    expect(() =>
      OidcSignRequestSchema.parse({ kind: 'id_token', kid: 'k1', clientId: 'app', signingInput }),
    ).toThrow(/sessionId/);
  });

  it('requires the grant for user tokens, and refuses one on client credentials', () => {
    const user = { kind: 'id_token', kid: 'k1', clientId: 'app', sessionId: 's1', signingInput };
    expect(() => OidcSignRequestSchema.parse(user)).toThrow(/grantType/);
    expect(() =>
      OidcSignRequestSchema.parse({
        ...user,
        grantType: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    ).not.toThrow();
    expect(() => OidcSignRequestSchema.parse({ ...user, grantType: 'refresh_token' })).toThrow();
    expect(() =>
      OidcSignRequestSchema.parse({
        kind: 'client_credentials',
        kid: 'k1',
        clientId: 'svc',
        grantType: 'authorization_code',
        signingInput,
      }),
    ).toThrow(/grantType/);
  });

  it('accepts client credentials without a session', () => {
    expect(() =>
      OidcSignRequestSchema.parse({
        kind: 'client_credentials',
        kid: 'k1',
        clientId: 'svc',
        signingInput,
      }),
    ).not.toThrow();
  });

  it('rejects a signing input that already carries a signature', () => {
    expect(() =>
      OidcSignRequestSchema.parse({
        kind: 'id_token',
        kid: 'k1',
        clientId: 'app',
        sessionId: 's1',
        grantType: 'authorization_code',
        signingInput: `${signingInput}.c2ln`,
      }),
    ).toThrow();
  });
});

describe('OidcSignRefusalSchema', () => {
  it('only carries known refusal codes', () => {
    expect(() => OidcSignRefusalSchema.parse({ error: 'session_revoked' })).not.toThrow();
    expect(() => OidcSignRefusalSchema.parse({ error: 'nope' })).toThrow();
  });
});

describe('OidcJwksResponseSchema', () => {
  const publicKey = { kty: 'RSA', kid: 'k1', alg: 'RS256', use: 'sig', n: 'abc', e: 'AQAB' };

  it('keeps public members', () => {
    expect(
      OidcJwksResponseSchema.parse({ activeKid: 'k1', keys: [publicKey] }).keys[0],
    ).toMatchObject({
      n: 'abc',
      e: 'AQAB',
    });
  });

  it('rejects a key with private members', () => {
    expect(() =>
      OidcJwksResponseSchema.parse({ activeKid: 'k1', keys: [{ ...publicKey, d: 'secret' }] }),
    ).toThrow();
  });
});

describe('OidcClientMetadataSchema', () => {
  const client = {
    client_id: 'grafana',
    client_name: 'Grafana',
    application_type: 'web',
    token_endpoint_auth_method: 'private_key_jwt',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    redirect_uris: ['https://grafana.example.com/login/generic_oauth'],
    post_logout_redirect_uris: [],
    jwks_uri: 'https://grafana.example.com/jwks',
    'urn:seamless:first_party': true,
  };

  it('parses a private_key_jwt client', () => {
    expect(() => OidcClientMetadataSchema.parse(client)).not.toThrow();
  });

  it('rejects client_secret_jwt', () => {
    expect(() =>
      OidcClientMetadataSchema.parse({
        ...client,
        token_endpoint_auth_method: 'client_secret_jwt',
      }),
    ).toThrow();
  });

  it('rejects response types other than code', () => {
    expect(() =>
      OidcClientMetadataSchema.parse({ ...client, response_types: ['id_token'] }),
    ).toThrow();
  });

  it('drops a client secret', () => {
    expect(OidcClientMetadataSchema.parse({ ...client, client_secret: 's' })).not.toHaveProperty(
      'client_secret',
    );
  });
});

describe('OidcClientResourcesResponseSchema', () => {
  it('parses a resource with allowed scopes', () => {
    expect(
      OidcClientResourcesResponseSchema.parse({
        resources: [
          {
            identifier: 'https://api.example.com',
            scopes: ['orders:read'],
            accessTokenTtlSeconds: null,
          },
        ],
      }).resources[0],
    ).toMatchObject({ identifier: 'https://api.example.com', scopes: ['orders:read'] });
  });

  it('rejects an identifier that is not a URL', () => {
    expect(() =>
      OidcClientResourcesResponseSchema.parse({
        resources: [{ identifier: 'orders', scopes: [], accessTokenTtlSeconds: 600 }],
      }),
    ).toThrow();
  });
});

describe('OidcAuthContextSchema', () => {
  it('parses a device-bound passkey session', () => {
    expect(() =>
      OidcAuthContextSchema.parse({
        sessionId: 's1',
        userId: 'u1',
        active: true,
        recovery: false,
        authMethods: [
          {
            method: 'passkey',
            at: '2026-10-30T12:00:00.000Z',
            deviceBound: true,
            userVerified: true,
          },
        ],
        authTime: 1793361600,
        acr: 'phrh',
        amr: ['hwk', 'user', 'mfa'],
      }),
    ).not.toThrow();
  });

  it('rejects an unregistered acr value', () => {
    expect(() =>
      OidcAuthContextSchema.parse({
        sessionId: 's1',
        userId: 'u1',
        active: true,
        recovery: false,
        authMethods: [],
        authTime: 0,
        acr: 'webauthn',
        amr: [],
      }),
    ).toThrow();
  });
});

describe('OidcEdgeEventSchema', () => {
  it('requires a correlation id', () => {
    expect(() =>
      OidcEdgeEventSchema.parse({ type: 'token_issued', occurredAt: '2026-10-30T12:00:00.000Z' }),
    ).toThrow();
  });
});

describe('OidcAccountQuerySchema', () => {
  it('requires the client and session the lookup serves', () => {
    expect(() => OidcAccountQuerySchema.parse({ clientId: 'app' })).toThrow();
    expect(() => OidcAccountQuerySchema.parse({ clientId: 'app', sessionId: 's1' })).not.toThrow();
  });
});
