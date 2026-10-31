---
'@seamless-auth/types': minor
---

Adds the `oidc` module: the public side of the OpenID Provider (fells-code/seamless-auth-api ADR 0001, D9 and D11), which resource servers and the adapters' verify-only guards read.

- `OidcAccessTokenClaimsSchema` (RFC 9068 JWT access tokens, header `typ` `OIDC_ACCESS_TOKEN_TYP`) and `OidcIdTokenClaimsSchema`, with `iss`, `sub`, `aud`, `scope`, `client_id`, `sid`, `org_id`, `roles`, `acr`, `amr`, `auth_time` and `cnf`. `acr` and `amr` reuse `OidcAcrValueSchema` and `OidcAmrValueSchema` from `oidcEdge`. `parseOidcScope` splits a `scope` claim.
- `OidcDiscoveryDocumentSchema` for `/.well-known/openid-configuration`, including `acr_values_supported` and `device_authorization_endpoint`.
- `OidcTokenResponseSchema` (authorization code, refresh and device code grants), `OidcClientCredentialsTokenResponseSchema`, and `OidcTokenErrorResponseSchema` with the RFC 6749, RFC 8707 and RFC 8628 error codes.
- `OidcStepUpChallengeSchema` (the RFC 9470 `insufficient_user_authentication` challenge), `OidcInsufficientScopeErrorSchema` and `OidcBearerErrorCodeSchema`, the bodies every Seamless verify-only guard answers with.
