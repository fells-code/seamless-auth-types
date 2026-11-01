---
'@seamless-auth/types': minor
---

Add `OidcSessionBindRequestSchema` and the `sessionBind` edge route (`POST /oidc/sessions/:id/bind`). The edge binds a first-party session to a client by presenting the user's access token for that session, and the API answers lookups and signs tokens only for bound sessions. This bumps `OIDC_EDGE_CONTRACT_VERSION` to 3, so the provider service and the API must be upgraded together.
