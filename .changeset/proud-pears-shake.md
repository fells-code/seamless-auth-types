---
'@seamless-auth/types': minor
---

Add a Zod-free entry point for role matching.

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
