import { describe, it, expect } from 'vitest';
import {
  SessionExchangeRequestSchema,
  SessionExchangeResponseSchema,
  SessionSchema,
} from './schema.js';

const now = new Date().toISOString();
const later = new Date(Date.now() + 1000 * 60 * 60).toISOString();

describe('SessionSchema', () => {
  const baseSession = {
    id: 'session_123',
    deviceName: 'MacBook Pro',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    lastUsedAt: now,
    expiresAt: later,
    current: true,
  };

  it('parses a valid session', () => {
    expect(() => SessionSchema.parse(baseSession)).not.toThrow();
  });

  it('allows optional nullable fields to be omitted', () => {
    const { ...minimal } = baseSession;

    expect(() => SessionSchema.parse(minimal)).not.toThrow();
  });

  it('allows optional nullable fields to be null', () => {
    expect(() =>
      SessionSchema.parse({
        ...baseSession,
        deviceName: null,
        ipAddress: null,
        userAgent: null,
      }),
    ).not.toThrow();
  });

  it('fails when required fields are missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = baseSession;

    expect(() => SessionSchema.parse(rest)).toThrow();
  });

  it('fails when current is not a boolean', () => {
    expect(() =>
      SessionSchema.parse({
        ...baseSession,
        current: 'true',
      }),
    ).toThrow();
  });

  it('fails when lastUsedAt is not a string', () => {
    expect(() =>
      SessionSchema.parse({
        ...baseSession,
        lastUsedAt: 123,
      }),
    ).toThrow();
  });

  it('fails when expiresAt is not a string', () => {
    expect(() =>
      SessionSchema.parse({
        ...baseSession,
        expiresAt: 123,
      }),
    ).toThrow();
  });

  it('allows different valid session shapes', () => {
    expect(() =>
      SessionSchema.parse({
        id: 'session_456',
        lastUsedAt: now,
        expiresAt: later,
        current: false,
      }),
    ).not.toThrow();
  });
});

describe('exchanged sessions', () => {
  const base = {
    id: 's1',
    lastUsedAt: '2026-11-04T00:00:00.000Z',
    expiresAt: '2026-11-05T00:00:00.000Z',
    current: false,
  };

  it('keeps the origin of a child session in a session list', () => {
    const origin = {
      parentSessionId: 'p1',
      exchangeClientId: 'cli',
      exchangeGrantType: 'urn:ietf:params:oauth:grant-type:device_code',
    };
    expect(SessionSchema.parse({ ...base, ...origin })).toMatchObject(origin);
  });

  it('still parses a session with no origin', () => {
    expect(SessionSchema.parse(base)).toEqual(base);
  });
});

describe('SessionExchangeRequestSchema', () => {
  const request = {
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: 'a.b.c',
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
  };

  it('accepts the RFC 8693 parameters, with or without a requested token type', () => {
    expect(SessionExchangeRequestSchema.safeParse(request).success).toBe(true);
    expect(
      SessionExchangeRequestSchema.safeParse({
        ...request,
        requested_token_type: 'urn:ietf:params:oauth:token-type:refresh_token',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['another grant', { grant_type: 'refresh_token' }],
    ['another subject token type', { subject_token_type: 'urn:ietf:params:oauth:token-type:jwt' }],
    ['another requested type', { requested_token_type: 'urn:ietf:params:oauth:token-type:jwt' }],
    ['an empty token', { subject_token: '' }],
    ['an actor token', { actor_token: 'a.b.c' }],
  ])('refuses %s', (_name, overrides) => {
    expect(SessionExchangeRequestSchema.safeParse({ ...request, ...overrides }).success).toBe(
      false,
    );
  });
});

describe('SessionExchangeResponseSchema', () => {
  it('is the refresh response plus the issued token type', () => {
    const parsed = SessionExchangeResponseSchema.parse({
      message: 'Success',
      token: 'jwt',
      refreshToken: 'opaque',
      issued_token_type: 'urn:ietf:params:oauth:token-type:refresh_token',
    });
    expect(parsed.issued_token_type).toBe('urn:ietf:params:oauth:token-type:refresh_token');
  });
});
