import { describe, it, expect } from 'vitest';
import {
  DashboardMetricsQuerySchema,
  DashboardMetricsResponseSchema,
  MetricsQuerySchema,
  PartialAuthEventSchema,
  SecurityAnomaliesQuerySchema,
  SecurityAnomaliesResponseSchema,
} from './schema.js';

describe('MetricsQuerySchema', () => {
  it('defaults the interval to hour', () => {
    expect(MetricsQuerySchema.parse({}).interval).toBe('hour');
  });

  it('accepts a bounded range', () => {
    expect(() =>
      MetricsQuerySchema.parse({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-08T00:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('rejects an unparseable date', () => {
    expect(() => MetricsQuerySchema.parse({ from: 'yesterday' })).toThrow();
  });

  it('rejects a reversed range', () => {
    expect(() =>
      MetricsQuerySchema.parse({
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('rejects a range wider than the maximum window', () => {
    expect(() =>
      MetricsQuerySchema.parse({
        from: '2024-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('rejects an unknown interval', () => {
    expect(() => MetricsQuerySchema.parse({ interval: 'minute' })).toThrow();
  });
});

describe('PartialAuthEventSchema', () => {
  it('parses a row with only the fields the store returned', () => {
    expect(() => PartialAuthEventSchema.parse({ type: 'login_failed' })).not.toThrow();
  });

  it('parses an empty row', () => {
    expect(() => PartialAuthEventSchema.parse({})).not.toThrow();
  });
});

describe('DashboardMetricsQuerySchema', () => {
  it('accepts no range, which servers treat as the last 24 hours', () => {
    expect(DashboardMetricsQuerySchema.parse({})).toEqual({});
  });

  it('validates the range the same way the other metrics queries do', () => {
    expect(() =>
      DashboardMetricsQuerySchema.parse({
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
    expect(() => DashboardMetricsQuerySchema.parse({ to: 'tomorrow' })).toThrow();
    expect(() =>
      DashboardMetricsQuerySchema.parse({
        from: '2024-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });
});

describe('SecurityAnomaliesQuerySchema', () => {
  it('pages 200 at a time from the start by default', () => {
    expect(SecurityAnomaliesQuerySchema.parse({})).toEqual({ limit: 200, offset: 0 });
  });

  it('coerces query-string paging and bounds it', () => {
    expect(SecurityAnomaliesQuerySchema.parse({ limit: '50', offset: '100' })).toEqual({
      limit: 50,
      offset: 100,
    });
    expect(() => SecurityAnomaliesQuerySchema.parse({ limit: '500' })).toThrow();
    expect(() => SecurityAnomaliesQuerySchema.parse({ offset: '-1' })).toThrow();
  });

  it('rejects a reversed range', () => {
    expect(() =>
      SecurityAnomaliesQuerySchema.parse({
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });
});

describe('ranged metrics responses', () => {
  const fixed = {
    totalUsers: 10,
    activeSessions: 4,
    newUsers24h: 1,
    loginSuccess24h: 9,
    loginFailed24h: 1,
    successRate24h: 90,
    otpUsage24h: 2,
    passkeyUsage24h: 7,
    databaseSize: 1024,
  };

  it('still parses a dashboard response from a server without ranges', () => {
    expect(DashboardMetricsResponseSchema.parse(fixed)).toEqual(fixed);
  });

  it('carries the window and the ranged figures alongside the 24 hour ones', () => {
    const ranged = {
      ...fixed,
      window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-08T00:00:00.000Z' },
      newUsers: 5,
      loginSuccess: 60,
      loginFailed: 4,
      successRate: 93.75,
      otpUsage: 10,
      passkeyUsage: 50,
    };

    expect(DashboardMetricsResponseSchema.parse(ranged)).toEqual(ranged);
  });

  it('still parses an anomalies response from a server without ranges', () => {
    expect(SecurityAnomaliesResponseSchema.parse({ suspiciousEvents: [], total: 0 })).toEqual({
      suspiciousEvents: [],
      total: 0,
    });
  });
});
