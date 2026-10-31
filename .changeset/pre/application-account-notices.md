---
'@seamless-auth/types': minor
---

Add schemas for account notices sent on a registered application's behalf (`POST /applications/account-notices`): the request (user, optional channels, subject, text, optional action link), the response (channels and their status, never addresses, plus `deliveries` for a caller that owns delivery), and the error codes. `account_notice_email` and `account_notice_sms` gain an optional `application` naming the sender, `AccountNoticeNameSchema` gains `application_notice`, and the auth events gain `oidc_account_notice_sent` and `oidc_account_notice_failed`. `APPLICATION_NOTICE_SCOPE` and `seamlessBuiltInResource` name the scope and the built-in resource a notices token is for. Code that switches exhaustively on `AccountNoticeName` needs a case for the new value.
