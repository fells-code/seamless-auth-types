---
'@seamless-auth/types': minor
---

Add `OidcPayloadConsumeResponseSchema` (`{ consumed: boolean }`) for `POST /oidc/payloads/:model/:id/consume`, which now answers `200` instead of `204`. `consumed` is true only for the caller whose request marked the record consumed, so of two concurrent refreshes with the same token exactly one wins, and the OpenID Provider service treats the other as reuse.
