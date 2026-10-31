import { describe, it, expect } from 'vitest';
import {
  AuthDeliverySchema,
  DeliveryResultSchema,
  EmailMessageSchema,
  SendEnrollmentInviteEmailInputSchema,
} from './schema.js';

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

  it('marks a code sent for account recovery, and still parses one without a purpose', () => {
    const parsed = AuthDeliverySchema.parse({
      kind: 'otp_sms',
      to: '+15555550100',
      token: '123456',
      purpose: 'account_recovery',
    });

    expect(parsed).toMatchObject({ purpose: 'account_recovery' });
    expect(() =>
      AuthDeliverySchema.parse({
        kind: 'otp_email',
        to: 'user@example.com',
        token: '1',
        purpose: 'sign_in',
      }),
    ).toThrow();
  });

  it('parses an account notice with its cancel link', () => {
    const parsed = AuthDeliverySchema.parse({
      kind: 'account_notice_email',
      notice: 'account_recovery_opened',
      to: 'user@example.com',
      subject: 'Account recovery requested',
      text: 'Cancel it: https://app.example.com/recovery/cancel#token',
      cancelUrl: 'https://app.example.com/recovery/cancel#token',
    });

    expect(parsed.kind).toBe('account_notice_email');
    expect(() =>
      AuthDeliverySchema.parse({
        kind: 'account_notice_sms',
        notice: 'recovery_code_used',
        to: '+15555550100',
        text: 'A recovery code was used.',
      }),
    ).not.toThrow();
  });

  it('rejects an account notice with an unknown name', () => {
    expect(() =>
      AuthDeliverySchema.parse({
        kind: 'account_notice_sms',
        notice: 'birthday',
        to: '+15555550100',
        text: 'hi',
      }),
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

describe('EmailMessageSchema', () => {
  const message = { to: 'user@example.com', subject: 'Hello', text: 'Hi' };

  it('parses a message without headers', () => {
    expect(EmailMessageSchema.parse(message).headers).toBeUndefined();
  });

  it('keeps custom headers', () => {
    const headers = {
      'List-Unsubscribe': '<https://example.com/unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };

    expect(EmailMessageSchema.parse({ ...message, headers }).headers).toEqual(headers);
  });

  it('rejects a header value that is not a string', () => {
    expect(() => EmailMessageSchema.parse({ ...message, headers: { 'X-Count': 1 } })).toThrow();
  });
});

describe('SendEnrollmentInviteEmailInputSchema', () => {
  it('parses an invite with only the required fields', () => {
    expect(() =>
      SendEnrollmentInviteEmailInputSchema.parse({
        to: 'user@example.com',
        signInUrl: 'https://example.com/sign-in',
      }),
    ).not.toThrow();
  });

  it('rejects an invite without a sign-in URL', () => {
    expect(() => SendEnrollmentInviteEmailInputSchema.parse({ to: 'user@example.com' })).toThrow();
  });
});
