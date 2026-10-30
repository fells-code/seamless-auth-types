import { z } from 'zod';

/**
 * The service-token contract between the OpenID Provider service (the login edge) and the
 * private API. Every route here answers only the edge's own service token (signed with
 * `SEAMLESS_OIDC_SERVICE_TOKEN`, never the adapters' secret), and answers 404 while
 * `oidc_provider_enabled` is off. These are not the public OIDC endpoints, which the edge serves.
 *
 * Bump when a change here needs both sides to move together. The edge refuses to start
 * against an API that reports a different value.
 */
export const OIDC_EDGE_CONTRACT_VERSION = 1;

export const OidcEdgeRoutes = {
  config: '/oidc/config',
  payload: '/oidc/payloads/:model/:id',
  payloadConsume: '/oidc/payloads/:model/:id/consume',
  payloadByUserCode: '/oidc/payloads/:model/by-user-code/:userCode',
  payloadByUid: '/oidc/payloads/:model/by-uid/:uid',
  payloadsByGrant: '/oidc/payloads/:model/by-grant/:grantId',
  sign: '/oidc/sign',
  jwks: '/oidc/jwks',
  client: '/oidc/clients/:id',
  clientVerifySecret: '/oidc/clients/:id/verify-secret',
  account: '/oidc/accounts/:id',
  sessionAuthContext: '/oidc/sessions/:id/auth-context',
  sessionRevoke: '/oidc/sessions/:id/revoke',
  events: '/oidc/events',
} as const;

export const OidcEdgeConfigResponseSchema = z.object({
  contractVersion: z.number().int().positive(),
  issuer: z.url(),
  appName: z.string(),
  allowClientSecrets: z.boolean(),
  thirdPartyClientsEnabled: z.boolean(),
});

export type OidcEdgeConfigResponse = z.infer<typeof OidcEdgeConfigResponseSchema>;

/** The `oidc-provider` models the API stores. `Client` is read from the client registry instead. */
export const OidcPayloadModelSchema = z.enum([
  'Session',
  'Interaction',
  'AuthorizationCode',
  'AccessToken',
  'RefreshToken',
  'ClientCredentials',
  'DeviceCode',
  'Grant',
  'PushedAuthorizationRequest',
  'ReplayDetection',
]);

export type OidcPayloadModel = z.infer<typeof OidcPayloadModelSchema>;

const OidcIdentifierSchema = z.string().min(1).max(512);

export const OidcPayloadParamsSchema = z.object({
  model: OidcPayloadModelSchema,
  id: OidcIdentifierSchema,
});

export type OidcPayloadParams = z.infer<typeof OidcPayloadParamsSchema>;

export const OidcPayloadUserCodeParamsSchema = z.object({
  model: OidcPayloadModelSchema,
  userCode: OidcIdentifierSchema,
});

export type OidcPayloadUserCodeParams = z.infer<typeof OidcPayloadUserCodeParamsSchema>;

export const OidcPayloadUidParamsSchema = z.object({
  model: OidcPayloadModelSchema,
  uid: OidcIdentifierSchema,
});

export type OidcPayloadUidParams = z.infer<typeof OidcPayloadUidParamsSchema>;

export const OidcPayloadGrantParamsSchema = z.object({
  model: OidcPayloadModelSchema,
  grantId: OidcIdentifierSchema,
});

export type OidcPayloadGrantParams = z.infer<typeof OidcPayloadGrantParamsSchema>;

/**
 * The payload is the library's own object and is stored as is. The API reads `grantId`,
 * `userCode` and `uid` from it for lookups, so the edge does not send them twice.
 * `sessionId` is the first-party `sessions` row the record belongs to, which is how a
 * revoked session ends provider access.
 */
export const OidcPayloadUpsertRequestSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  expiresIn: z.number().int().positive(),
  sessionId: z.string().min(1).optional(),
});

export type OidcPayloadUpsertRequest = z.infer<typeof OidcPayloadUpsertRequestSchema>;

/** `created` is false when a `ReplayDetection` row already existed, which is a replay. */
export const OidcPayloadUpsertResponseSchema = z.object({
  created: z.boolean(),
});

export type OidcPayloadUpsertResponse = z.infer<typeof OidcPayloadUpsertResponseSchema>;

/**
 * Expired and destroyed records answer 404, never a record. `sessionId` is what the record
 * was stored with, so a refresh can recover the session behind its grant.
 */
