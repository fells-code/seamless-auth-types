import { describe, it, expect } from 'vitest';
import { SessionSchema } from './schema.js';

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
