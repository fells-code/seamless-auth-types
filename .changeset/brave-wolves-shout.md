---
'@seamless-auth/types': minor
---

Let a deployment refuse synced passkeys and restrict authenticator models.

`AuthenticatorPolicySchema` gains three fields:

- `syncedPasskeys`, `allow` or `block`, **defaulting to `block`**
- `aaguidAllowList`, empty by default
- `aaguidDenyList`, empty by default

**`syncedPasskeys` defaults to `block`, which is a behaviour change.** A
multi-device credential is synced by a platform password manager, so its private
key exists somewhere outside the authenticator that created it. That is what a
consumer wants and what an organisation issuing its own authenticators does not,
and this package now takes the stricter position by default. A deployment that
wants platform passkeys sets `syncedPasskeys: 'allow'`.

The judgement is made on backup eligibility rather than current backup state: a
credential that _can_ leave the device is the exposure, whether or not it
already has.

The AAGUID lists restrict which authenticator models may register. They need
`attestation: 'direct'` to mean anything, because an authenticator that was never
asked to identify itself reports no usable AAGUID.

The whole-object default for `authenticator_policy` is now derived from the field
defaults rather than restated alongside them, so the two cannot drift.
