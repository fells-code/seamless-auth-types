import { describe, it, expect } from 'vitest';
import {
  LOGIN_HOOK_MAX_TIMEOUT_MS,
  LoginHookCallSchema,
  PostLoginHookResultSchema,
  PreTokenHookResultSchema,
  SetLoginHookRequestSchema,
} from './schema.js';

describe('SetLoginHookRequestSchema', () => {
  it('defaults to a 2 second timeout, failing closed, enabled', () => {
    expect(SetLoginHookRequestSchema.parse({ url: 'https://hooks.example.com/login' })).toEqual({
      url: 'https://hooks.example.com/login',
      timeoutMs: 2000,
      failureMode: 'closed',
      enabled: true,
    });
  });

  it('caps the timeout at 5 seconds and refuses one under 100 ms', () => {
    const url = 'https://hooks.example.com/login';
    expect(() =>
      SetLoginHookRequestSchema.parse({ url, timeoutMs: LOGIN_HOOK_MAX_TIMEOUT_MS + 1 }),
    ).toThrow();
    expect(() => SetLoginHookRequestSchema.parse({ url, timeoutMs: 99 })).toThrow();
  });

  it('refuses a URL carrying credentials', () => {
    expect(() =>
      SetLoginHookRequestSchema.parse({ url: 'https://u:p@hooks.example.com/login' }),
    ).toThrow();
  });
});

describe('hook results', () => {
  it('lets a post_login hook allow or deny, and not add claims', () => {
    expect(PostLoginHookResultSchema.parse({ decision: 'allow' })).toEqual({ decision: 'allow' });
    expect(
      PostLoginHookResultSchema.parse({ decision: 'deny', reason: 'blocked country' }).reason,
    ).toBe('blocked country');
    expect(() =>
      PostLoginHookResultSchema.parse({ decision: 'allow', claims: { tenant: 'acme' } }),
    ).toThrow();
  });

  it('lets a pre_token hook add claims', () => {
    expect(
      PreTokenHookResultSchema.parse({ decision: 'allow', claims: { tenant: 'acme' } }).claims,
    ).toEqual({ tenant: 'acme' });
  });

  it('refuses an unknown decision, and a missing one', () => {
    expect(() => PreTokenHookResultSchema.parse({ decision: 'maybe' })).toThrow();
    expect(() => PreTokenHookResultSchema.parse({})).toThrow();
  });

  it('bounds the user message, which is shown on the sign-in screen', () => {
    expect(() =>
      PostLoginHookResultSchema.parse({ decision: 'deny', userMessage: 'x'.repeat(201) }),
    ).toThrow();
  });
});

describe('LoginHookCallSchema', () => {
  it('carries no token, code or secret', () => {
    const call = LoginHookCallSchema.parse({
      id: 'i',
      trigger: 'pre_token',
      timestamp: '2026-11-07T12:00:00.000Z',
      user: { id: 'u', email: 'a@example.com', phone: null, roles: ['user'] },
      method: 'passkey',
      organization: null,
      client: null,
      request: { ipAddress: '203.0.113.9', userAgent: null },
      accessToken: 'eyJ...',
      refreshToken: 'r',
    });
    expect(Object.keys(call).sort()).toEqual(
      ['client', 'id', 'method', 'organization', 'request', 'timestamp', 'trigger', 'user'].sort(),
    );
  });
});
