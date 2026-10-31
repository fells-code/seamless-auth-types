import { z } from 'zod';

import { OidcAcrValueSchema, OidcAmrValueSchema } from '../oidcEdge/schema.js';

/**
 * The public side of the OpenID Provider: the tokens the login edge issues, its discovery
 * document, its token endpoint, and the challenge a resource server answers with when a
 * token does not carry enough assurance. `oidcEdge` is the private contract behind it.
 */

/** The JOSE header `typ` of a JWT access token (RFC 9068, section 2.1). */
export const OIDC_ACCESS_TOKEN_TYP = 'at+jwt';

const NumericDateSchema = z.number().int().nonnegative();

/** A space-delimited list of scopes (RFC 6749, section 3.3). */
export const OidcScopeStringSchema = z
  .string()
  .regex(/^[\x21\x23-\x5B\x5D-\x7E]+( [\x21\x23-\x5B\x5D-\x7E]+)*$/);

export type OidcScopeString = z.infer<typeof OidcScopeStringSchema>;

/** Splits a `scope` claim or parameter into its scopes. */
export function parseOidcScope(scope: string | undefined): string[] {
  return scope ? scope.split(' ').filter(Boolean) : [];
}

/** RFC 7800 confirmation. `jkt` binds the token to a DPoP key (RFC 9449). */
export const OidcConfirmationSchema = z.looseObject({
  jkt: z.string().min(1).optional(),
});

export type OidcConfirmation = z.infer<typeof OidcConfirmationSchema>;

/**
 * Released by scope: `email` and `phone` for the standard claims, `seamless` for `roles` and
 * `org_id`. They are the account's own values, which `/oidc/sign` checks.
 */
const IdentityClaimsShape = {
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
  phone_number: z.string().optional(),
  phone_number_verified: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
  org_id: z.string().nullable().optional(),
};

/** `acr`, `amr` and `auth_time` are what the API recorded for the session (ADR 0001, D9). */
const AuthContextClaimsShape = {
  auth_time: NumericDateSchema.optional(),
  acr: OidcAcrValueSchema.optional(),
  amr: z.array(OidcAmrValueSchema).optional(),
};

/**
 * A JWT access token for a resource (RFC 9068), header `typ: at+jwt`. `aud` is the resource
 * identifier, never the API's own issuer. Client credentials tokens use the same shape with
 * `sub` equal to `client_id` and no user claims. Provider tokens carry no first-party `typ`
 * claim, so they can never verify as a Seamless session.
 */
export const OidcAccessTokenClaimsSchema = z.looseObject({
  iss: z.url(),
  sub: z.string().min(1),
  aud: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  exp: NumericDateSchema,
  iat: NumericDateSchema,
  nbf: NumericDateSchema.optional(),
  jti: z.string().min(1),
  client_id: z.string().min(1),
  scope: OidcScopeStringSchema.optional(),
  sid: z.string().min(1).optional(),
  cnf: OidcConfirmationSchema.optional(),
  ...AuthContextClaimsShape,
  ...IdentityClaimsShape,
});

export type OidcAccessTokenClaims = z.infer<typeof OidcAccessTokenClaimsSchema>;

/** An ID token. `aud` is the client id, and `azp` names it when present. */
export const OidcIdTokenClaimsSchema = z.looseObject({
  iss: z.url(),
  sub: z.string().min(1),
  aud: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  exp: NumericDateSchema,
  iat: NumericDateSchema,
  azp: z.string().min(1).optional(),
  nonce: z.string().optional(),
  sid: z.string().min(1).optional(),
  at_hash: z.string().optional(),
  c_hash: z.string().optional(),
  ...AuthContextClaimsShape,
  ...IdentityClaimsShape,
});

export type OidcIdTokenClaims = z.infer<typeof OidcIdTokenClaimsSchema>;

