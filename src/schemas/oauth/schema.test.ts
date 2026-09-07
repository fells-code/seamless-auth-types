import { describe, it, expect } from 'vitest';
import { OAuthLoginSuccessResponseSchema, StartOAuthLoginRequestSchema } from './schema.js';

describe('StartOAuthLoginRequestSchema', () => {
  it('accepts a returnTo', () => {
    expect(() =>
      StartOAuthLoginRequestSchema.parse({ returnTo: 'https://app.example.com/dashboard' }),
    ).not.toThrow();
  });

  it('refuses a returnTo that is not a URL', () => {
    expect(() => StartOAuthLoginRequestSchema.parse({ returnTo: '/dashboard' })).toThrow();
  });

  // z.url() accepts these, which is why RedirectTargetSchema exists. A client navigates
  // to whatever comes back out of the flow, so it is the same sink a magic link is.
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>'])(
    'refuses the %s scheme',
    (target) => {
      expect(() => StartOAuthLoginRequestSchema.parse({ returnTo: target })).toThrow();
    },
  );
});

describe('OAuthLoginSuccessResponseSchema', () => {
  const baseResponse = {
    message: 'Success',
    sub: crypto.randomUUID(),
    token: 'access-token',
    refreshToken: 'refresh-token',
  };

  it('carries returnTo back to the caller', () => {
    const parsed = OAuthLoginSuccessResponseSchema.parse({
      ...baseResponse,
      returnTo: 'https://app.example.com/dashboard',
    });

    expect(parsed.returnTo).toBe('https://app.example.com/dashboard');
  });

  // A caller that asked for nothing gets nothing back, and falls through to its own
  // default rather than treating the absence as a failure.
  it('leaves returnTo absent when none was requested', () => {
    const parsed = OAuthLoginSuccessResponseSchema.parse(baseResponse);

    expect(parsed.returnTo).toBeUndefined();
  });

  it('refuses a scheme that cannot be a link destination', () => {
    expect(() =>
      OAuthLoginSuccessResponseSchema.parse({ ...baseResponse, returnTo: 'javascript:alert(1)' }),
    ).toThrow();
  });
});
