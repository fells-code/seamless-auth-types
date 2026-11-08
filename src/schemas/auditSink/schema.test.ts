import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  AuditExportEventSchema,
  CreateAuditSinkRequestSchema,
  OtlpSinkSettingsSchema,
  SyslogSinkSettingsSchema,
  UpdateAuditSinkRequestSchema,
} from './schema.js';

describe('OTLP settings', () => {
  it('takes header values from env vars named for audit sink secrets', () => {
    const settings = OtlpSinkSettingsSchema.parse({
      kind: 'otlp',
      endpoint: 'https://otel.example.com:4318',
      headersFromEnv: { 'DD-API-KEY': 'DATADOG_AUDIT_SINK_SECRET' },
    });
    expect(settings.serviceName).toBe('seamless-auth');
  });

  // Naming any env var would let configuration send a secret the server holds for something
  // else, such as the database password, to a collector.
  it.each([
    'DATABASE_URL',
    'TOTP_SECRET_ENCRYPTION_KEY',
    'GOOGLE_CLIENT_SECRET',
    'x_AUDIT_SINK_SECRET',
  ])('refuses the env var %j', (envName) => {
    expect(() =>
      OtlpSinkSettingsSchema.parse({
        kind: 'otlp',
        endpoint: 'https://otel.example.com',
        headersFromEnv: { Authorization: envName },
      }),
    ).toThrow();
  });

  it.each(['Host', 'content-length', 'Transfer-Encoding', 'bad header'])(
    'refuses the header %j',
    (header) => {
      expect(() =>
        OtlpSinkSettingsSchema.parse({
          kind: 'otlp',
          endpoint: 'https://otel.example.com',
          headersFromEnv: { [header]: 'A_AUDIT_SINK_SECRET' },
        }),
      ).toThrow();
    },
  );
});

describe('syslog settings', () => {
  it('defaults to TLS on 6514 with the authpriv facility', () => {
    expect(SyslogSinkSettingsSchema.parse({ kind: 'syslog', host: 'siem.internal' })).toMatchObject(
      {
        port: 6514,
        transport: 'tls',
        facility: 10,
        appName: 'seamless-auth',
      },
    );
  });

  it('has no UDP transport', () => {
    expect(() =>
      SyslogSinkSettingsSchema.parse({ kind: 'syslog', host: 'siem.internal', transport: 'udp' }),
    ).toThrow();
  });
});

describe('sink requests', () => {
  it('picks settings by kind', () => {
    expect(() =>
      CreateAuditSinkRequestSchema.parse({ name: 's', settings: { kind: 'kafka' } }),
    ).toThrow();
    expect(
      CreateAuditSinkRequestSchema.parse({
        name: 's',
        settings: { kind: 'syslog', host: 'siem.internal' },
      }).enabled,
    ).toBe(true);
  });

  it('refuses an empty update', () => {
    expect(() => UpdateAuditSinkRequestSchema.parse({})).toThrow();
  });
});

describe('AuditExportEventSchema', () => {
  it('describes a line whose hash verifies from prevHash and payload alone', () => {
    const payload = '{"type":"login_success"}';
    const prevHash = 'a'.repeat(64);
    const hash = createHash('sha256').update(`${prevHash}${payload}`, 'utf8').digest('hex');

    const line = AuditExportEventSchema.parse({
      seq: 2,
      id: 'e',
      createdAt: '2026-11-07T12:00:00.000Z',
      type: 'login_success',
      userId: 'u',
      actorUserId: null,
      sessionId: null,
      attemptId: null,
      ipAddress: null,
      userAgent: null,
      deploymentId: null,
      deviceClass: null,
      mailProvider: null,
      owner: null,
      metadata: null,
      prevHash,
      hash,
      payload,
    });

    expect(
      createHash('sha256')
        .update(`${line.prevHash ?? ''}${line.payload}`)
        .digest('hex'),
    ).toBe(line.hash);
  });
});
