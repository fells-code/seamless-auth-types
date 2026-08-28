# @seamless-auth/types

## 0.7.0

### Minor Changes

- fef7f2c: Add `authenticator_policy` to the system configuration.

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

## 0.6.0

### Minor Changes

- 9eb38cc: `RegistrationSuccessSchema.ttl` is a number, matching every other `ttl` in the contract.

  It was `z.string()`, which described what the auth API sent rather than what the value is. That made
  it the only `ttl` in the auth schemas a consumer could not treat like the others, and it had a real
  consequence: the Fastify adapter passes the value straight to a cookie library that requires an
  integer, so registration failed there with `TypeError: option maxAge is invalid: 300`. The Express
  adapter multiplies it into milliseconds, which coerces the string, so the same response worked.

  This is a breaking contract change, taken as a minor because the package is pre-1.0. It breaks anyone
  reading `RegistrationSuccessResponse['ttl']` as a string, or parsing a registration body that still
  carries one. The auth API is fixed in the same round to send a number, and `@seamless-auth/core`
  parses the value defensively regardless of what arrives.

## 0.5.0

### Minor Changes

- e39584e: Add `PublicSystemConfigResponseSchema`, the slice of the system configuration a signed-out client
  may read.

  It carries `loginMethods` and nothing else. The sign-in screens in the SDKs currently fall back to a
  hardcoded list of methods when they have no session, which can advertise a method an instance has
  turned off. A contract for the configured methods lets a client ask instead of guess, and lets it
  decide whether declining a passkey during registration would leave the user with no way back in.

  Additive. No existing schema, type, or export changes.

## 0.4.1

### Patch Changes

- 9ae3092: No contract changes. Schemas, types, and exports are untouched.

  Packaging: the non-test sources under `src` now ship in the tarball. The published `dist` has
  always included declaration maps and source maps, but the sources they pointed at were not in the
  package, so the maps were dangling. Go to Definition now lands on the actual schema instead of a
  `.d.ts`.

  Documentation: the README now carries npm, CI, Node, and license badges, a requirements section
  that spells out the module resolution the subpath exports need, a conventions section covering the
  schema and type alias pairing, and sections on versioning, supply chain, and security.
  `SECURITY.md` states which versions are supported and what is in scope for this repository.

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
