import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  CUSTOM_CLAIM_MAX_DEPTH,
  CUSTOM_CLAIMS_BUDGET_BYTES,
  CustomClaimListResponseSchema,
  CustomClaimNameSchema,
  CustomClaimSourceParamSchema,
  CustomClaimValueSchema,
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

  it('holds values to exactly CUSTOM_CLAIM_MAX_DEPTH, in arrays and objects alike', () => {
    const nested = (depth: number, wrap: (inner: unknown) => unknown): unknown =>
      depth === 0 ? 'leaf' : wrap(nested(depth - 1, wrap));
    for (const wrap of [(inner: unknown) => [inner], (inner: unknown) => ({ k: inner })]) {
      const atLimit = nested(CUSTOM_CLAIM_MAX_DEPTH, wrap);
      const overLimit = nested(CUSTOM_CLAIM_MAX_DEPTH + 1, wrap);
      expect(CustomClaimValueSchema.parse(atLimit)).toEqual(atLimit);
      const result = CustomClaimValueSchema.safeParse(overLimit);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        `must not nest deeper than ${CUSTOM_CLAIM_MAX_DEPTH} levels`,
      );
    }
  });

  it.each([null, true, 0, -1.5, '', 'x', [], {}, [1, 'a', null, { b: [false] }]])(
    'accepts the JSON value %j',
    (value) => {
      expect(CustomClaimValueSchema.parse(value)).toEqual(value);
    },
  );

  it.each([undefined, Number.POSITIVE_INFINITY, 1n, () => 1, new Map(), [undefined]])(
    'refuses the non-JSON value %s',
    (value) => {
      expect(CustomClaimValueSchema.safeParse(value).success).toBe(false);
    },
  );

  it('reads stored sources with the same value rules', () => {
    const source = {
      sourceKind: 'instance_role',
      sourceName: 'admin',
      claims: { tenant: 'acme', limits: { seats: 10 } },
      updatedAt: new Date().toISOString(),
    };
    const list = { sources: [source], reservedNames: [], reservedPrefixes: [], budgetBytes: 1024 };
    expect(CustomClaimListResponseSchema.parse(list)).toEqual(list);
    expect(() =>
      CustomClaimListResponseSchema.parse({
        ...list,
        sources: [{ ...source, claims: { when: new Date() } }],
      }),
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
