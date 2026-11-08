/**
 * The claim names no custom claim source may set (API ADR 0005), free of Zod so the API and the
 * OpenID Provider can share one list through the `./customClaim/reserved` subpath.
 *
 * A static claim with a reserved name is refused when written. A login hook that returns one has
 * it stripped, and the stripping is audited.
 */

/** RFC 7519 section 4.1. */
const JWT_REGISTERED = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'] as const;

/** OpenID Connect Core, OAuth (RFC 8693, RFC 8705, RFC 9068) and session claims. */
const PROTOCOL = [
  'azp',
  'nonce',
  'at_hash',
  'c_hash',
  's_hash',
  'auth_time',
  'acr',
  'amr',
  'sid',
  'scope',
  'client_id',
  'cnf',
  'typ',
  'act',
  'may_act',
] as const;

/** What Seamless itself puts in a token. */
const SEAMLESS = [
  'roles',
  'permissions',
  'permissions_omitted',
  'org_id',
  'org_roles',
  'org_permissions',
  'recovery',
] as const;

/**
 * OpenID Connect Core section 5.1. Reserved so a claim source cannot assert an address or name
 * the user never proved.
 */
const STANDARD_IDENTITY = [
  'name',
  'given_name',
  'family_name',
  'middle_name',
  'nickname',
  'preferred_username',
  'profile',
  'picture',
  'website',
  'email',
  'email_verified',
  'gender',
  'birthdate',
  'zoneinfo',
  'locale',
  'phone_number',
  'phone_number_verified',
  'address',
  'updated_at',
] as const;

export const RESERVED_CLAIM_NAMES: readonly string[] = [
  ...JWT_REGISTERED,
  ...PROTOCOL,
  ...SEAMLESS,
  ...STANDARD_IDENTITY,
];

/** Held for claims Seamless adds later. */
export const RESERVED_CLAIM_PREFIXES: readonly string[] = ['seamless_', 'org_'];

/** A custom claim name: lower case, starts with a letter, at most 64 characters. */
export const CUSTOM_CLAIM_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

/** How much all custom claims in one token may take, serialized as JSON, in UTF-8 bytes. */
export const CUSTOM_CLAIMS_BUDGET_BYTES = 1024;

/** How deeply a custom claim value may nest objects and arrays. A scalar has depth 0. */
export const CUSTOM_CLAIM_MAX_DEPTH = 3;

const reserved = new Set(RESERVED_CLAIM_NAMES);

export function isReservedClaimName(name: string): boolean {
  return reserved.has(name) || RESERVED_CLAIM_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function customClaimsByteLength(claims: Record<string, unknown>): number {
  return new TextEncoder().encode(JSON.stringify(claims)).length;
}

export function claimValueDepth(value: unknown): number {
  if (Array.isArray(value)) {
    return 1 + value.reduce<number>((depth, item) => Math.max(depth, claimValueDepth(item)), 0);
  }
  if (value !== null && typeof value === 'object') {
    return (
      1 +
      Object.values(value).reduce<number>(
        (depth, item) => Math.max(depth, claimValueDepth(item)),
        0,
      )
    );
  }
  return 0;
}
