---
'@seamless-auth/types': minor
---

Publish a union for the WebAuthn error codes.

`WEBAUTHN_ERROR_CODES`, `WebAuthnErrorCodeSchema` and `WebAuthnErrorCode` cover
the machine-readable codes the auth API returns as the whole of an error body's
`error` field: `attachment_not_allowed`, `synced_passkey_not_allowed`,
`authenticator_not_allowed`, `prf_required` and `prf_output_not_allowed`.

This mirrors `OAUTH_ERROR_CODES` and exists for the same reason. A consumer that
declares its own copy of the list has no way to find out when the API adds a
code: it degrades to generic messaging and nothing fails anywhere. Checking a
local map against this union with `Record<WebAuthnErrorCode, true>` turns that
silent drift into a compile error.

The remaining WebAuthn failures answer with prose rather than a code, so they are
deliberately absent.

Additive. Nothing changes for a consumer that does not import it.
