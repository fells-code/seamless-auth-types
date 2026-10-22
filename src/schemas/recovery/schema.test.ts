import { describe, expect, it } from 'vitest';

import {
  AccountRecoveryStartRequestSchema,
  AccountRecoveryStatusSchema,
  RecoveryCodeRedeemRequestSchema,
  RecoveryCodesGeneratedSchema,
  RecoveryCodesStatusSchema,
  RecoverySessionResponseSchema,
} from './schema.js';

describe('RecoveryCodeSchema', () => {
  it.each(['ABCDE-FGH23', 'abcde-fgh23', 'ABCDEFGH23', '  ABCDE-FGH23  '])('accepts %s', (code) => {
    expect(RecoveryCodeRedeemRequestSchema.safeParse({ code }).success).toBe(true);
  });

  it.each(['ABCDE-FGH1', 'ABCDE-FGH18', '123456', 'ABCD-EFGH23', ''])('refuses %s', (code) => {
    expect(RecoveryCodeRedeemRequestSchema.safeParse({ code }).success).toBe(false);
  });
});

describe('recovery codes', () => {
  it('reports no set before one is generated', () => {
    expect(
      RecoveryCodesStatusSchema.parse({ enabled: true, remaining: 0, total: 0, createdAt: null }),
    ).toEqual({ enabled: true, remaining: 0, total: 0, createdAt: null });
  });

  it('returns the codes once with when they were made', () => {
    const parsed = RecoveryCodesGeneratedSchema.parse({
      message: 'Success',
      codes: ['ABCDE-FGH23'],
      createdAt: '2026-10-22T00:00:00Z',
    });

    expect(parsed.createdAt).toBe('2026-10-22T00:00:00.000Z');
  });

  it('refuses an empty set', () => {
    expect(
      RecoveryCodesGeneratedSchema.safeParse({
        message: 'Success',
        codes: [],
        createdAt: '2026-10-22T00:00:00Z',
      }).success,
    ).toBe(false);
  });
});

describe('RecoverySessionResponseSchema', () => {
  it('is always restricted and always asks for enrollment', () => {
    expect(
      RecoverySessionResponseSchema.safeParse({
        message: 'Success',
        token: 'access',
        refreshToken: 'refresh',
        sub: 'user-1',
        recovery: true,
        nextStep: 'enroll_passkey',
      }).success,
    ).toBe(true);
    expect(
      RecoverySessionResponseSchema.safeParse({
        message: 'Success',
        recovery: false,
        nextStep: 'enroll_passkey',
      }).success,
    ).toBe(false);
    expect(
      RecoverySessionResponseSchema.safeParse({ message: 'Success', recovery: true }).success,
    ).toBe(false);
  });
});

describe('account recovery', () => {
  it('starts on email unless told otherwise', () => {
    expect(AccountRecoveryStartRequestSchema.parse({})).toEqual({ channel: 'email' });
    expect(AccountRecoveryStartRequestSchema.safeParse({ channel: 'fax' }).success).toBe(false);
  });

  it('reports the state and when the waiting period ends', () => {
    expect(
      AccountRecoveryStatusSchema.parse({
        state: 'pending',
        requestedAt: '2026-10-22T00:00:00Z',
        completesAt: '2026-10-23T00:00:00Z',
      }).completesAt,
    ).toBe('2026-10-23T00:00:00.000Z');
  });
});
