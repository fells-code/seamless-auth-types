---
'@seamless-auth/types': minor
---

OpenID Provider applications gain `pkceRequired`, `true` by default. Only a confidential client may set it to `false` (RFC 9700 section 2.1.1); `checkOidcApplication` refuses the opt-out on a public client. `OidcClientMetadata` gains optional `urn:seamless:pkce_required`, sent as `false` only for an opted-out client, which must then send `nonce` whenever it asks for an ID token. Adds the `admin_oidc_application_pkce_updated` auth event.
