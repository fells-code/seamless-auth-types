---
'@seamless-auth/types': minor
---

Consolidate the domain models and API contracts that were duplicated across the
ecosystem repos into this package. New modules: `common`, `role`, `messaging`,
`systemConfig`, `oauth`, `webauthn`, `totp`, `stepUp`, `organization`, `me`,
`metrics`, and `admin`. The `user`, `credential`, `session`, `authEvent`, and
`auth` modules gained the request, response, and query schemas that consumers
were previously declaring for themselves.

Three existing schemas changed. All three accept more than they used to, so they
are not breaking at runtime, but each changes an inferred TypeScript type:

- `TransportSchema` covers the full WebAuthn `AuthenticatorTransportFuture` set.
  The old enum rejected `hybrid`, which is what cross-device passkeys report.
- `CreateUserSchema` and `UpdateUserSchema` accept a null phone, matching what
  the auth API already accepts.
- `OrganizationSchema` parses `createdAt` and `updatedAt` as ISO date strings
  rather than `z.any()`.

`AUTH_EVENT_TYPES` now holds 74 entries: the union of the auth API's and the
admin dashboard's lists, minus the `bootstrap_admin_*` pair for functionality
that has been removed.
