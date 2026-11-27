---
'@seamless-auth/types': minor
---

The OIDC edge contract is now version 4. `OidcSignRequestSchema` takes the grant of the token request itself: `grantType` adds `refresh_token`, and a refresh names the sign-in grant it continues in the new `originGrantType` (required for `refresh_token`, refused otherwise). `OidcSignGrantTypeSchema` is exported. An edge and an API on different contract versions refuse to run together, so upgrade both.
