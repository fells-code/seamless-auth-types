---
'@seamless-auth/types': minor
---

Add the schemas for cutting an organization over from a legacy OAuth identity provider.

- `OAuthProviderConfigSchema` gains `promptPasskeyEnrollment` (default `false`). With it set, `OAuthLoginSuccessResponseSchema` carries `nextStep: 'enroll_passkey'` after a sign-in by a user with no passkey.
- `OrganizationSchema` gains optional `retiredOAuthProviders`, and `OrganizationOAuthProviderParamSchema` describes the admin retirement path.
- `OAUTH_ERROR_CODES` gains `oauth_provider_retired` and `oauth_invalid_id_token` (already returned by the API since 0.16.0).
- `AUTH_EVENT_TYPES` gains `admin_oauth_provider_retired` and `admin_oauth_provider_restored`.

Code that maps every `OAuthErrorCode` exhaustively (for example `Record<OAuthErrorCode, string>`) needs entries for the two new codes.
