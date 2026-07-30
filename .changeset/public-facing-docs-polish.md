---
'@seamless-auth/types': patch
---

No contract changes. Schemas, types, and exports are untouched.

Packaging: the non-test sources under `src` now ship in the tarball. The published `dist` has
always included declaration maps and source maps, but the sources they pointed at were not in the
package, so the maps were dangling. Go to Definition now lands on the actual schema instead of a
`.d.ts`.

Documentation: the README now carries npm, CI, Node, and license badges, a requirements section
that spells out the module resolution the subpath exports need, a conventions section covering the
schema and type alias pairing, and sections on versioning, supply chain, and security.
`SECURITY.md` states which versions are supported and what is in scope for this repository.
