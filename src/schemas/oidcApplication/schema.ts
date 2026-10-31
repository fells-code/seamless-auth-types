import { z } from 'zod';

import { OidcPublicJwkSchema, OidcTokenEndpointAuthMethodSchema } from '../oidcEdge/schema.js';

/**
 * Admin management of the OpenID Provider's applications (clients) and the APIs
 * (resources) they may request tokens for. Routes are on the private API under `/admin`,
 * behind admin roles, with step-up on every write (ADR 0001, D12).
 *
 * The settings here cannot express the configurations ADR D1, D6 and D10 forbid: public
 * clients never hold keys or secrets, redirects are exact except the RFC 8252 loopback
 * port, `localhost` is never a redirect host, the device grant is first-party only, and
 * implicit, hybrid, password and `client_secret_jwt` cannot be named at all.
 */
export const OidcApplicationRoutes = {
  applications: '/admin/applications',
  application: '/admin/applications/:id',
  applicationSecret: '/admin/applications/:id/secret',
  applicationKeys: '/admin/applications/:id/keys',
  applicationResources: '/admin/applications/:id/resources',
  resources: '/admin/resources',
  resource: '/admin/resources/:id',
} as const;

export const OidcClientTypeSchema = z.enum(['public', 'confidential']);

export type OidcClientType = z.infer<typeof OidcClientTypeSchema>;

/** The device grant is not listed: it is `deviceFlowEnabled`, which only first-party clients may set. */
export const OidcApplicationGrantTypeSchema = z.enum([
  'authorization_code',
  'refresh_token',
  'client_credentials',
]);

export type OidcApplicationGrantType = z.infer<typeof OidcApplicationGrantTypeSchema>;

export type OidcRedirectUriKind = 'https' | 'loopback' | 'private_use';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]']);
const PRIVATE_USE_SCHEME = /^[a-z][a-z0-9+-]*(\.[a-z0-9+-]+)+$/;
const MAX_URI_LENGTH = 2048;

function isLocalhostName(hostname: string) {
  return hostname === 'localhost' || hostname.endsWith('.localhost');
}

/**
 * Why a redirect URI cannot be registered, or `null` when it can. Accepted forms:
 *
 * - `https` on any host but `localhost`, matched exactly (RFC 8252 section 7.2 claimed links).
 * - `http` on `127.0.0.1` or `[::1]` only. The port is ignored at request time, so a
 *   native app may listen on any port (section 7.3). `localhost` is refused (section 8.3).
 * - A private-use scheme in reverse domain form, such as `com.example.app:/callback`
 *   (section 7.1). The dot keeps out `javascript:`, `data:` and every other scheme a
 *   browser would act on.
 *
 * Fragments and embedded credentials are refused in every form.
 */
export function oidcRedirectUriProblem(value: string): string | null {
  if (value.length > MAX_URI_LENGTH) return 'redirect URI is too long';
  if (value !== value.trim()) return 'redirect URI must not have surrounding whitespace';
  if (value.includes('#')) return 'redirect URI must not have a fragment';

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'redirect URI must be an absolute URI';
  }

  if (url.username || url.password) return 'redirect URI must not carry credentials';

  const scheme = url.protocol.slice(0, -1);

  if (scheme === 'https') {
    if (!url.hostname) return 'https redirect URI needs a host';
    if (isLocalhostName(url.hostname)) {
      return 'localhost is not a redirect host, use 127.0.0.1 or [::1] (RFC 8252 section 8.3)';
    }
    return null;
  }

  if (scheme === 'http') {
    if (isLocalhostName(url.hostname)) {
      return 'localhost is not a redirect host, use 127.0.0.1 or [::1] (RFC 8252 section 8.3)';
    }
    return LOOPBACK_HOSTS.has(url.hostname)
      ? null
      : 'http redirect URIs are only allowed on 127.0.0.1 or [::1], use https';
  }

  return PRIVATE_USE_SCHEME.test(scheme)
    ? null
    : 'a private-use scheme must be in reverse domain form, such as com.example.app';
}

