---
'@seamless-auth/types': minor
---

`OAuthProviderConfigSchema` makes `authorizationUrl`, `tokenUrl` and `userInfoUrl` optional, so an inbound provider can be configured from its issuer alone and the auth API reads the rest from the issuer's OpenID discovery document. `OAuthProviderCreateSchema` still requires all three for a provider without an `issuer`, and `missingOAuthProviderEndpoints` names the ones missing. Code that reads these fields from a stored provider now gets `string | undefined`.
