import { describe, it, expect } from 'vitest';
import {
  WebAuthnAssertionStartSchema,
  WebAuthnRegisterFinishSchema,
  WebAuthnRegisterStartQuerySchema,
} from './schema.js';

describe('WebAuthnRegisterStartQuerySchema', () => {
  it('coerces the string form query values', () => {
    const parsed = WebAuthnRegisterStartQuerySchema.parse({
      requestPrf: 'true',
      requirePrf: 'false',
    });

    expect(parsed.requestPrf).toBe(true);
    expect(parsed.requirePrf).toBe(false);
  });

  it('allows both flags to be absent', () => {
    expect(() => WebAuthnRegisterStartQuerySchema.parse({})).not.toThrow();
  });

  it('rejects a value that is neither boolean nor its string form', () => {
    expect(() => WebAuthnRegisterStartQuerySchema.parse({ requestPrf: 'yes' })).toThrow();
  });
});

describe('WebAuthnAssertionStartSchema', () => {
  it('defaults to an empty body', () => {
    expect(WebAuthnAssertionStartSchema.parse(undefined)).toEqual({});
  });

  it('parses a PRF request', () => {
    const parsed = WebAuthnAssertionStartSchema.parse({
      credentialId: 'credential-1',
      prf: { salt: 'c2FsdA==' },
    });

    expect(parsed.prf?.salt).toBe('c2FsdA==');
  });
});

describe('WebAuthnRegisterFinishSchema', () => {
  it('parses an attestation with metadata', () => {
    expect(() =>
      WebAuthnRegisterFinishSchema.parse({
        attestationResponse: { id: 'credential-1' },
        metadata: { friendlyName: 'Work laptop', prfCapable: true },
      }),
    ).not.toThrow();
  });

  it('requires the attestation response', () => {
    expect(() => WebAuthnRegisterFinishSchema.parse({})).toThrow();
  });
});