/** Which RFC 8252 form a registrable redirect URI takes, or `null` if it cannot be registered. */
export function oidcRedirectUriKind(value: string): OidcRedirectUriKind | null {
  if (oidcRedirectUriProblem(value) !== null) return null;

  const { protocol } = new URL(value);
  if (protocol === 'https:') return 'https';
  return protocol === 'http:' ? 'loopback' : 'private_use';
}

export const OidcRedirectUriSchema = z.string().superRefine((value, ctx) => {
  const problem = oidcRedirectUriProblem(value);
  if (problem) ctx.addIssue({ code: 'custom', message: problem });
});

export type OidcRedirectUri = z.infer<typeof OidcRedirectUriSchema>;

/** For URLs the API itself fetches or calls, such as a JWKS URI or a back-channel logout URI. */
const HttpsUrlSchema = z
  .url({ protocol: /^https$/ })
  .max(MAX_URI_LENGTH)
  .refine((value) => !value.includes('#'), { message: 'URL must not have a fragment' });

const RedirectUriListSchema = z
  .array(OidcRedirectUriSchema)
  .max(50)
  .refine((uris) => new Set(uris).size === uris.length, { message: 'URIs must be unique' });

export const OidcApplicationJwksSchema = z.object({
  keys: z.array(OidcPublicJwkSchema).min(1).max(20),
});

export type OidcApplicationJwks = z.infer<typeof OidcApplicationJwksSchema>;

const NameSchema = z.string().trim().min(1).max(255);
const TokenTtlSchema = z.number().int().min(60).max(86_400).nullable();
const RefreshTokenTtlSchema = z
  .number()
  .int()
  .min(300)
  .max(90 * 86_400)
  .nullable();

const applicationShape = {
  name: NameSchema,
  clientType: OidcClientTypeSchema,
  /**
   * A first-party client skips consent and may use the device grant. Only an admin can
   * mark one, and third-party clients also need `third_party_clients_enabled`.
   */
  firstParty: z.boolean(),
  /**
   * `none` for public clients, which authenticate with PKCE (S256) alone. Confidential
   * clients default to `private_key_jwt`. The shared-secret methods also need
   * `allow_client_secrets` on the instance.
   */
  tokenEndpointAuthMethod: OidcTokenEndpointAuthMethodSchema,
  redirectUris: RedirectUriListSchema,
  postLogoutRedirectUris: RedirectUriListSchema,
  grantTypes: z.array(OidcApplicationGrantTypeSchema).max(3),
  deviceFlowEnabled: z.boolean(),
  /** Lets the application send account notices to its own users (ADR D14). */
  noticesEnabled: z.boolean(),
  backchannelLogoutUri: HttpsUrlSchema.nullable(),
  accessTokenTtlSeconds: TokenTtlSchema,
  idTokenTtlSeconds: TokenTtlSchema,
  refreshTokenTtlSeconds: RefreshTokenTtlSchema,
};

type ApplicationChecked = {
  clientType: OidcClientType;
  firstParty: boolean;
  tokenEndpointAuthMethod?: z.infer<typeof OidcTokenEndpointAuthMethodSchema> | undefined;
  redirectUris: string[];
  grantTypes: OidcApplicationGrantType[];
  deviceFlowEnabled: boolean;
  jwks?: OidcApplicationJwks | null | undefined;
  jwksUri?: string | null | undefined;
};

export function defaultOidcTokenEndpointAuthMethod(clientType: OidcClientType) {
  return clientType === 'public' ? ('none' as const) : ('private_key_jwt' as const);
}

/**
 * The cross-field rules every stored application satisfies. The API runs them on create
 * and again on the merged result of every update, so no sequence of partial updates can
 * reach a configuration a single request could not.
 */
