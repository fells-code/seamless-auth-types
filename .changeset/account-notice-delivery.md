---
'@seamless-auth/types': minor
---

External delivery for account notices, and the missing auth event names.

- `AuthDeliverySchema` gains `account_notice_email` and `account_notice_sms`, so a server that owns delivery can send the owner notices the auth API sends directly today. Each carries a `notice` name (`AccountNoticeNameSchema`: `account_recovery_opened`, `account_recovery_completed`, `recovery_code_used`, `identity_changed`), ready-to-send `text` (and `subject` for email), and, for a recovery that has opened, `cancelUrl`, which carries a credential and must reach only `to`.
- `otp_email` and `otp_sms` take an optional `purpose` (`DeliveryPurposeSchema`, currently `account_recovery`), so a server can word a recovery code as a recovery warning. A server that ignores it still delivers the code.
- `AUTH_EVENT_TYPES` adds `account_recovery_failed`, `admin_last_admin_change_refused`, `break_glass_enrollment`, `magic_link_confirmation_required`, `session_evicted` and `webauthn_registration_challenge`, which the auth API already emits.

Breaking for exhaustive handling: code that switches over every `AuthDeliveryInstruction` kind needs cases for the two new kinds.
