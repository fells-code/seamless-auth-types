import { describe, expect, it } from 'vitest';
import {
  AdminEnrollmentQuerySchema,
  EnrollmentInviteRequestSchema,
  EnrollmentInviteResultSchema,
  EnrollmentUserSchema,
} from './schema.js';

const userId = crypto.randomUUID();

describe('EnrollmentInviteRequestSchema', () => {
  it('accepts a list of users and defaults to inviting the unenrolled', () => {
    const parsed = EnrollmentInviteRequestSchema.parse({ userIds: [userId] });

    expect(parsed.status).toBe('none');
  });

  it('accepts a whole organization', () => {
    expect(() =>
      EnrollmentInviteRequestSchema.parse({ organizationId: userId, status: 'one' }),
    ).not.toThrow();
  });

  it.each([{}, { userIds: [userId], organizationId: userId }])(
    'requires exactly one target: %j',
    (body) => {
      expect(() => EnrollmentInviteRequestSchema.parse(body)).toThrow();
    },
  );

  it('does not invite users who already have two authenticators', () => {
    expect(() =>
      EnrollmentInviteRequestSchema.parse({ userIds: [userId], status: 'two_or_more' }),
    ).toThrow();
  });

  it('refuses a sign-in URL that cannot be a link destination', () => {
    expect(() =>
      EnrollmentInviteRequestSchema.parse({ userIds: [userId], signInUrl: 'javascript:alert(1)' }),
    ).toThrow();
  });

  it('caps a list at 200 users', () => {
    const userIds = Array.from({ length: 201 }, () => crypto.randomUUID());

    expect(() => EnrollmentInviteRequestSchema.parse({ userIds })).toThrow();
  });
});

describe('AdminEnrollmentQuerySchema', () => {
  it('reads query strings', () => {
    const parsed = AdminEnrollmentQuerySchema.parse({
      imported: 'true',
      status: 'none',
      limit: '25',
    });

    expect(parsed).toMatchObject({ imported: true, status: 'none', limit: 25, offset: 0 });
  });
});

describe('enrollment results', () => {
  it('carries an external delivery for the caller to send', () => {
    const parsed = EnrollmentInviteResultSchema.parse({
      userId,
      status: 'sent',
      delivery: {
        kind: 'enrollment_invite_email',
        to: 'person@example.com',
        signInUrl: 'https://app.example.com/login',
      },
    });

    expect(parsed.delivery?.kind).toBe('enrollment_invite_email');
  });

  it('accepts a user who was never invited or never signed in', () => {
    expect(() =>
      EnrollmentUserSchema.parse({
        id: userId,
        email: 'person@example.com',
        imported: true,
        credentialCount: 0,
        status: 'none',
        lastLogin: null,
        enrollmentInvitedAt: null,
      }),
    ).not.toThrow();
  });
});