export function checkOidcApplication(app: ApplicationChecked, ctx: z.RefinementCtx) {
  const method = app.tokenEndpointAuthMethod ?? defaultOidcTokenEndpointAuthMethod(app.clientType);
  const grants = new Set(app.grantTypes);
  const hasKeys = Boolean(app.jwks) || Boolean(app.jwksUri);
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message });

  if (app.clientType === 'public' && method !== 'none') {
    issue('tokenEndpointAuthMethod', 'public clients cannot authenticate, they use PKCE');
  }
  if (app.clientType === 'confidential' && method === 'none') {
    issue('tokenEndpointAuthMethod', 'confidential clients must authenticate');
  }
  if (app.jwks && app.jwksUri) {
    issue('jwksUri', 'register a JWKS or a JWKS URI, not both');
  }
  if (hasKeys && method !== 'private_key_jwt') {
    issue('tokenEndpointAuthMethod', 'keys are only used with private_key_jwt');
  }
  if (grants.size !== app.grantTypes.length) {
    issue('grantTypes', 'grant types must be unique');
  }
  if (grants.size === 0 && !app.deviceFlowEnabled) {
    issue('grantTypes', 'an application needs at least one grant');
  }
  if (grants.has('client_credentials') && app.clientType === 'public') {
    issue('grantTypes', 'public clients cannot use client_credentials');
  }
  if (grants.has('refresh_token') && !grants.has('authorization_code') && !app.deviceFlowEnabled) {
    issue('grantTypes', 'refresh_token needs authorization_code or the device grant');
  }
  if (grants.has('authorization_code') && app.redirectUris.length === 0) {
    issue('redirectUris', 'authorization_code needs at least one redirect URI');
  }
  if (app.deviceFlowEnabled && !app.firstParty) {
    issue('deviceFlowEnabled', 'the device grant is only available to first-party clients');
  }
}

export const OidcApplicationCreateRequestSchema = z
  .object({
    ...applicationShape,
    firstParty: applicationShape.firstParty.default(false),
    tokenEndpointAuthMethod: applicationShape.tokenEndpointAuthMethod.optional(),
    redirectUris: applicationShape.redirectUris.default([]),
    postLogoutRedirectUris: applicationShape.postLogoutRedirectUris.default([]),
    grantTypes: applicationShape.grantTypes.default(['authorization_code', 'refresh_token']),
    deviceFlowEnabled: applicationShape.deviceFlowEnabled.default(false),
    noticesEnabled: applicationShape.noticesEnabled.default(false),
    backchannelLogoutUri: applicationShape.backchannelLogoutUri.optional(),
    accessTokenTtlSeconds: TokenTtlSchema.optional(),
    idTokenTtlSeconds: TokenTtlSchema.optional(),
    refreshTokenTtlSeconds: RefreshTokenTtlSchema.optional(),
    jwks: OidcApplicationJwksSchema.optional(),
    jwksUri: HttpsUrlSchema.optional(),
  })
  .strict()
  .superRefine(checkOidcApplication);

export type OidcApplicationCreateRequest = z.infer<typeof OidcApplicationCreateRequestSchema>;

/**
 * Every field optional and none defaulted, so a patch of one field changes only that
 * field. `clientType` is fixed at creation. Keys change through the keys route and
 * secrets through the secret route, so each has its own audit event.
 */
export const OidcApplicationUpdateRequestSchema = z
  .object({
    name: applicationShape.name,
    firstParty: applicationShape.firstParty,
    tokenEndpointAuthMethod: applicationShape.tokenEndpointAuthMethod,
    redirectUris: applicationShape.redirectUris,
    postLogoutRedirectUris: applicationShape.postLogoutRedirectUris,
    grantTypes: applicationShape.grantTypes,
    deviceFlowEnabled: applicationShape.deviceFlowEnabled,
    noticesEnabled: applicationShape.noticesEnabled,
    backchannelLogoutUri: applicationShape.backchannelLogoutUri,
    accessTokenTtlSeconds: applicationShape.accessTokenTtlSeconds,
    idTokenTtlSeconds: applicationShape.idTokenTtlSeconds,
    refreshTokenTtlSeconds: applicationShape.refreshTokenTtlSeconds,
    /** A disabled application cannot sign anyone in or get tokens, and keeps its settings. */
    disabled: z.boolean(),
  })
  .partial()
  .strict();

