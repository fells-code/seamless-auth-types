---
'@seamless-auth/types': minor
---

`OidcClientMetadata` gains optional `urn:seamless:access_token_ttl`, `urn:seamless:id_token_ttl` and `urn:seamless:refresh_token_ttl` (seconds), the application's `accessTokenTtlSeconds`, `idTokenTtlSeconds` and `refreshTokenTtlSeconds`. Absent means the provider's default. The OpenID Provider service applies them, and an access token for a resource with its own lifetime takes the shorter one.
