import { describe, it, expect } from 'vitest';
import { AuthDeliverySchema, DeliveryResultSchema } from './schema.js';

describe('AuthDeliverySchema', () => {
  it('parses an email OTP delivery', () => {
    expect(() =>
      AuthDeliverySchema.parse({ kind: 'otp_email', to: 'user@example.com', token: '123456' }),
    ).not.toThrow();
  });

  it('accepts a numeric SMS token', () => {
    const parsed = AuthDeliverySchema.parse({ kind: 'otp_sms', to: '+15555550100', token: 123456 });

    expect(parsed.token).toBe(123456);
  });

  it('allows a magic link without a token', () => {
    expect(() =>
      AuthDeliverySchema.parse({
        kind: 'magic_link_email',
        to: 'user@example.com',
        magicLinkUrl: 'https://example.com/magic',
      }),
    ).not.toThrow();
  });

  it('rejects an unknown kind', () => {
    expect(() =>
      AuthDeliverySchema.parse({ kind: 'carrier_pigeon', to: 'user@example.com' }),
    ).toThrow();
  });

  it('rejects a numeric token on an email OTP', () => {
    expect(() =>
      AuthDeliverySchema.parse({ kind: 'otp_email', to: 'user@example.com', token: 123456 }),
    ).toThrow();
  });
});

describe('DeliveryResultSchema', () => {
  it('parses a provider result', () => {
    expect(() =>
      DeliveryResultSchema.parse({ accepted: true, provider: 'ses', channel: 'email' }),
    ).not.toThrow();
  });

  it('rejects an unknown channel', () => {
    expect(() =>
      DeliveryResultSchema.parse({ accepted: true, provider: 'ses', channel: 'fax' }),
    ).toThrow();
  });
});
