## Summary

What this change does and why.

## Related Issue

Closes #

## Changes

-

## Consumer impact

Which downstream repositories need to react, and the semver bump this needs. Treat any change
to an existing schema as breaking until you can argue otherwise. See [RELEASES.md](../RELEASES.md).

- [ ] No consumer has to change anything (patch)
- [ ] Additive only: new export, new module, or new optional field (minor)
- [ ] Breaking: removed or renamed export, changed field type, or narrower validation (major)

## Checklist

- [ ] Follows the repo's [AGENTS.md](../AGENTS.md) and the org [REPO-STANDARDS](https://github.com/fells-code/.github/blob/main/REPO-STANDARDS.md)
- [ ] Conventional Commit messages; descriptive branch name
- [ ] Changeset added (`npm run changeset`); a change to `src/` without one ships nothing
- [ ] New or changed schemas have tests, and every exported schema has its inferred type alias
- [ ] All checks pass: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`
- [ ] No AI or assistant attribution anywhere in commits, PR text, or docs
- [ ] No em dashes in public-facing text
- [ ] Docs updated if behavior or public contracts changed
