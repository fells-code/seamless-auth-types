import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  CreateWebhookEndpointRequestSchema,
  UpdateWebhookEndpointRequestSchema,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_RETRY_SCHEDULE_SECONDS,
  WEBHOOK_TEST_EVENT_TYPE,
  WebhookDeliveryQuerySchema,
  WebhookEndpointCreatedResponseSchema,
  WebhookEventSchema,
} from './schema.js';
import { CalloutSecretSchema, CalloutUrlSchema } from '../callout/schema.js';

const event = (type: string, data: unknown) => ({
  id: '0b6b1c1e-2f0a-4c5b-9a43-0d9f3c7e1a10',
  type,
  version: 1,
  timestamp: '2026-11-07T12:00:00.000Z',
  data,
});

describe('constants module', () => {
  it('stays free of Zod so a verifier can import it without the dependency', () => {
    const source = readFileSync(new URL('./constants.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from ['"]zod/);
  });

  it('dead-letters under 42 hours after the event', () => {
    const total = WEBHOOK_RETRY_SCHEDULE_SECONDS.reduce((sum, delay) => sum + delay, 0);
    expect(WEBHOOK_RETRY_SCHEDULE_SECONDS).toHaveLength(8);
    expect(WEBHOOK_RETRY_SCHEDULE_SECONDS[0]).toBe(0);
    expect(total / 3600).toBeGreaterThan(41);
    expect(total / 3600).toBeLessThan(42);
  });
});

describe('WebhookEventSchema', () => {
  it('has a payload schema for every catalog type and the test type', () => {
    const samples: Record<string, unknown> = {
      'user.created': { userId: 'u', email: 'a@example.com', phone: null },
      'user.deleted': { userId: 'u' },
      'user.signed_in': { userId: 'u', sessionId: 's', method: 'passkey', organizationId: null },
      'user.recovered': { userId: 'u' },
      'session.revoked': { userId: 'u', sessionId: 's', reason: 'logout' },
      'credential.added': { userId: 'u', kind: 'passkey', credentialId: 'c' },
      'credential.removed': { userId: 'u', kind: 'totp', credentialId: null },
      'organization.member_added': { organizationId: 'o', userId: 'u', roles: ['member'] },
      'organization.member_updated': { organizationId: 'o', userId: 'u', roles: ['admin'] },
      'organization.member_removed': { organizationId: 'o', userId: 'u', roles: [] },
      [WEBHOOK_TEST_EVENT_TYPE]: { endpointId: 'e' },
    };

    expect(Object.keys(samples).sort()).toEqual(
      [...WEBHOOK_EVENT_TYPES, WEBHOOK_TEST_EVENT_TYPE].sort(),
    );
    for (const [type, data] of Object.entries(samples)) {
      expect(WebhookEventSchema.parse(event(type, data)).type).toBe(type);
    }
  });

  it('refuses an unknown type, a payload of the wrong shape and another version', () => {
    expect(() => WebhookEventSchema.parse(event('user.renamed', { userId: 'u' }))).toThrow();
    expect(() => WebhookEventSchema.parse(event('user.deleted', {}))).toThrow();
    expect(() =>
      WebhookEventSchema.parse({ ...event('user.deleted', { userId: 'u' }), version: 2 }),
    ).toThrow();
  });

  it('keeps network detail out of sign-in payloads', () => {
    const parsed = WebhookEventSchema.parse(
      event('user.signed_in', {
        userId: 'u',
        sessionId: 's',
        method: 'otp',
        organizationId: null,
        ipAddress: '203.0.113.9',
      }),
    );
    expect(parsed.data).not.toHaveProperty('ipAddress');
  });
});

describe('endpoint requests', () => {
  it('needs at least one event type, without repeats, and never the test type', () => {
    const base = { url: 'https://hooks.example.com/seamless' };
    expect(() => CreateWebhookEndpointRequestSchema.parse({ ...base, eventTypes: [] })).toThrow();
    expect(() =>
      CreateWebhookEndpointRequestSchema.parse({
        ...base,
        eventTypes: ['user.created', 'user.created'],
      }),
    ).toThrow();
    expect(() =>
      CreateWebhookEndpointRequestSchema.parse({ ...base, eventTypes: [WEBHOOK_TEST_EVENT_TYPE] }),
    ).toThrow();
    expect(
      CreateWebhookEndpointRequestSchema.parse({ ...base, eventTypes: ['user.created'] })
        .eventTypes,
    ).toEqual(['user.created']);
  });

  it('refuses an empty update', () => {
    expect(() => UpdateWebhookEndpointRequestSchema.parse({})).toThrow();
    expect(UpdateWebhookEndpointRequestSchema.parse({ enabled: false })).toEqual({
      enabled: false,
    });
  });

  it('caps a delivery page at 100', () => {
    expect(WebhookDeliveryQuerySchema.parse({}).limit).toBe(50);
    expect(() => WebhookDeliveryQuerySchema.parse({ limit: '101' })).toThrow();
  });
});

describe('CalloutUrlSchema', () => {
  it.each(['https://hooks.example.com/a', 'http://hook.internal:8080/b'])('accepts %j', (url) => {
    expect(CalloutUrlSchema.parse(url)).toBe(url);
  });

  it.each([
    'not a url',
    'ftp://hooks.example.com/',
    'file:///etc/passwd',
    'https://user:pass@hooks.example.com/',
    'https://hooks.example.com/#frag',
    `https://example.com/${'a'.repeat(2048)}`,
  ])('rejects %j', (url) => {
    expect(() => CalloutUrlSchema.parse(url)).toThrow();
  });
});

describe('CalloutSecretSchema', () => {
  it('accepts a whsec_ secret of 32 bytes and nothing else', () => {
    const secret = `whsec_${Buffer.alloc(32, 7).toString('base64')}`;
    expect(CalloutSecretSchema.parse(secret)).toBe(secret);
    expect(() => CalloutSecretSchema.parse(Buffer.alloc(32).toString('base64'))).toThrow();
    expect(() =>
      CalloutSecretSchema.parse(`whsec_${Buffer.alloc(24).toString('base64')}`),
    ).toThrow();
  });

  it('is required on the created response', () => {
    const endpoint = {
      id: 'e',
      url: 'https://hooks.example.com/',
      description: null,
      eventTypes: ['user.created'],
      enabled: true,
      disabledReason: null,
      version: 1,
      previousSecretExpiresAt: null,
      createdAt: '2026-11-07T12:00:00.000Z',
      updatedAt: '2026-11-07T12:00:00.000Z',
    };
    expect(() => WebhookEndpointCreatedResponseSchema.parse({ endpoint })).toThrow();
  });
});
