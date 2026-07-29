# @seamless-auth/types

## 0.2.0

### Minor Changes

- 1ed40c9: Consolidate the domain models and API contracts that were duplicated across the
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

### Patch Changes

- 19cc93c: Correct the published package metadata. The `exports` map now declares its `types`
  condition explicitly, so consumers on `node16` or `nodenext` module resolution
  resolve declarations through it rather than falling back. The `license` field uses
  the current `AGPL-3.0-only` SPDX identifier instead of the deprecated `AGPL-3.0`,
  and `CHANGELOG.md` ships with the package.

  `npm run build` now clears `dist/` first, so a build no longer carries stale
  artifacts from a previous branch into the tarball.
