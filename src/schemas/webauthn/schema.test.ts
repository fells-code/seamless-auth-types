import { describe, it, expect } from 'vitest';
import {
  WEBAUTHN_ERROR_CODES,
  WebAuthnAssertionStartSchema,
  WebAuthnErrorCodeSchema,
  WebAuthnRegisterFinishSchema,
  WebAuthnRegisterStartQuerySchema,
} from './schema.js';
import type { WebAuthnErrorCode } from './schema.js';

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

describe('WebAuthnErrorCodeSchema', () => {
  it('accepts every published code', () => {
    for (const code of WEBAUTHN_ERROR_CODES) {
      expect(WebAuthnErrorCodeSchema.parse(code)).toBe(code);
    }
  });

  it('rejects a code it does not publish', () => {
    expect(() => WebAuthnErrorCodeSchema.parse('not_a_real_code')).toThrow();
  });

  // The point of publishing the union: a consumer's own map is checked against it
  // and stops compiling when the API adds a code. This asserts the union and the
  // list stay in step, which is what makes that check meaningful.
  it('keeps the union and the list in step', () => {
    const everyCode: Record<WebAuthnErrorCode, true> = {
      attachment_not_allowed: true,
      synced_passkey_not_allowed: true,
      authenticator_not_allowed: true,
      prf_required: true,
      prf_output_not_allowed: true,
    };

    expect(Object.keys(everyCode).sort()).toEqual([...WEBAUTHN_ERROR_CODES].sort());
  });
});