export type OidcApplicationUpdateRequest = z.infer<typeof OidcApplicationUpdateRequestSchema>;

/** Replaces the application's keys. Only for `private_key_jwt` clients. */
export const OidcApplicationKeysRequestSchema = z.union([
  z.object({ jwks: OidcApplicationJwksSchema }).strict(),
  z.object({ jwksUri: HttpsUrlSchema }).strict(),
]);

export type OidcApplicationKeysRequest = z.infer<typeof OidcApplicationKeysRequestSchema>;

export const OidcApplicationIdParamsSchema = z.object({
  id: z.string().min(1).max(255),
});

export type OidcApplicationIdParams = z.infer<typeof OidcApplicationIdParamsSchema>;

export const OidcApplicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientType: OidcClientTypeSchema,
  /** `native` when any redirect URI is a loopback or private-use one. */
  applicationType: z.enum(['web', 'native']),
  firstParty: z.boolean(),
  tokenEndpointAuthMethod: OidcTokenEndpointAuthMethodSchema,
  redirectUris: z.array(z.string()),
  postLogoutRedirectUris: z.array(z.string()),
  grantTypes: z.array(OidcApplicationGrantTypeSchema),
  deviceFlowEnabled: z.boolean(),
  noticesEnabled: z.boolean(),
  jwks: OidcApplicationJwksSchema.nullable(),
  jwksUri: z.string().nullable(),
  /** Whether a shared secret is set. The secret itself is only ever returned once. */
  hasSecret: z.boolean(),
  backchannelLogoutUri: z.string().nullable(),
  accessTokenTtlSeconds: z.number().int().nullable(),
  idTokenTtlSeconds: z.number().int().nullable(),
  refreshTokenTtlSeconds: z.number().int().nullable(),
  disabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OidcApplication = z.infer<typeof OidcApplicationSchema>;

export const OidcApplicationResponseSchema = z.object({
  application: OidcApplicationSchema,
});

export type OidcApplicationResponse = z.infer<typeof OidcApplicationResponseSchema>;

/** `clientSecret` is present only when a shared-secret client is created, and is shown once. */
export const OidcApplicationCreatedResponseSchema = OidcApplicationResponseSchema.extend({
  clientSecret: z.string().optional(),
});

export type OidcApplicationCreatedResponse = z.infer<typeof OidcApplicationCreatedResponseSchema>;

export const OidcApplicationListResponseSchema = z.object({
  applications: z.array(OidcApplicationSchema),
});

export type OidcApplicationListResponse = z.infer<typeof OidcApplicationListResponseSchema>;

/** A new shared secret, shown once. Issuing one replaces the previous secret at once. */
export const OidcApplicationSecretResponseSchema = z.object({
  application: OidcApplicationSchema,
  clientSecret: z.string(),
});

export type OidcApplicationSecretResponse = z.infer<typeof OidcApplicationSecretResponseSchema>;

const RESERVED_SCOPES = new Set([
  'openid',
  'profile',
  'email',
  'phone',
  'address',
  'offline_access',
  'seamless',
]);

/** An RFC 6749 scope token. The OpenID Connect scopes, and `seamless`, belong to the provider. */
export const OidcScopeSchema = z
  .string()
  .regex(/^[\x21\x23-\x5B\x5D-\x7E]{1,128}$/, { message: 'not a valid scope token' })
  .refine((scope) => !RESERVED_SCOPES.has(scope), {
    message: 'that scope is reserved by the provider',
  });

export type OidcScope = z.infer<typeof OidcScopeSchema>;

const ScopeListSchema = z
  .array(OidcScopeSchema)
  .max(100)
  .refine((scopes) => new Set(scopes).size === scopes.length, {
    message: 'scopes must be unique',
  });