export const OidcPayloadRecordSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  sessionId: z.string().nullable(),
  expiresAt: z.iso.datetime(),
  consumedAt: z.iso.datetime().nullable(),
});

export type OidcPayloadRecord = z.infer<typeof OidcPayloadRecordSchema>;

export const OidcSignKindSchema = z.enum(['id_token', 'access_token', 'client_credentials']);

export type OidcSignKind = z.infer<typeof OidcSignKindSchema>;

/**
 * `signingInput` is the JWS signing input the library hands an external key: the base64url
 * protected header and payload joined by a dot. The API decodes and checks both before it
 * signs, so the edge cannot get a signature over claims the API would refuse.
 */
export const OidcSignRequestSchema = z
  .object({
    kind: OidcSignKindSchema,
    kid: z.string().min(1),
    clientId: z.string().min(1),
    sessionId: z.string().min(1).optional(),
    signingInput: z.string().regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== 'client_credentials' && !value.sessionId) {
      ctx.addIssue({
        code: 'custom',
        path: ['sessionId'],
        message: 'sessionId is required unless kind is client_credentials',
      });
    }
  });

export type OidcSignRequest = z.infer<typeof OidcSignRequestSchema>;

export const OidcSignResponseSchema = z.object({
  kid: z.string(),
  signature: z.string().regex(/^[A-Za-z0-9_-]+$/),
});

export type OidcSignResponse = z.infer<typeof OidcSignResponseSchema>;

export const OidcSignRefusalCodeSchema = z.enum([
  'malformed_signing_input',
  'unknown_key',
  'session_revoked',
  'subject_mismatch',
  'auth_context_mismatch',
  'issuer_mismatch',
  'audience_mismatch',
  'client_inactive',
  'grant_not_allowed',
]);

export type OidcSignRefusalCode = z.infer<typeof OidcSignRefusalCodeSchema>;

export const OidcSignRefusalSchema = z.object({
  error: OidcSignRefusalCodeSchema,
  message: z.string().optional(),
});

export type OidcSignRefusal = z.infer<typeof OidcSignRefusalSchema>;

const PRIVATE_JWK_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k', 'priv'];

export const OidcPublicJwkSchema = z
  .looseObject({
    kty: z.string(),
    kid: z.string(),
    alg: z.string(),
    use: z.literal('sig').optional(),
  })
  .refine((jwk) => PRIVATE_JWK_MEMBERS.every((member) => !(member in jwk)), {
    message: 'a published JWK must not carry private key members',
  });

export type OidcPublicJwk = z.infer<typeof OidcPublicJwkSchema>;

/** `activeKid` is the only key `/oidc/sign` signs with. The others are published for rotation. */
export const OidcJwksResponseSchema = z.object({
  activeKid: z.string(),
  keys: z.array(OidcPublicJwkSchema),
});

export type OidcJwksResponse = z.infer<typeof OidcJwksResponseSchema>;

export const OidcClientIdParamsSchema = z.object({
  id: OidcIdentifierSchema,
});

export type OidcClientIdParams = z.infer<typeof OidcClientIdParamsSchema>;

export const OidcTokenEndpointAuthMethodSchema = z.enum([
  'private_key_jwt',
  'none',
  'client_secret_basic',
  'client_secret_post',
]);

export type OidcTokenEndpointAuthMethod = z.infer<typeof OidcTokenEndpointAuthMethodSchema>;

export const OidcGrantTypeSchema = z.enum([
  'authorization_code',
  'refresh_token',
  'client_credentials',
  'urn:ietf:params:oauth:grant-type:device_code',
]);

export type OidcGrantType = z.infer<typeof OidcGrantTypeSchema>;

/**
 * Client metadata in the library's own names, so the edge can hand it to `oidc-provider`
 * unchanged. It never carries a client secret, opted-in or not: the edge checks secrets
 * through `verify-secret`.
 */
export const OidcClientMetadataSchema = z.object({
  client_id: z.string(),
  client_name: z.string(),
  application_type: z.enum(['web', 'native']),
  token_endpoint_auth_method: OidcTokenEndpointAuthMethodSchema,
  grant_types: z.array(OidcGrantTypeSchema).min(1),
  response_types: z.array(z.literal('code')),
  redirect_uris: z.array(z.url()),
  post_logout_redirect_uris: z.array(z.url()),
  jwks: z.object({ keys: z.array(OidcPublicJwkSchema) }).optional(),
  jwks_uri: z.url().optional(),
  backchannel_logout_uri: z.url().optional(),
  backchannel_logout_session_required: z.boolean().optional(),
  'urn:seamless:first_party': z.boolean(),
});

