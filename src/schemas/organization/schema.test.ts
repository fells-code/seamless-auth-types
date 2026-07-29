import { describe, it, expect } from 'vitest';
import {
  AddOrganizationMemberRequestSchema,
  CreateOrganizationRequestSchema,
  OrganizationMembershipSchema,
  OrganizationSchema,
} from './schema.js';

const now = new Date().toISOString();

const baseOrganization = {
  id: crypto.randomUUID(),
  name: 'Acme',
  slug: 'acme',
  createdByUserId: null,
  metadata: null,
  createdAt: now,
  updatedAt: now,
};

describe('OrganizationSchema', () => {
  it('parses a valid organization', () => {
    expect(() => OrganizationSchema.parse(baseOrganization)).not.toThrow();
  });

  it('normalizes timestamps to ISO strings', () => {
    const parsed = OrganizationSchema.parse({
      ...baseOrganization,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

    expect(parsed.createdAt).toBe(now);
    expect(parsed.updatedAt).toBe(now);
  });

  it('parses a nested membership', () => {
    const parsed = OrganizationSchema.parse({
      ...baseOrganization,
      memberCount: 2,
      membership: {
        id: 'membership-1',
        organizationId: baseOrganization.id,
        userId: 'user-1',
        roles: ['owner'],
        scopes: [],
        createdAt: now,
        updatedAt: now,
      },
    });

    expect(parsed.membership?.roles).toEqual(['owner']);
  });

  it('rejects a negative member count', () => {
    expect(() => OrganizationSchema.parse({ ...baseOrganization, memberCount: -1 })).toThrow();
  });
});

describe('OrganizationMembershipSchema', () => {
  it('parses an embedded user', () => {
    const parsed = OrganizationMembershipSchema.parse({
      id: 'membership-1',
      organizationId: baseOrganization.id,
      userId: 'user-1',
      roles: ['member'],
      scopes: ['billing:read'],
      createdAt: now,
      updatedAt: now,
      user: {
        id: 'user-1',
        email: 'member@example.com',
        phone: null,
        roles: ['user'],
      },
    });

    expect(parsed.user?.email).toBe('member@example.com');
  });
});

describe('CreateOrganizationRequestSchema', () => {
  it('trims the name', () => {
    expect(CreateOrganizationRequestSchema.parse({ name: '  Acme  ' }).name).toBe('Acme');
  });

  it('rejects a blank name', () => {
    expect(() => CreateOrganizationRequestSchema.parse({ name: '   ' })).toThrow();
  });
});

describe('AddOrganizationMemberRequestSchema', () => {
  it('accepts a user id', () => {
    expect(() =>
      AddOrganizationMemberRequestSchema.parse({ userId: crypto.randomUUID() }),
    ).not.toThrow();
  });

  it('accepts an email', () => {
    expect(() =>
      AddOrganizationMemberRequestSchema.parse({ email: 'member@example.com' }),
    ).not.toThrow();
  });

  it('requires either a user id or an email', () => {
    expect(() => AddOrganizationMemberRequestSchema.parse({ roles: ['member'] })).toThrow();
  });
});
