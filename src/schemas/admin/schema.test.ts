import { describe, it, expect } from 'vitest';
import { DeviceReplacementRecoverySchema, RecoveryProofingSchema } from './schema.js';

const validProofing = { method: 'in_person' as const, evidenceRef: 'TICKET-1042' };

describe('DeviceReplacementRecoverySchema', () => {
  it('clears everything by default', () => {
    expect(DeviceReplacementRecoverySchema.parse({ proofing: validProofing })).toEqual({
      revokeSessions: true,
      removePasskeys: true,
      disableTotp: true,
      proofing: validProofing,
    });
  });

  it('allows opting a step out', () => {
    expect(
      DeviceReplacementRecoverySchema.parse({ proofing: validProofing, disableTotp: false })
        .disableTotp,
    ).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(() =>
      DeviceReplacementRecoverySchema.parse({ proofing: validProofing, removeUser: true }),
    ).toThrow();
  });
});

describe('RecoveryProofingSchema', () => {
  it('accepts in-person proofing without an approver', () => {
    const parsed = RecoveryProofingSchema.safeParse({
      method: 'in_person',
      evidenceRef: 'TICKET-1042',
    });

    expect(parsed.success).toBe(true);
  });

  it('requires a named approver for a remote exception', () => {
    const parsed = RecoveryProofingSchema.safeParse({
      method: 'remote_exception',
      evidenceRef: 'TICKET-1042',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(['approver']);
    }
  });

  it('accepts a remote exception once an approver is named', () => {
    const parsed = RecoveryProofingSchema.safeParse({
      method: 'remote_exception',
      evidenceRef: 'TICKET-1042',
      approver: 'j.reyes',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown method', () => {
    expect(
      RecoveryProofingSchema.safeParse({ method: 'vibes', evidenceRef: 'TICKET-1042' }).success,
    ).toBe(false);
  });

  it('rejects a blank evidence reference', () => {
    expect(
      RecoveryProofingSchema.safeParse({ method: 'in_person', evidenceRef: '   ' }).success,
    ).toBe(false);
  });
});

describe('DeviceReplacementRecoverySchema proofing requirement', () => {
  it('refuses a recovery that records no proofing', () => {
    expect(DeviceReplacementRecoverySchema.safeParse({}).success).toBe(false);
  });
});
