import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  CUSTOM_CLAIMS_BUDGET_BYTES,
  CustomClaimNameSchema,
  CustomClaimSourceParamSchema,
  RESERVED_CLAIM_NAMES,
  SetCustomClaimsRequestSchema,
  claimValueDepth,
  isReservedClaimName,
} from './schema.js';

describe('reserved module', () => {
  it('stays free of Zod so the provider can import it without the dependency', () => {
    const source = readFileSync(new URL('./reserved.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from ['"]zod/);
  });
});

describe('reserved names', () => {
  it.each([
    'sub',
    'aud',
    'exp',
    'jti',
    'nonce',
    'acr',
    'amr',
    'sid',
    'scope',
    'client_id',
    'cnf',
    'roles',
    'permissions',
    'permissions_omitted',
    'org_id',
    'recovery',
    'email',
    'email_verified',
    'phone_number',
    'org_anything',
    'seamless_tier',
  ])('reserves %j', (name) => {
    expect(isReservedClaimName(name)).toBe(true);
    expect(() => CustomClaimNameSchema.parse(name)).toThrow();
  });

  it('holds every name in the list to the name pattern, so none is unreachable by accident', () => {
    for (const name of RESERVED_CLAIM_NAMES) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it.each(['tenant', 'plan_tier', 'x1'])('accepts %j', (name) => {
    expect(CustomClaimNameSchema.parse(name)).toBe(name);
  });

  it.each([
    'Tenant',
    '1tenant',
    'ten-ant',
    'ten.ant',
    'https://example.com/tenant',
    '',
    'a'.repeat(65),
  ])('rejects %j', (name) => {
    expect(() => CustomClaimNameSchema.parse(name)).toThrow();
  });
});

describe('claim sets', () => {
  it('accepts JSON values nested up to three levels', () => {
    const claims = { tenant: 'acme', limits: { seats: 10, regions: ['eu'] }, beta: true };
    expect(SetCustomClaimsRequestSchema.parse({ claims }).claims).toEqual(claims);
    expect(claimValueDepth({ a: { b: ['c'] } })).toBe(3);
  });

  it('refuses a value nested four levels deep', () => {
    expect(() =>
      SetCustomClaimsRequestSchema.parse({ claims: { deep: { a: { b: { c: { d: 1 } } } } } }),
    ).toThrow();
  });

  it('refuses a reserved name inside a set', () => {
    expect(() =>
      SetCustomClaimsRequestSchema.parse({ claims: { email: 'x@example.com' } }),
    ).toThrow();
  });

  it('holds the whole set to the budget, counting UTF-8 bytes', () => {
    // Each é is two bytes, so this is under the budget in characters and over it in bytes.
    const fits = { note: 'a'.repeat(CUSTOM_CLAIMS_BUDGET_BYTES - 20) };
    const over = { note: 'é'.repeat(CUSTOM_CLAIMS_BUDGET_BYTES / 2) };
    expect(() => SetCustomClaimsRequestSchema.parse({ claims: fits })).not.toThrow();
    expect(() => SetCustomClaimsRequestSchema.parse({ claims: over })).toThrow();
  });

  it('refuses values that are not JSON', () => {
    expect(() => SetCustomClaimsRequestSchema.parse({ claims: { when: new Date() } })).toThrow();
    expect(() => SetCustomClaimsRequestSchema.parse({ claims: { n: Number.NaN } })).toThrow();
  });

  it('names a source by kind', () => {
    expect(
      CustomClaimSourceParamSchema.parse({ sourceKind: 'organization_role', sourceName: 'admin' }),
    ).toEqual({ sourceKind: 'organization_role', sourceName: 'admin' });
    expect(() =>
      CustomClaimSourceParamSchema.parse({ sourceKind: 'user', sourceName: 'x' }),
    ).toThrow();
  });
});
