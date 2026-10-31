---
'@seamless-auth/types': minor
---

`EmailMessageSchema` accepts an optional `headers` record of string names to string values, such as `List-Unsubscribe` and `List-Unsubscribe-Post` for one-click unsubscribe. The inferred `EmailMessage` type gains the optional `headers` field. `@seamless-auth/messaging` already sends these through SES v2 and validates the names and values there.

New `SendEnrollmentInviteEmailInputSchema` and `SendEnrollmentInviteEmailInput`: the input for the email that asks a user to sign in and add a passkey. `signInUrl` is the application's normal sign-in page and carries no credential.
