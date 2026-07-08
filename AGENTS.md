# AGENTS.md

This file is for coding agents working in the `seamless-auth-types` repository.

## Purpose

`seamless-auth-types` publishes `@seamless-auth/types`: the shared TypeScript
types and Zod schemas for the SeamlessAuth ecosystem. It is the single source of
truth for domain models (Users, Credentials, Sessions, Auth, Auth Events) that
the API servers, SDKs, frontends, and CLI all depend on.

Because everything downstream imports these contracts, treat changes here as
breaking-by-default. A change to a schema ripples across every consumer.

## Working Standards (fells-code baseline)

These rules apply to every repository in the fells-code org. Repo-specific
guidance may extend them but must not contradict them.

### Attribution
- Commit and open PRs solely under the repository owner's identity. Never
  commit under an agent or assistant identity.
- Never attribute work to an AI assistant: no `Co-Authored-By: Claude` (or any
  assistant) trailers, no "Generated with" / "Created with Claude" notes, and no
  assistant branding or emoji anywhere in commit messages, PR or issue titles
  and descriptions, changesets, code comments, or docs.

### Comments
- Comment only when the code genuinely needs explaining: a non-obvious reason, a
  gotcha, or an invariant. Never narrate what the code plainly does.

### TODOs
- Every `TODO`/`FIXME` must reference a ticket, e.g. `// TODO(#123): ...`.
  Do not leave a bare TODO. If no ticket exists, create one first.

### Commits & branches
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`).
- Descriptive branch names (`feat/...`, `fix/...`); never a `claude/` or other
  tool-generated prefix.

### Public-facing text
- No em dashes in commit messages, code comments, PR or issue text, changesets,
  or docs. Use a comma, parentheses, or a separate sentence.

### Before declaring work done
- Run the repo's checks (typecheck, lint, format, tests) and report real output.
  Never claim a change works without running them.
- Match the surrounding code's style, naming, and comment density.

## Design Principles

- Zod-first: every model is a Zod schema, with the TypeScript type inferred from
  it. Do not hand-write a type that duplicates a schema.
- Framework-agnostic: no runtime dependency beyond Zod. Do not pull in server,
  browser, or Node-only APIs.
- Strict typing throughout; avoid `any` and non-null assertions.

## Architecture Map

```text
src/
  index.ts              public barrel: re-exports every schema module
  shared.ts             cross-cutting shared types/helpers
  schemas/
    user/               User model + schema
    credential/         Credential (WebAuthn/passkey) model + schema
    session/            Session model + schema
    auth/               Auth request/response contracts
    authEvent/          Auth event/audit model + schema
```

- `src/index.ts` is the public surface. A new schema is only exported once it is
  added there.
- Build emits to `dist/` (consumed by published package); do not edit `dist/`.

## Tooling

| Task       | Command             |
| ---------- | ------------------- |
| Build      | `npm run build`     |
| Typecheck  | `npm run typecheck` |
| Lint       | `npm run lint`      |
| Format     | `npm run format`    |
| Unit tests | `npm test` (vitest) |

- Node version is pinned by `.nvmrc` (Node 24); CI reads it via
  `node-version-file`. Run `nvm use` locally to match.
- commitlint enforces Conventional Commits.

## Safe Change Workflow

1. Run `nvm use` and `npm ci`.
2. Change or add the schema under `src/schemas/<model>/`.
3. Export it from `src/index.ts` if it is part of the public API.
4. Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`.
5. Treat any change to an existing schema as potentially breaking: note it in the
   PR and consider the version bump that downstream consumers will need.
