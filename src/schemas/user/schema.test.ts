import { describe, it, expect } from 'vitest';
import { UserSchema, CreateUserSchema, UpdateUserSchema } from './schema';

const now = new Date().toISOString();

describe('UserSchema', () => {
  const baseUser = {
    id: crypto.randomUUID(),
    email: 'test@example.com',
    phone: '1234567890',
    roles: ['user'],
    revoked: false,
    emailVerified: true,
    phoneVerified: false,
    verified: true,
    lastLogin: now,
    createdAt: now,
    updatedAt: now,
  };

  it('parses a valid user', () => {
    expect(() => UserSchema.parse(baseUser)).not.toThrow();
  });

  it('applies defaults when optional fields are missing', () => {
    const minimal = {
      id: crypto.randomUUID(),
      email: 'test@example.com',
      phone: '1234567890',
      createdAt: now,
    };

    const parsed = UserSchema.parse(minimal);

    expect(parsed.roles).toEqual([]);
    expect(parsed.revoked).toBe(false);
    expect(parsed.emailVerified).toBe(false);
    expect(parsed.phoneVerified).toBe(false);
    expect(parsed.verified).toBe(false);
  });

  it('fails on invalid email', () => {
    expect(() =>
      UserSchema.parse({
        ...baseUser,
        email: 'invalid-email',
      }),
    ).toThrow();
  });

  it('fails on invalid role format', () => {
    expect(() =>
      UserSchema.parse({
        ...baseUser,
        roles: ['bad role'], // contains space
      }),
    ).toThrow();
  });

  it('allows nullable lastLogin', () => {
    expect(() =>
      UserSchema.parse({
        ...baseUser,
        lastLogin: null,
      }),
    ).not.toThrow();
  });

  it('allows missing optional fields', () => {
    const { ...rest } = baseUser;

    expect(() => UserSchema.parse(rest)).not.toThrow();
  });
});

describe('CreateUserSchema', () => {
  it('parses valid input', () => {
    expect(() =>
      CreateUserSchema.parse({
        email: 'test@example.com',
        phone: '1234567890',
        roles: ['admin'],
      }),
    ).not.toThrow();
  });

  it('fails if roles are empty', () => {
    expect(() =>
      CreateUserSchema.parse({
        email: 'test@example.com',
        phone: '1234567890',
        roles: [],
      }),
    ).toThrow();
  });

  it('fails on invalid email', () => {
    expect(() =>
      CreateUserSchema.parse({
        email: 'bad-email',
        phone: '1234567890',
        roles: ['user'],
      }),
    ).toThrow();
  });

  it('fails on invalid role format', () => {
    expect(() =>
      CreateUserSchema.parse({
        email: 'test@example.com',
        phone: '1234567890',
        roles: ['bad role'],
      }),
    ).toThrow();
  });
});

describe('UpdateUserSchema', () => {
  it('parses valid partial update', () => {
    expect(() =>
      UpdateUserSchema.parse({
        email: 'new@example.com',
      }),
    ).not.toThrow();
  });

  it('requires roles if provided and must be non-empty', () => {
    expect(() =>
      UpdateUserSchema.parse({
        roles: [],
      }),
    ).toThrow();
  });

  it('fails on short phone number', () => {
    expect(() =>
      UpdateUserSchema.parse({
        phone: '123',
      }),
    ).toThrow();
  });

  it('fails on invalid role format', () => {
    expect(() =>
      UpdateUserSchema.parse({
        roles: ['invalid role'],
      }),
    ).toThrow();
  });

  it('fails on unknown fields due to strict()', () => {
    expect(() =>
      UpdateUserSchema.parse({
        email: 'test@example.com',
        unknownField: true,
      }),
    ).toThrow();
  });
});
