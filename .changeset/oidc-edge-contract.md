---
'@seamless-auth/types': minor
---

Adds the `oidcEdge` module: the service-token contract between the OpenID Provider service (fells-code/seamless-auth-oidc-provider) and the private API under `/oidc/*` (ADR 0001 in seamless-auth-api). It covers provider payload storage for every stored `oidc-provider` model, external signing through `POST /oidc/sign` with its refusal codes, the provider JWKS, client metadata and shared-secret verification, account claims, session auth context with the derived `acr` and `amr`, session revocation, and provider audit events. `OIDC_EDGE_CONTRACT_VERSION` lets the provider service refuse to start against an API on a different contract.

The 0.34.0 line is published as prereleases on the `next` tag while the v0.21 contracts settle, so expect changes between `0.34.0-next.N` releases.
