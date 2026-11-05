---
'@seamless-auth/types': minor
---

Add the session exchange contract from ADR 0003 in seamless-auth-api: `sessionExchangeEnabled` on OpenID Provider applications (accepted only on a first-party public native client), `parentSessionId`, `exchangeClientId` and `exchangeGrantType` on `SessionSchema`, the `POST /sessions/exchange` request, response and error schemas, the `session:exchange` scope and token type constants, and the `session_exchanged`, `session_exchange_replayed` and `admin_oidc_application_session_exchange_updated` auth events. `OidcApplicationSchema` now requires `sessionExchangeEnabled`, so a consumer of an older API has to treat it as absent.
