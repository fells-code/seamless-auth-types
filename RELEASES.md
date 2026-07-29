# Release Management

This repo uses npm plus Changesets, matching the rest of the fells-code packages.

## Daily Development

1. Make the change under `src/schemas/<model>/`.
2. Run `npm run changeset`.
3. Select `@seamless-auth/types`.
4. Choose the semver bump.
5. Write release notes for the repos that consume these contracts, not implementation notes.

## Choosing the bump

Every downstream repo imports these schemas, so a change here ripples outward. Treat a schema
change as breaking by default and argue your way down from there.

- **major** for anything a consumer must react to: a removed or renamed export, a field that
  changes type, a schema that now rejects input it used to accept.
- **minor** for additive work: a new module, a new export, a new optional field, or a schema
  that accepts more than it used to.
- **patch** for fixes with no effect on the contract: docs, tests, and internal tidying.

A widening change (a wider enum, a field that becomes nullable) is not breaking at runtime, but
it does change the inferred TypeScript type, so say so in the changeset.

## Stable Releases

Stable releases come from `main` through the `Release` workflow.

When changesets are merged to `main`, the workflow opens or updates a release PR that contains:

- the package version bump
- `CHANGELOG.md` updates
- `package-lock.json` updates
- consumed changeset file removals

Review that PR like a normal release artifact. When it is merged, the workflow publishes the npm
package, creates the Git tag, and creates the GitHub Release.

## Rollout order

Publish this package before the repos that depend on it. A consumer that adopts a new contract
against an unpublished version will not install.

## npm Publishing

The workflow publishes with `NPM_CONFIG_PROVENANCE=true`, so npm records provenance for the
package. The `NPM_TOKEN` repository secret needs publish access before the first release PR is
merged.
