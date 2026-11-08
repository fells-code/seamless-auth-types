import { describe, it, expect } from 'vitest';
import { CalloutFailureSchema, CalloutTestResponseSchema } from './schema.js';

describe('CalloutFailureSchema', () => {
  it('tells a destination that cannot be used apart from one that may not be reached', () => {
    expect(CalloutFailureSchema.parse('misconfigured')).toBe('misconfigured');
    expect(CalloutFailureSchema.parse('refused')).toBe('refused');
    expect(() => CalloutFailureSchema.parse('unknown')).toThrow();
  });

  it('reports a test call that never connected', () => {
    const result = { ok: false, failure: 'misconfigured', statusCode: null, durationMs: 0 };
    expect(CalloutTestResponseSchema.parse(result)).toEqual(result);
  });
});
