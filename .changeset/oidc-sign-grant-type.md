---
'@seamless-auth/types': minor
---

`OidcSignRequest` gains `grantType` (`OidcUserGrantTypeSchema`: `authorization_code` or `urn:ietf:params:oauth:grant-type:device_code`), required for `id_token` and `access_token` and refused for `client_credentials`. It names the grant the user's authorization was made with, and a refresh names the grant it continues, so the API can refuse `acr` on device-flow tokens (ADR 0001, D10). `OIDC_EDGE_CONTRACT_VERSION` is now 2: the OpenID Provider service and the API must both move to this release, since an edge on version 1 refuses to start against an API on version 2.
