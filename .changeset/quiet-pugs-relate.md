---
'@seamless-auth/types': patch
---

Correct the published package metadata. The `exports` map now declares its `types`
condition explicitly, so consumers on `node16` or `nodenext` module resolution
resolve declarations through it rather than falling back. The `license` field uses
the current `AGPL-3.0-only` SPDX identifier instead of the deprecated `AGPL-3.0`,
and `CHANGELOG.md` ships with the package.

`npm run build` now clears `dist/` first, so a build no longer carries stale
artifacts from a previous branch into the tarball.
