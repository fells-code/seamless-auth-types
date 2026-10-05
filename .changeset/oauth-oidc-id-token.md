---
'@seamless-auth/types': minor
---

Add OpenID Connect settings to `OAuthProviderConfigSchema`: `issuer` and `jwksUri`, which make the server verify the provider's ID token and read the profile from it, and `externalIdSource` with `externalIdJsonPath`, which link a first sign-in to a user imported under that source by an ID token claim such as Entra ID's `oid`.
