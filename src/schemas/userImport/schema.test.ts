import { describe, expect, it } from 'vitest';
import {
  ImportUsersRequestSchema,
  ImportUsersResponseSchema,
  USER_IMPORT_MAX_ROWS,
  UserImportOrganizationSchema,
} from './schema.js';

const row = { email: 'ada@example.com' };

describe('ImportUsersRequestSchema', () => {
  it('defaults dryRun to false', () => {
    const parsed = ImportUsersRequestSchema.parse({ source: 'csv', users: [row] });
    expect(parsed.dryRun).toBe(false);
  });

  it('accepts a full row', () => {
    expect(() =>
      ImportUsersRequestSchema.parse({
        source: 'entra-id',
        dryRun: true,
        users: [
          {
            externalId: '8f2c',
            email: 'ada@example.com',
            phone: '+14155552671',
            roles: ['user', 'clerk:read'],
            organizations: [{ slug: 'public-works', roles: ['member'] }],
          },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects an empty batch and one over the limit', () => {
    expect(ImportUsersRequestSchema.safeParse({ source: 'csv', users: [] }).success).toBe(false);
    const users = Array.from({ length: USER_IMPORT_MAX_ROWS + 1 }, (_, i) => ({
      email: `u${i}@example.com`,
    }));
    expect(ImportUsersRequestSchema.safeParse({ source: 'csv', users }).success).toBe(false);
  });

  it('rejects a source that is not a lowercase slug', () => {
    for (const source of ['CSV', 'entra id', '-csv', '']) {
      expect(ImportUsersRequestSchema.safeParse({ source, users: [row] }).success).toBe(false);
    }
  });

  it('refuses credential fields and other unknown keys', () => {
    const result = ImportUsersRequestSchema.safeParse({
      source: 'csv',
      users: [{ ...row, passwordHash: '$2b$10$abc' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(
      ImportUsersRequestSchema.safeParse({ source: 'csv', users: [{ email: 'nope' }] }).success,
    ).toBe(false);
  });
});

describe('UserImportOrganizationSchema', () => {
  it('requires exactly one of organizationId or slug', () => {
    expect(UserImportOrganizationSchema.safeParse({}).success).toBe(false);
    expect(
      UserImportOrganizationSchema.safeParse({
        organizationId: crypto.randomUUID(),
        slug: 'parks',
      }).success,
    ).toBe(false);
    expect(UserImportOrganizationSchema.safeParse({ slug: 'parks' }).success).toBe(true);
    expect(
      UserImportOrganizationSchema.safeParse({ organizationId: crypto.randomUUID() }).success,
    ).toBe(true);
  });
});

describe('ImportUsersResponseSchema', () => {
  it('parses a mixed result', () => {
    expect(() =>
      ImportUsersResponseSchema.parse({
        source: 'csv',
        dryRun: false,
        summary: { created: 1, updated: 0, unchanged: 0, rejected: 1 },
        results: [
          {
            index: 0,
            email: 'a@example.com',
            status: 'created',
            userId: 'u1',
            changes: ['created'],
          },
          {
            index: 1,
            email: 'b@example.com',
            status: 'rejected',
            reason: 'admin_role_not_allowed',
          },
        ],
      }),
    ).not.toThrow();
  });
});
