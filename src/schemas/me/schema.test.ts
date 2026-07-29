import { describe, it, expect } from 'vitest';
import { MeResponseSchema, MeUserSchema } from './schema.js';

const now = new Date().toISOString();

const baseUser = {
  id: 'user-1',
  email: 'user@example.com',
  phone: null,
  roles: ['user'],
};

describe('MeUserSchema', () => {
  it('parses an email-only user', () => {
    expect(() => MeUserSchema.parse(baseUser)).not.toThrow();
  });

  it('allows a null last login and active organization', () => {
    expect(() =>
      MeUserSchema.parse({ ...baseUser, lastLogin: null, activeOrganizationId: null }),
    ).not.toThrow();
  });

  it('normalizes lastLogin to an ISO string', () => {
    expect(MeUserSchema.parse({ ...baseUser, lastLogin: new Date(now) }).lastLogin).toBe(now);
  });

  it('rejects an invalid role', () => {
    expect(() => MeUserSchema.parse({ ...baseUser, roles: ['bad role'] })).toThrow();
  });
});

describe('MeResponseSchema', () => {
  it('parses a user with no credentials', () => {
    expect(() => MeResponseSchema.parse({ user: baseUser, credentials: [] })).not.toThrow();
  });

  it('allows a null active organization', () => {
    expect(() =>
      MeResponseSchema.parse({ user: baseUser, credentials: [], activeOrganization: null }),
    ).not.toThrow();
  });
});
