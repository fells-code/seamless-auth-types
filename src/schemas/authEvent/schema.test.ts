import { describe, it, expect } from 'vitest';
import { AuthEventQuerySchema, AuthEventSchema } from './schema.js';

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

describe('AuthEventSchema actor', () => {
  const base = {
    id: 'evt-1',
    user_id: 'user-1',
    type: 'admin_device_replacement_recovery',
    metadata: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
  };

  it('parses an event written before the column existed', () => {
    const parsed = AuthEventSchema.parse(base);

    expect(parsed.actor_user_id).toBeUndefined();
  });

  it('carries the acting administrator alongside the target', () => {
    const parsed = AuthEventSchema.parse({ ...base, actor_user_id: 'admin-9' });

    expect(parsed.user_id).toBe('user-1');
    expect(parsed.actor_user_id).toBe('admin-9');
  });

  it('accepts an explicit null actor', () => {
    expect(AuthEventSchema.parse({ ...base, actor_user_id: null }).actor_user_id).toBeNull();
  });
});

describe('AuthEventQuerySchema actor filter', () => {
  it('accepts an actor filter', () => {
    expect(AuthEventQuerySchema.parse({ actorUserId: 'admin-9' }).actorUserId).toBe('admin-9');
  });

  it('leaves the actor filter unset when absent', () => {
    expect(AuthEventQuerySchema.parse({}).actorUserId).toBeUndefined();
  });
});

describe('AuthEventSchema session correlation', () => {
  const base = {
    id: 'evt-1',
    user_id: 'user-1',
    type: 'login_success',
    metadata: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
  };

  it('parses an event written before the column existed', () => {
    expect(AuthEventSchema.parse(base).session_id).toBeUndefined();
  });

  it('carries the session an action was taken from', () => {
    expect(AuthEventSchema.parse({ ...base, session_id: 'sess-7' }).session_id).toBe('sess-7');
  });

  it('accepts a null session for a pre-auth event', () => {
    expect(AuthEventSchema.parse({ ...base, session_id: null }).session_id).toBeNull();
  });
});

describe('AuthEventQuerySchema session filter', () => {
  it('accepts a session filter', () => {
    expect(AuthEventQuerySchema.parse({ sessionId: 'sess-7' }).sessionId).toBe('sess-7');
  });

  it('leaves the session filter unset when absent', () => {
    expect(AuthEventQuerySchema.parse({}).sessionId).toBeUndefined();
  });
});
