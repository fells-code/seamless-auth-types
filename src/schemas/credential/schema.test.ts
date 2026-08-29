import { describe, it, expect } from 'vitest';
import { CredentialResponseSchema, CredentialSchema } from './schema.js';

const now = new Date().toISOString();

describe('CredentialSchema', () => {
  const baseCredential = {
    id: 'credential_id_base64url',
    userId: crypto.randomUUID(),
    publicKey: 'public_key_base64url',
    counter: 0,
    transports: ['internal'],
    deviceType: 'singleDevice',
    backedUp: false,
    friendlyName: 'My Device',
    lastUsedAt: now,
    platform: 'ios',
    browser: 'safari',
    deviceInfo: 'iPhone',
    createdAt: now,
    updatedAt: now,
  };

  it('parses a valid credential', () => {
    expect(() => CredentialSchema.parse(baseCredential)).not.toThrow();
  });

  it('fails when required fields are missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = baseCredential;

    expect(() => CredentialSchema.parse(rest)).toThrow();
  });

  it('fails when publicKey is not a string', () => {
    expect(() =>
      CredentialSchema.parse({
        ...baseCredential,
        publicKey: 123,
      }),
    ).toThrow();
  });

  it('allows optional metadata fields to be omitted', () => {
    const { ...minimal } = baseCredential;

    expect(() => CredentialSchema.parse(minimal)).not.toThrow();
  });

  it('allows nullable optional fields', () => {
    expect(() =>
      CredentialSchema.parse({
        ...baseCredential,
        friendlyName: null,
        platform: null,
        browser: null,
        deviceInfo: null,
      }),
    ).not.toThrow();
  });

  it('allows missing transports', () => {
    const { ...rest } = baseCredential;

    expect(() => CredentialSchema.parse(rest)).not.toThrow();
  });

  it('fails on invalid transport value', () => {
    expect(() =>
      CredentialSchema.parse({
        ...baseCredential,
        transports: ['invalid'],
      }),
    ).toThrow();
  });

  it('fails on invalid deviceType', () => {
    expect(() =>
      CredentialSchema.parse({
        ...baseCredential,
        deviceType: 'invalidType',
      }),
    ).toThrow();
  });

  it('fails on invalid ISO date', () => {
    expect(() =>
      CredentialSchema.parse({
        ...baseCredential,
        createdAt: 'not-a-date',
      }),
    ).toThrow();
  });

  it('allows lastUsedAt to be omitted', () => {
    const { ...rest } = baseCredential;

    expect(() => CredentialSchema.parse(rest)).not.toThrow();
  });
});

describe('credential aaguid', () => {
  const base = {
    id: 'cred-1',
    backedUp: false,
    backedup: false,
    counter: 0,
    createdAt: '2026-08-29T00:00:00.000Z',
  };

  it('parses a credential registered before the field existed', () => {
    expect(CredentialResponseSchema.parse(base).aaguid).toBeUndefined();
  });

  it('carries the authenticator model when one was reported', () => {
    const parsed = CredentialResponseSchema.parse({
      ...base,
      aaguid: 'ee882879-721c-4913-9775-3dfcce97072a',
    });

    expect(parsed.aaguid).toBe('ee882879-721c-4913-9775-3dfcce97072a');
  });

  it('accepts an authenticator that declined to identify itself', () => {
    const parsed = CredentialResponseSchema.parse({
      ...base,
      aaguid: '00000000-0000-0000-0000-000000000000',
    });

    expect(parsed.aaguid).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('accepts an explicit null', () => {
    expect(CredentialResponseSchema.parse({ ...base, aaguid: null }).aaguid).toBeNull();
  });
});
