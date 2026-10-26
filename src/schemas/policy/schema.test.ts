import { describe, expect, it } from 'vitest';

import { SystemConfigSchema } from '../systemConfig/schema.js';
import {
  POLICY_KEYS,
  PolicyDocumentSchema,
  PolicyDraftSaveRequestSchema,
  PolicyDryRunRequestSchema,
  PolicyDryRunResponseSchema,
  PolicyPublishRequestSchema,
  PolicyVersionSchema,
} from './schema.js';

const policy = {
  login_methods: ['passkey', 'magic_link'],
  passkey_login_fallback_enabled: true,
};

describe('PolicyDocumentSchema', () => {
  it('holds exactly the policy keys, with the config defaults', () => {
    const parsed = PolicyDocumentSchema.parse(policy);

    expect(Object.keys(parsed).sort()).toEqual([...POLICY_KEYS].sort());
    expect(parsed.recovery_codes).toEqual({ enabled: true, requireAtEnrollment: false });
    expect(parsed.account_recovery).toEqual({ enabled: false, delay: '24h' });
  });

  it('names only keys the system config has', () => {
    for (const key of POLICY_KEYS) {
      expect(SystemConfigSchema.shape).toHaveProperty(key);
    }
  });
});

describe('PolicyVersionSchema', () => {
  it('records where a version came from', () => {
    const parsed = PolicyVersionSchema.parse({
      version: 3,
      policy,
      source: 'rollback',
      publishedAt: '2026-10-22T00:00:00Z',
      publishedBy: 'admin-1',
      rolledBackTo: 1,
    });

    expect(parsed.rolledBackTo).toBe(1);
    expect(PolicyVersionSchema.safeParse({ ...parsed, source: 'manual' }).success).toBe(false);
  });
});

describe('policy requests', () => {
  it('refuses keys outside the policy document in a draft', () => {
    expect(PolicyDraftSaveRequestSchema.safeParse({ policy }).success).toBe(true);
    expect(PolicyDraftSaveRequestSchema.safeParse({ policy, rpid: 'evil.example' }).success).toBe(
      false,
    );
  });

  it('publishes only against the version that was reviewed', () => {
    expect(PolicyPublishRequestSchema.safeParse({}).success).toBe(false);
    expect(PolicyPublishRequestSchema.safeParse({ expectedVersion: 2 }).success).toBe(true);
  });

  it('dry-runs the last 7 days by default, at most 30', () => {
    expect(PolicyDryRunRequestSchema.parse({})).toEqual({ days: 7 });
    expect(PolicyDryRunRequestSchema.safeParse({ days: 31 }).success).toBe(false);
  });

  it('reports who would be refused and why', () => {
    const parsed = PolicyDryRunResponseSchema.parse({
      window: { from: '2026-10-15T00:00:00Z', to: '2026-10-22T00:00:00Z' },
      signInsEvaluated: 40,
      usersEvaluated: 12,
      wouldFail: [
        {
          userId: 'user-1',
          email: 'a@example.com',
          signIns: 3,
          reasons: ['phishing_resistant_required'],
          lockedOut: true,
        },
      ],
      usersLockedOut: 1,
      breakGlassAccounts: 1,
    });

    expect(parsed.wouldFail[0].reasons).toEqual(['phishing_resistant_required']);
    expect(parsed.capped).toBeUndefined();
  });

  it('says when the run was capped', () => {
    const parsed = PolicyDryRunResponseSchema.parse({
      window: { from: '2026-10-15T00:00:00Z', to: '2026-10-22T00:00:00Z' },
      signInsEvaluated: 0,
      usersEvaluated: 10000,
      wouldFail: [],
      usersLockedOut: 0,
      breakGlassAccounts: 0,
      capped: true,
    });

    expect(parsed.capped).toBe(true);
  });
});
