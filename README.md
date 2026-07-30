# @seamless-auth/types

[![npm](https://img.shields.io/npm/v/@seamless-auth/types?logo=npm&color=cb3837)](https://www.npmjs.com/package/@seamless-auth/types)
[![CI](https://github.com/fells-code/seamless-auth-types/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fells-code/seamless-auth-types/actions/workflows/ci.yml)
[![Node](https://img.shields.io/node/v/@seamless-auth/types?logo=node.js&logoColor=white)](.nvmrc)
[![License: AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-blue.svg)](LICENSE)

Shared TypeScript types and Zod schemas for the SeamlessAuth ecosystem.

This package is the single source of truth for the SeamlessAuth domain models (Users,
Credentials, Sessions, Auth, Auth Events, Organizations) and for the request and response
contracts built on top of them. Every layer of the stack validates against the same schemas:

- API servers
- SDKs and server adapters
- Frontend applications
- CLI tools

Because everything downstream imports these contracts, a change here is treated as
breaking by default. See [Versioning and stability](#versioning-and-stability).

## Requirements

|                      |                           |
| -------------------- | ------------------------- |
| Node                 | 24 (`>=24 <25`)           |
| TypeScript           | 5.x                       |
| Runtime dependencies | `zod@^4` and nothing else |

The package ships as ESM only. The root import works under any module resolution, but the
[subpath exports](#subpath-exports) are resolved from `package.json` `exports`, so consumers
that use them need `moduleResolution` set to `node16`, `nodenext`, or `bundler`.

## Installation

```bash
npm install @seamless-auth/types
```

## Quick start

```ts
import { UserSchema, type User } from '@seamless-auth/types';

// Validate untrusted input and get a fully typed value back.
const user: User = UserSchema.parse(await response.json());
```

## Usage

### Validate data

Every model is a Zod schema, so you get runtime validation and the static type from one
declaration:

```ts
import { LoginRequestSchema } from '@seamless-auth/types';

const parsed = LoginRequestSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: parsed.error.issues });
}
```

### Infer types

```ts
import type { User } from '@seamless-auth/types';

function handleUser(user: User) {
  console.log(user.email);
}
```

### Roles

Role schemas accept plain roles such as `admin` and colon-separated scoped roles such as
`admin:read` and `admin:write`. Whitespace, underscores, slashes, and backslashes are
rejected, so a role name is always safe to embed in a JWT claim, a URL path segment, or a
config file without escaping.

### Match roles without Zod

`roleGrantsAccess` and `hasScopedRole` are plain string logic, but reaching them through the
package root loads Zod and every schema in the barrel. Code on the authorization hot path can
import them from `@seamless-auth/types/role/matching` instead, which has no runtime dependencies:

```ts
import { hasScopedRole } from '@seamless-auth/types/role/matching';

if (!hasScopedRole(user.roles, 'billing:invoices:read')) {
  throw new Error('forbidden');
}
```

`@seamless-auth/types/role` adds `RoleNameSchema` on top of the same matchers, and the package
root still exports all of them, so existing imports keep working.

## Modules

Every module is re-exported from the package root, so import from `@seamless-auth/types`
unless one of the subpath exports below fits better.

| Module         | Covers                                                              |
| -------------- | ------------------------------------------------------------------- |
| `common`       | Pagination, message and error envelopes, metadata                   |
| `role`         | Role name rules plus the scoped-role matcher (`roleGrantsAccess`)   |
| `user`         | User domain model, wire shape, create and update requests           |
| `credential`   | WebAuthn credentials and their API responses                        |
| `session`      | Sessions and session listings                                       |
| `authEvent`    | Auth event model, the event type enum, and event queries            |
| `messaging`    | Email and SMS message shapes plus auth delivery instructions        |
| `systemConfig` | System config, login methods, lockout policy, OAuth provider config |
| `auth`         | Login, refresh, registration, OTP, magic link, and logout contracts |
| `oauth`        | Public provider listings and the OAuth login handshake              |
| `webauthn`     | Registration and assertion request and response contracts           |
| `totp`         | TOTP enrollment, status, and verification                           |
| `stepUp`       | Step-up freshness status                                            |
| `organization` | Organizations, memberships, and the org switch response             |
| `me`           | The caller's own user and `GET /users/me`                           |
| `metrics`      | Dashboard metrics, timeseries, and security anomalies               |
| `admin`        | Admin-only user detail, anomalies, and device replacement recovery  |

### Subpath exports

| Subpath                              | Covers                                 |
| ------------------------------------ | -------------------------------------- |
| `@seamless-auth/types/role`          | Role name schema plus the matchers     |
| `@seamless-auth/types/role/matching` | The matchers alone, with no Zod import |

## Conventions

**Zod is the source of truth.** Models are declared as schemas and the TypeScript type is
inferred from the schema. No type in this package is hand-written alongside a schema that
already describes it:

```ts
export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
});

export type User = z.infer<typeof UserSchema>;
```

**Every exported schema has a matching type alias.** `XSchema` is always paired with `X`, so
you never have to write `z.infer<typeof XSchema>` at a call site. This is enforced by a test,
not by convention alone.

**Framework-agnostic.** No server, browser, or Node-only APIs, and no runtime dependency
beyond Zod, so the same contracts load in an API process, a browser bundle, and a CLI.

**Strict typing throughout.** No `any` and no non-null assertions. Wire-facing schemas are
`.strict()` where unknown keys should be rejected rather than silently dropped.

## Versioning and stability

This package follows semantic versioning:

- **PATCH** for fixes with no effect on the contract, including docs and internal tidying
- **MINOR** for additive changes such as a new module, export, or optional field
- **MAJOR** for breaking changes such as a removed or renamed export, a field whose type
  changes, or a schema that now rejects input it used to accept

A widening change (a wider enum, a field that becomes nullable) is not breaking at runtime,
but it does change the inferred TypeScript type, so it is called out in the release notes.

Releases are managed with [Changesets](https://github.com/changesets/changesets). See
[RELEASES.md](RELEASES.md) for the release flow and [CHANGELOG.md](CHANGELOG.md) for the
history.

## Supply chain

- Published from CI only, from a tagged release on `main`, never from a developer machine.
- Every release carries [npm provenance](https://docs.npmjs.com/generating-provenance-statements),
  so the published tarball is cryptographically linked to the commit and workflow that built it.
- One runtime dependency (`zod`). Dependency updates are automated and reviewed like any other
  change.
- The published tarball is limited to `dist`, the non-test sources under `src`, `README.md`,
  `CHANGELOG.md`, `LICENSE`, and `package.json`. `npm run check-npm-build` prints the contents in
  CI on every push and release.
- Sources ship alongside the declaration maps and source maps, so Go to Definition in your editor
  lands on the actual schema rather than a `.d.ts`.

## Security

Do not open a public issue for a vulnerability. Report it privately to
**security@seamlessauth.com**. See [SECURITY.md](SECURITY.md) for what to include, our
acknowledgement window, and the coordinated disclosure process.

## Development

```bash
nvm use          # Node 24, pinned by .nvmrc
npm ci

npm run build      # compile to dist/
npm run dev        # tsc --watch
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Contributing

Contributions are welcome. Start with the organization
[contributing guide](https://github.com/fells-code/.github/blob/main/CONTRIBUTING.md) and the
[repository standards](https://github.com/fells-code/.github/blob/main/REPO-STANDARDS.md).
[AGENTS.md](AGENTS.md) documents the repository layout and the working standards in more detail.

For a change in this repository specifically:

1. Add or change the schema under `src/schemas/<model>/`.
2. Export it from `src/index.ts` if it is part of the public API.
3. Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
4. Run `npm run changeset` and write the notes for the repositories that consume these
   contracts, not for the implementation. A change to `src/` without a changeset ships nothing.

Keep schemas Zod-based, keep the package framework-agnostic, and treat any change to an
existing schema as breaking until you can argue otherwise.

## License

[AGPL-3.0-only](LICENSE) © Fells Code, LLC

## Links

- [npm package](https://www.npmjs.com/package/@seamless-auth/types)
- [GitHub repository](https://github.com/fells-code/seamless-auth-types)
- [SeamlessAuth](https://seamlessauth.com)
- [Fells Code](https://github.com/fells-code)
