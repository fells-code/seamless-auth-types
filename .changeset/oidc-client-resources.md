---
'@seamless-auth/types': minor
---

Add `OidcEdgeRoutes.clientResources` (`GET /oidc/clients/:id/resources`) with `OidcClientResourceSchema` and `OidcClientResourcesResponseSchema`: the resources an active client may ask for an access token for (RFC 8707), each with its identifier (the token's `aud`), the scopes the client is allowed there and the resource's access token lifetime. The OpenID Provider service reads it to issue RFC 9068 JWT access tokens for a named API. Additive, so `OIDC_EDGE_CONTRACT_VERSION` stays 1; a service on this version treats a 404 from an older API as no resources.
