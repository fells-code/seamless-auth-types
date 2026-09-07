---
'@seamless-auth/types': minor
---

Default `authenticator_policy.syncedPasskeys` to `allow`.

This reverses the default introduced in 0.15.0. `block` refuses any credential
that is backup eligible, and every iCloud Keychain and Google Password Manager
passkey is, so a stock deployment refused the passkey a normal laptop or phone
actually offers. The first registration failed on hardware the operator had no
way to change, which is not a posture anyone should inherit by accident.

A deployment issuing its own authenticators still sets `block`, and it now reads
as the deliberate choice it is:

```json
{ "syncedPasskeys": "block" }
```

Nothing else changes. The judgement is still made on backup eligibility rather
than current backup state, the refusal is still
`403 { "error": "synced_passkey_not_allowed" }`, and a policy that names the
field keeps whatever it names. Only an omitted field resolves differently.
