---
'@seamless-auth/types': minor
---

Fill the gaps the API and OpenID Provider found while adopting the extensibility schemas.

- `AUTH_EVENT_TYPES` lists `session_created`, `custom_claims_omitted`, `admin_oidc_application_link_added` and `admin_oidc_application_link_removed`, which the API already writes.
- `OidcAccountClaimsSchema` carries the permission claims (`permissions`, `permissions_omitted`, `org_roles`, `org_permissions`) and `customClaims`, which defaults to `{}` for an API that does not send it.
- `CustomClaimValueSchema` spells out its three levels of nesting instead of using the recursive `z.json()`, so OpenAPI generators such as `@asteasolutions/zod-to-openapi` no longer overflow their stack on it. It accepts and refuses exactly what it did before. `CustomClaimSourceSchema` now reads stored claims with it too. `CustomClaimValue` is now a type nested three levels deep rather than zod's `JSONType`, so code that assigns an arbitrary `JSONType` to it needs a cast or a parse.
- `CalloutFailureSchema` adds `misconfigured`, for a destination whose own configuration cannot be used, such as a secret it names that the server does not have.
- `LoginDeniedErrorSchema` and `LoginHookUnavailableErrorSchema` describe the 403 and 503 a sign-in answers when a login hook stops it.
