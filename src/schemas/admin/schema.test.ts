import { describe, it, expect } from 'vitest';
import { DeviceReplacementRecoverySchema } from './schema.js';

describe('DeviceReplacementRecoverySchema', () => {
  it('clears everything by default', () => {
    expect(DeviceReplacementRecoverySchema.parse({})).toEqual({
      revokeSessions: true,
      removePasskeys: true,
      disableTotp: true,
    });
  });

  it('allows opting a step out', () => {
    expect(DeviceReplacementRecoverySchema.parse({ disableTotp: false }).disableTotp).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(() => DeviceReplacementRecoverySchema.parse({ removeUser: true })).toThrow();
  });
});
