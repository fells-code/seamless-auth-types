import { describe, it, expect } from 'vitest';
import { MetricsQuerySchema, PartialAuthEventSchema } from './schema.js';

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
