import { describe, it, expect } from 'vitest';
import {
  LoginRequestSchema,
  LoginSuccessResponseSchema,
  MagicLinkPollSuccessSchema,
  OTPVerifyTokenSuccessSchema,
  RefreshSuccessResponseSchema,
  RegistrationRequestSchema,
  RegistrationSuccessSchema,
} from './auth.schema.js';

describe('LoginRequestSchema', () => {
  it('parses an identifier alone', () => {
    expect(() => LoginRequestSchema.parse({ identifier: 'user@example.com' })).not.toThrow();
  });

  it('carries the passkey capability hint', () => {
    const parsed = LoginRequestSchema.parse({
      identifier: 'user@example.com',
      passkeyAvailable: true,
    });

    expect(parsed.passkeyAvailable).toBe(true);
  });
});

describe('LoginSuccessResponseSchema', () => {
  it('parses the offered login methods', () => {
    const parsed = LoginSuccessResponseSchema.parse({
      message: 'Challenge issued',
      identifierType: 'email',
      loginMethods: ['passkey', 'email_otp'],
    });

    expect(parsed.loginMethods).toEqual(['passkey', 'email_otp']);
  });

  it('rejects an unknown login method', () => {
    expect(() =>
      LoginSuccessResponseSchema.parse({ message: 'ok', loginMethods: ['carrier'] }),
    ).toThrow();
  });

  it('rejects an unknown identifier type', () => {
    expect(() =>
      LoginSuccessResponseSchema.parse({ message: 'ok', identifierType: 'username' }),
    ).toThrow();
  });
});

describe('RefreshSuccessResponseSchema', () => {
  it('requires only a message', () => {
    expect(() => RefreshSuccessResponseSchema.parse({ message: 'ok' })).not.toThrow();
  });

  it('allows a null organization id', () => {
    expect(() =>
      RefreshSuccessResponseSchema.parse({ message: 'ok', organizationId: null }),
    ).not.toThrow();
  });
});

describe('token envelopes derived from the refresh response', () => {
  it('drops sessionId from the OTP completion', () => {
    expect(OTPVerifyTokenSuccessSchema.shape).not.toHaveProperty('sessionId');
  });

  it('drops sessionId and organizationId from the magic link poll', () => {
    expect(MagicLinkPollSuccessSchema.shape).not.toHaveProperty('sessionId');
    expect(MagicLinkPollSuccessSchema.shape).not.toHaveProperty('organizationId');
  });
});

describe('RegistrationRequestSchema', () => {
  it('accepts an email alone', () => {
    expect(() => RegistrationRequestSchema.parse({ email: 'user@example.com' })).not.toThrow();
  });

  it('accepts a null phone', () => {
    expect(() =>
      RegistrationRequestSchema.parse({ email: 'user@example.com', phone: null }),
    ).not.toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() => RegistrationRequestSchema.parse({ email: 'nope' })).toThrow();
  });
});

describe('RegistrationSuccessSchema', () => {
  const base = { message: 'Registration started', sub: 'user-123', token: 't' };

  it('accepts a ttl in seconds', () => {
    expect(() => RegistrationSuccessSchema.parse({ ...base, ttl: 300 })).not.toThrow();
  });

  // This field was a string, which is what the API sent. It was the only ttl in
  // this file a consumer could not treat like the others, and handing a string
  // to a cookie library that requires an integer fails the request.
  it('rejects a ttl as a string, the way every other ttl here does', () => {
    expect(() => RegistrationSuccessSchema.parse({ ...base, ttl: '300' })).toThrow();
    expect(() => LoginSuccessResponseSchema.parse({ message: 'ok', ttl: '300' })).toThrow();
  });

  it('leaves the ttl optional', () => {
    expect(() => RegistrationSuccessSchema.parse(base)).not.toThrow();
  });
});
