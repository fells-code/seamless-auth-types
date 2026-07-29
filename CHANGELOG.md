# @seamless-auth/types

## 0.4.0

### Minor Changes

- 88063ec: Export a `z.infer` type alias for every exported schema.

  43 of the 123 exported schemas had no alias, so a types-only consumer could not
  name the shape they describe without adding a direct Zod dependency purely to
  call `z.infer` themselves. The gap blocked `@seamless-auth/react`, which was
  hand-declaring five response bodies (`OAuthProvidersResponse`,
  `CredentialUpdateResponse`, `OrganizationEnvelopeResponse`,
  `OrganizationMembersResponse`, `OrganizationMembershipEnvelopeResponse`).

  Every new alias is the schema name minus the `Schema` suffix, matching the
  convention the other 81 already follow. `RoleSchema` and `RefreshRequestSchema`
  are deprecated, so their aliases (`Role`, `RefreshRequest`) carry the same
  deprecation notice.

  A test now scans the sources and fails when an exported schema has no matching
  alias, so the gap cannot reopen.

  This is additive. No existing export changed name or shape.

## 0.3.0

### Minor Changes

- f180c99: Add a Zod-free entry point for role matching.

  `ROLE_NAME_PATTERN`, `roleGrantsAccess`, and `hasScopedRole` moved to
  `src/schemas/role/matching.ts`, which imports nothing at runtime. Two subpath
  exports expose it: `@seamless-auth/types/role/matching` for the matchers alone,
  and `@seamless-auth/types/role` for those plus `RoleNameSchema`. Consumers on
  the authorization path can now match roles without loading Zod or the schema
  barrel.

  The package also declares `"sideEffects": false` so bundlers can tree-shake the
  barrel.

  This is additive. The package root still exports everything it did before, and
  the matching behavior is unchanged.

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
