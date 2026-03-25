import { describe, it, expect } from 'vitest';
import { AuthEventSchema } from './schema.js';

const now = new Date().toISOString();

describe('AuthEventSchema', () => {
  const baseEvent = {
    id: 'event_123',
    user_id: 'user_123',
    type: 'login',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    metadata: {
      device: 'desktop',
      success: true,
    },
    created_at: now,
    updated_at: now,
  };

  it('parses a valid auth event', () => {
    expect(() => AuthEventSchema.parse(baseEvent)).not.toThrow();
  });

  it('allows nullable optional fields', () => {
    const minimal = {
      id: 'event_123',
      type: 'login',
      metadata: null,
      created_at: now,
      updated_at: now,
    };

    expect(() => AuthEventSchema.parse(minimal)).not.toThrow();
  });

  it('allows missing optional fields', () => {
    const { ...rest } = baseEvent;

    expect(() => AuthEventSchema.parse(rest)).not.toThrow();
  });

  it('fails if required fields are missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = baseEvent;

    expect(() => AuthEventSchema.parse(rest)).toThrow();
  });

  it('fails if metadata is not an object or null', () => {
    expect(() =>
      AuthEventSchema.parse({
        ...baseEvent,
        metadata: 'invalid',
      }),
    ).toThrow();
  });

  it('allows metadata with arbitrary values', () => {
    expect(() =>
      AuthEventSchema.parse({
        ...baseEvent,
        metadata: {
          string: 'value',
          number: 123,
          boolean: true,
          nested: { key: 'value' },
          array: [1, 2, 3],
        },
      }),
    ).not.toThrow();
  });

  it('fails on invalid ISO date', () => {
    expect(() =>
      AuthEventSchema.parse({
        ...baseEvent,
        created_at: 'not-a-date',
      }),
    ).toThrow();
  });

  it('fails when metadata is undefined (not nullable)', () => {
    const { ...rest } = baseEvent;

    expect(() =>
      AuthEventSchema.parse({
        ...rest,
        metadata: undefined,
      }),
    ).toThrow();
  });
});
