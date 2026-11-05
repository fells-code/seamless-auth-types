---
'@seamless-auth/types': patch
---

`OidcApplicationSchema` reads a missing `sessionExchangeEnabled` as `false`. 0.36.0 made the field required, so a client on 0.36.0 refused the application list from any API older than v0.23, which does not send it.