/** `/.well-known/openid-configuration`. Members the edge does not advertise are allowed through. */
export const OidcDiscoveryDocumentSchema = z.looseObject({
  issuer: z.url(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  jwks_uri: z.url(),
  userinfo_endpoint: z.url().optional(),
  end_session_endpoint: z.url().optional(),
  revocation_endpoint: z.url().optional(),
  introspection_endpoint: z.url().optional(),
  device_authorization_endpoint: z.url().optional(),
  pushed_authorization_request_endpoint: z.url().optional(),
  scopes_supported: z.array(z.string()).optional(),
  claims_supported: z.array(z.string()).optional(),
  response_types_supported: z.array(z.string()).min(1),
  response_modes_supported: z.array(z.string()).optional(),
  grant_types_supported: z.array(z.string()).optional(),
  subject_types_supported: z.array(z.string()).min(1),
  id_token_signing_alg_values_supported: z.array(z.string()).min(1),
  token_endpoint_auth_methods_supported: z.array(z.string()).optional(),
  code_challenge_methods_supported: z.array(z.string()).optional(),
  acr_values_supported: z.array(OidcAcrValueSchema).optional(),
  claims_parameter_supported: z.boolean().optional(),
  request_parameter_supported: z.boolean().optional(),
  request_uri_parameter_supported: z.boolean().optional(),
  backchannel_logout_supported: z.boolean().optional(),
  backchannel_logout_session_supported: z.boolean().optional(),
  dpop_signing_alg_values_supported: z.array(z.string()).optional(),
});

export type OidcDiscoveryDocument = z.infer<typeof OidcDiscoveryDocumentSchema>;

const TokenResponseShape = {
  access_token: z.string().min(1),
  token_type: z.string().regex(/^(bearer|dpop)$/i),
  expires_in: z.number().int().positive().optional(),
  scope: OidcScopeStringSchema.optional(),
};

/**
 * The token endpoint's success response for the authorization code, refresh token and device
 * code grants. `id_token` comes with the `openid` scope, `refresh_token` with `offline_access`.
 */
export const OidcTokenResponseSchema = z.looseObject({
  ...TokenResponseShape,
  refresh_token: z.string().min(1).optional(),
  id_token: z.string().min(1).optional(),
});

export type OidcTokenResponse = z.infer<typeof OidcTokenResponseSchema>;

/** Client credentials never return a refresh token or an ID token (RFC 6749, section 4.4.3). */
export const OidcClientCredentialsTokenResponseSchema = z.looseObject({
  ...TokenResponseShape,
  refresh_token: z.never().optional(),
  id_token: z.never().optional(),
});

export type OidcClientCredentialsTokenResponse = z.infer<
  typeof OidcClientCredentialsTokenResponseSchema
>;

/** RFC 6749 section 5.2, RFC 8707 `invalid_target` and RFC 8628 section 3.5. */
export const OidcTokenErrorCodeSchema = z.enum([
  'invalid_request',
  'invalid_client',
  'invalid_grant',
  'unauthorized_client',
  'unsupported_grant_type',
  'invalid_scope',
  'invalid_target',
  'authorization_pending',
  'slow_down',
  'access_denied',
  'expired_token',
]);

export type OidcTokenErrorCode = z.infer<typeof OidcTokenErrorCodeSchema>;

export const OidcTokenErrorResponseSchema = z.object({
  error: OidcTokenErrorCodeSchema,
  error_description: z.string().optional(),
  error_uri: z.url().optional(),
});

export type OidcTokenErrorResponse = z.infer<typeof OidcTokenErrorResponseSchema>;

/** The RFC 9470 step-up error. */
export const OIDC_INSUFFICIENT_USER_AUTHENTICATION = 'insufficient_user_authentication';

/**
 * The `error` a Seamless resource server guard answers with (RFC 6750 section 3.1, plus RFC
 * 9470). `missing_token` (a request with no bearer token, which RFC 6750 answers without an
 * error in the challenge) and `insufficient_role` are Seamless body codes.
 */
export const OidcBearerErrorCodeSchema = z.enum([
  'missing_token',
  'invalid_token',
  'insufficient_scope',
  'insufficient_role',
  OIDC_INSUFFICIENT_USER_AUTHENTICATION,
]);

export type OidcBearerErrorCode = z.infer<typeof OidcBearerErrorCodeSchema>;

/**
 * The RFC 9470 challenge: a 401 telling the client which `acr_values` or `max_age` to send
 * the user back through the provider with. Every Seamless adapter answers with this body and
 * the same parameters in `WWW-Authenticate`. `acr_values` is space-delimited.
 */
export const OidcStepUpChallengeSchema = z.object({
  error: z.literal(OIDC_INSUFFICIENT_USER_AUTHENTICATION),
  error_description: z.string().optional(),
  acr_values: z.string().min(1).optional(),
  max_age: z.number().int().nonnegative().optional(),
});

export type OidcStepUpChallenge = z.infer<typeof OidcStepUpChallengeSchema>;

/** The 403 for a valid token that lacks a scope the route needs. `scope` lists what it needs. */
export const OidcInsufficientScopeErrorSchema = z.object({
  error: z.literal('insufficient_scope'),
  scope: OidcScopeStringSchema,
});

export type OidcInsufficientScopeError = z.infer<typeof OidcInsufficientScopeErrorSchema>;
