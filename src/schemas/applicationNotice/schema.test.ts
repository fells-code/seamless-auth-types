import { describe, expect, it } from 'vitest';

import { AuthDeliverySchema } from '../messaging/schema.js';
import {
  ApplicationNoticeErrorResponseSchema,
  seamlessBuiltInResource,
  SendApplicationNoticeRequestSchema,
  SendApplicationNoticeResponseSchema,
} from './schema.js';

const userId = '3f0c1d2e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';

describe('SendApplicationNoticeRequestSchema', () => {
  it('accepts a notice to every verified channel', () => {
    const parsed = SendApplicationNoticeRequestSchema.parse({
      userId,
      subject: 'A licence moved to a new device',
      text: 'Your licence moved to a new device.\nCancel within 7 days if this was not you.',
      actionUrl: 'https://app.example.com/devices',
    });

    expect(parsed.channels).toBeUndefined();
  });

  it('accepts a named channel list', () => {
    const parsed = SendApplicationNoticeRequestSchema.parse({
      userId,
      channels: ['sms'],
      subject: 'Payout account changed',
      text: 'Your payout account changed.',
    });

    expect(parsed.channels).toEqual(['sms']);
  });

  it.each([
    ['a subject with a line break', { subject: 'Hi\r\nBcc: someone@example.com' }],
    ['text with a control character', { text: 'Hello\u0007' }],
    ['an empty subject', { subject: '   ' }],
    ['an overlong subject', { subject: 'x'.repeat(121) }],
    ['overlong text', { text: 'x'.repeat(2001) }],
    ['an http action link', { actionUrl: 'http://app.example.com/devices' }],
    ['a javascript action link', { actionUrl: 'javascript:alert(1)' }],
    ['repeated channels', { channels: ['email', 'email'] }],
    ['an empty channel list', { channels: [] }],
    ['an unknown channel', { channels: ['push'] }],
    ['a user id that is not a uuid', { userId: 'user-1' }],
  ])('refuses %s', (_label, override) => {
    const result = SendApplicationNoticeRequestSchema.safeParse({
      userId,
      subject: 'Subject',
      text: 'Text',
      ...override,
    });

    expect(result.success).toBe(false);
  });
});

describe('SendApplicationNoticeResponseSchema', () => {
  it('carries channels and, for a caller that owns delivery, the deliveries', () => {
    const parsed = SendApplicationNoticeResponseSchema.parse({
      channels: [{ channel: 'email', status: 'returned_for_external_delivery' }],
      deliveries: [
        {
          kind: 'account_notice_email',
          notice: 'application_notice',
          to: 'owner@example.com',
          subject: 'Subject',
          text: 'Text',
          application: { clientId: 'locksley', name: 'Locksley' },
        },
      ],
    });

    expect(parsed.deliveries?.[0]).toMatchObject({ application: { name: 'Locksley' } });
  });

  it('refuses an unknown status', () => {
    expect(
      SendApplicationNoticeResponseSchema.safeParse({
        channels: [{ channel: 'email', status: 'queued' }],
      }).success,
    ).toBe(false);
  });
});

describe('application notice deliveries', () => {
  it('keeps the application on an SMS notice', () => {
    const parsed = AuthDeliverySchema.parse({
      kind: 'account_notice_sms',
      notice: 'application_notice',
      to: '+15555550100',
      text: 'Text',
      application: { clientId: 'locksley', name: 'Locksley' },
    });

    expect(parsed).toMatchObject({ application: { clientId: 'locksley' } });
  });
});

describe('ApplicationNoticeErrorResponseSchema', () => {
  it('accepts the rate limit code', () => {
    expect(ApplicationNoticeErrorResponseSchema.parse({ error: 'notice_rate_limited' }).error).toBe(
      'notice_rate_limited',
    );
  });
});

describe('seamlessBuiltInResource', () => {
  it('appends /seamless to the provider issuer', () => {
    expect(seamlessBuiltInResource('https://login.example.com/')).toBe(
      'https://login.example.com/seamless',
    );
  });
});
