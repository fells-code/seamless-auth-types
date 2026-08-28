---
'@seamless-auth/types': minor
---

Add `authenticator_policy` to the system configuration.

A deployment can now state which authenticators it will enrol, rather than the
decision being fixed in the auth server. The block starts with one field:

```ts
authenticator_policy: {
  attachment: 'any' | 'platform' | 'cross-platform';
}
```

`attachment` is the standing default for the browser picker at registration.
`any`, the default, offers both built-in and roaming authenticators, which is
what a deployment issuing hardware security keys needs. Naming one narrows the
picker and bounds what a per-request override may ask for.

Additive and backward compatible: config that predates the key parses to
`{ attachment: 'any' }`, which is the behaviour callers already had. The key is
also accepted by the strict patch schema, so it is editable through the admin
config route.

Introduced as a block rather than a single key because authenticator policy is
expected to grow: synced passkey posture and AAGUID allow and deny lists belong
in the same place, and adding them later should not mean migrating config twice.
