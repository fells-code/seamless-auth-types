import { describe, it, expect } from 'vitest';
import { StepUpStatusSchema, StepUpSuccessSchema } from './schema.js';

describe('StepUpStatusSchema', () => {
  it('parses a user who has never stepped up', () => {
    expect(() =>
      StepUpStatusSchema.parse({
        fresh: false,
        method: null,
        verifiedAt: null,
        expiresAt: null,
        maxAgeSeconds: 300,
      }),
    ).not.toThrow();
  });

  it('rejects an unknown method', () => {
    expect(() =>
      StepUpStatusSchema.parse({
        fresh: true,
        method: 'sms',
        verifiedAt: null,
        expiresAt: null,
        maxAgeSeconds: 300,
      }),
    ).toThrow();
  });
});

describe('StepUpSuccessSchema', () => {
  it('requires a method and timestamps', () => {
    expect(() =>
      StepUpSuccessSchema.parse({
        message: 'ok',
        fresh: true,
        method: null,
        verifiedAt: null,
        expiresAt: null,
        maxAgeSeconds: 300,
      }),
    ).toThrow();
  });
});
