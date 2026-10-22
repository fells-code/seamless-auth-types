---
'@seamless-auth/types': minor
---

Schemas for the v0.20 recovery and staged policy work in seamless-auth-api.

- Recovery codes: `RecoveryCodeSchema`, `RecoveryCodesStatusSchema`, `RecoveryCodesGeneratedSchema`, `RecoveryCodeRedeemRequestSchema`.
- Self-service account recovery: `AccountRecoveryStartRequestSchema`, `AccountRecoveryVerifyRequestSchema`, `AccountRecoveryStatusSchema`, `AccountRecoveryCancelRequestSchema` and friends.
- `RecoverySessionResponseSchema` for the restricted session a recovery issues (`recovery: true`, `nextStep: 'enroll_passkey'`). Session responses gain an optional `recovery` flag.
- Staged policy: `POLICY_KEYS`, `PolicyDocumentSchema`, `PolicyVersionSchema`, `PolicyDraftSchema`, `PolicyStateResponseSchema`, publish, rollback and versions schemas, and `PolicyDryRunRequestSchema` / `PolicyDryRunResponseSchema`.
- System config gains `recovery_codes` (on by default) and `account_recovery` (off by default, 24h delay, 1h to 30d), both patchable. `PublicSystemConfigResponseSchema` gains optional `recoveryCodes` and `accountRecovery`.
- New auth event types for recovery codes, account recovery, break-glass sign-in and policy changes.

All additions are optional or defaulted, so existing payloads still parse.
