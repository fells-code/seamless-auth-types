---
'@seamless-auth/types': minor
---

Let a deployment ask authenticators to identify themselves.

`AuthenticatorPolicySchema` gains two fields:

- `attestation`, `none` or `direct`, defaulting to `none`
- `requireKnownAuthenticator`, defaulting to `false`

`none` asks for nothing and is right for a consumer deployment: attestation
carries a privacy cost and most relying parties have no use for it. `direct`
requests a statement, which is what makes validation against the FIDO Metadata
Service possible, and what an organisation issuing its own authenticators needs.

`requireKnownAuthenticator` decides what happens to an authenticator the Metadata
Service does not list. False registers it anyway; true refuses it. It is only
meaningful under `direct`, because an authenticator that was never asked to
identify itself cannot be looked up.

`indirect` and `enterprise` are valid WebAuthn conveyance values and are
deliberately not accepted, because nothing consumes them yet and accepting them
would promise handling that does not exist.

Additive: config that predates these fields parses to `none` and `false`, which
is the behaviour every deployment has today.
