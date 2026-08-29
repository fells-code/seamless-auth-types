---
'@seamless-auth/types': minor
---

Record which authenticator a credential came from.

`CredentialSchema` gains `aaguid`, and it is included in `CredentialApiSchema`
so it reaches `CredentialResponseSchema`.

The AAGUID is the authenticator's model identifier. Without it there is no key to
look an authenticator up in the FIDO Metadata Service, no way to express an allow
or deny list of approved models, and no way to report which authenticators an
organisation actually has deployed.

Additive and backward compatible: nullable and optional, so credentials
registered before this was recorded still parse. Note that an all-zero AAGUID is
not missing data. It is an authenticator declining to identify itself, which many
platform authenticators do unless attestation is requested, so it is carried
through rather than normalised away.
