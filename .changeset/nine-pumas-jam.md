---
'@seamless-auth/types': minor
---

Export a `z.infer` type alias for every exported schema.

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