export type OidcClientMetadata = z.infer<typeof OidcClientMetadataSchema>;

export const OidcVerifySecretRequestSchema = z.object({
  secret: z.string().min(1).max(512),
});

export type OidcVerifySecretRequest = z.infer<typeof OidcVerifySecretRequestSchema>;

export const OidcVerifySecretResponseSchema = z.object({
  valid: z.boolean(),
});

export type OidcVerifySecretResponse = z.infer<typeof OidcVerifySecretResponseSchema>;

export const OidcAccountIdParamsSchema = z.object({
  id: OidcIdentifierSchema,
});

export type OidcAccountIdParams = z.infer<typeof OidcAccountIdParamsSchema>;

/** Every claim the account has. The edge releases them by scope. */
export const OidcAccountClaimsSchema = z.object({
  sub: z.string(),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
  phone_number: z.string().optional(),
  phone_number_verified: z.boolean().optional(),
  roles: z.array(z.string()),
  org_id: z.string().nullable(),
});

export type OidcAccountClaims = z.infer<typeof OidcAccountClaimsSchema>;

export const OidcSessionIdParamsSchema = z.object({
  id: OidcIdentifierSchema,
});

export type OidcSessionIdParams = z.infer<typeof OidcSessionIdParamsSchema>;

export const OidcAuthMethodSchema = z.enum([
  'passkey',
  'email_otp',
  'magic_link',
  'phone_otp',
  'totp',
  'recovery_code',
  'oauth',
]);

export type OidcAuthMethod = z.infer<typeof OidcAuthMethodSchema>;

/** `deviceBound` and `userVerified` are set for passkeys only. */
export const OidcAuthMethodRecordSchema = z.object({
  method: OidcAuthMethodSchema,
  at: z.iso.datetime(),
  deviceBound: z.boolean().optional(),
  userVerified: z.boolean().optional(),
});

export type OidcAuthMethodRecord = z.infer<typeof OidcAuthMethodRecordSchema>;

/** OpenID Enhanced Authentication Profile values. */
export const OidcAcrValueSchema = z.enum(['phr', 'phrh']);

export type OidcAcrValue = z.infer<typeof OidcAcrValueSchema>;

/** The RFC 8176 values Seamless sign-in methods map to. */
export const OidcAmrValueSchema = z.enum(['hwk', 'swk', 'user', 'mfa', 'otp', 'sms']);

export type OidcAmrValue = z.infer<typeof OidcAmrValueSchema>;

/**
 * The API derives `acr` and `amr` from `authMethods`. The edge copies them into tokens, and
 * `/oidc/sign` refuses tokens whose values differ.
 */
export const OidcAuthContextSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  active: z.boolean(),
  recovery: z.boolean(),
  authMethods: z.array(OidcAuthMethodRecordSchema),
  authTime: z.number().int().nonnegative(),
  acr: OidcAcrValueSchema.nullable(),
  amr: z.array(OidcAmrValueSchema),
});

export type OidcAuthContext = z.infer<typeof OidcAuthContextSchema>;

export const OidcSessionRevokeRequestSchema = z.object({
  reason: z.enum(['refresh_token_reuse', 'provider_logout']),
  correlationId: z.string().min(1).max(128).optional(),
});

export type OidcSessionRevokeRequest = z.infer<typeof OidcSessionRevokeRequestSchema>;

/** Stored as `oidc_<type>` auth events, so the suffixes follow the auth event outcome rules. */
export const OidcEdgeEventTypeSchema = z.enum([
  'interaction_completed',
  'consent_granted',
  'consent_denied',
  'token_issued',
  'token_refreshed',
  'refresh_token_suspicious',
  'token_revoked',
  'client_auth_failed',
  'end_session',
  'device_code_approved',
  'device_code_denied',
  'edge_failed',
]);

export type OidcEdgeEventType = z.infer<typeof OidcEdgeEventTypeSchema>;

/** `correlationId` ties the event to the edge's request log. */
export const OidcEdgeEventSchema = z.object({
  type: OidcEdgeEventTypeSchema,
  correlationId: z.string().min(1).max(128),
  occurredAt: z.iso.datetime(),
  clientId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  grantId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type OidcEdgeEvent = z.infer<typeof OidcEdgeEventSchema>;