/**
 * The `aud` of the resource's access tokens (RFC 8707, RFC 9068). An absolute `https`,
 * `http` or `urn` URI with no query or fragment. It names the API and is never fetched.
 * The API also refuses its own `ISSUER` and `oidc_issuer`.
 */
export const OidcResourceIdentifierSchema = z
  .string()
  .max(MAX_URI_LENGTH)
  .superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });

    if (value !== value.trim()) return fail('identifier must not have surrounding whitespace');
    if (value.includes('#') || value.includes('?')) {
      return fail('identifier must not have a query or fragment');
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return fail('identifier must be an absolute URI');
    }

    if (!['https:', 'http:', 'urn:'].includes(url.protocol)) {
      return fail('identifier must be an https, http or urn URI');
    }
    if (url.username || url.password) return fail('identifier must not carry credentials');
    if (url.protocol !== 'urn:' && !url.hostname) return fail('identifier needs a host');
  });

export type OidcResourceIdentifier = z.infer<typeof OidcResourceIdentifierSchema>;

export const OidcResourceCreateRequestSchema = z
  .object({
    identifier: OidcResourceIdentifierSchema,
    name: NameSchema,
    scopes: ScopeListSchema.default([]),
    accessTokenTtlSeconds: TokenTtlSchema.optional(),
  })
  .strict();

export type OidcResourceCreateRequest = z.infer<typeof OidcResourceCreateRequestSchema>;

/**
 * The identifier is fixed, because issued tokens carry it as `aud`. Removing a scope also
 * removes it from every application allowed it.
 */
export const OidcResourceUpdateRequestSchema = z
  .object({
    name: NameSchema,
    scopes: ScopeListSchema,
    accessTokenTtlSeconds: TokenTtlSchema,
  })
  .partial()
  .strict();

export type OidcResourceUpdateRequest = z.infer<typeof OidcResourceUpdateRequestSchema>;

export const OidcResourceIdParamsSchema = z.object({
  id: z.uuid(),
});

export type OidcResourceIdParams = z.infer<typeof OidcResourceIdParamsSchema>;

export const OidcResourceSchema = z.object({
  id: z.uuid(),
  identifier: z.string(),
  name: z.string(),
  scopes: z.array(z.string()),
  accessTokenTtlSeconds: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OidcResource = z.infer<typeof OidcResourceSchema>;

export const OidcResourceResponseSchema = z.object({
  resource: OidcResourceSchema,
});

export type OidcResourceResponse = z.infer<typeof OidcResourceResponseSchema>;

export const OidcResourceListResponseSchema = z.object({
  resources: z.array(OidcResourceSchema),
});

export type OidcResourceListResponse = z.infer<typeof OidcResourceListResponseSchema>;

/** One resource an application may request tokens for, and the subset of its scopes. */
export const OidcApplicationResourceGrantSchema = z
  .object({
    resourceId: z.uuid(),
    scopes: ScopeListSchema,
  })
  .strict();

export type OidcApplicationResourceGrant = z.infer<typeof OidcApplicationResourceGrantSchema>;

/** Replaces the whole set. Scopes must be ones the resource declares. */
export const OidcApplicationResourcesRequestSchema = z
  .object({
    resources: z
      .array(OidcApplicationResourceGrantSchema)
      .max(50)
      .refine((grants) => new Set(grants.map((grant) => grant.resourceId)).size === grants.length, {
        message: 'each resource may appear once',
      }),
  })
  .strict();

export type OidcApplicationResourcesRequest = z.infer<typeof OidcApplicationResourcesRequestSchema>;

export const OidcApplicationResourceSchema = z.object({
  resourceId: z.uuid(),
  identifier: z.string(),
  name: z.string(),
  scopes: z.array(z.string()),
});

export type OidcApplicationResource = z.infer<typeof OidcApplicationResourceSchema>;

export const OidcApplicationResourcesResponseSchema = z.object({
  resources: z.array(OidcApplicationResourceSchema),
});

export type OidcApplicationResourcesResponse = z.infer<
  typeof OidcApplicationResourcesResponseSchema
>;
