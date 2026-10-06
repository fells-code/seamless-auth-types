---
'@seamless-auth/types': minor
---

Add the schemas for tracking and inviting passkey enrollment (fells-code/seamless-auth-api#338).

- `EnrollmentStatusSchema` (`none`, `one`, `two_or_more`).
- `AdminEnrollmentQuerySchema` and `AdminEnrollmentResponseSchema`, for the enrollment list and its per-status summary, optionally scoped to one organization or to imported users.
- `EnrollmentInviteRequestSchema` and `EnrollmentInviteResponseSchema`, for inviting listed users or an organization's unenrolled members.
- `AuthDeliverySchema` gains `enrollment_invite_email` for external delivery.
- `AUTH_EVENT_TYPES` gains `admin_enrollment_invite_sent`.
- `SystemConfigSchema` gains `prompt_passkey_enrollment` (default `false`). With it set, `OTPVerifyTokenSuccessSchema` and `MagicLinkPollSuccessSchema` carry `nextStep: 'enroll_passkey'` for a user with no passkey.
- `NextStepSchema` is shared by those responses and by `OAuthLoginSuccessResponseSchema`.

Code that switches exhaustively over `AuthDeliverySchema`'s `kind` needs the new value.
