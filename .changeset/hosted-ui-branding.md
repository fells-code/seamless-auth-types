---
'@seamless-auth/types': minor
---

`OidcEdgeConfigResponseSchema` gains an optional `hostedUi`, the `hosted_ui` branding from system config, so the OpenID Provider service reads its hosted page branding with the rest of `GET /oidc/config`. It is optional, so `OIDC_EDGE_CONTRACT_VERSION` stays at 1.

`HostedUiSchema` gains a `muted` color and validates more tightly, because its values are written into a page served under a strict nonce CSP. `logoUrl` refuses credentials, quotes, parentheses, spaces and semicolons. `fontFamily` must be a comma separated list of font names where a quoted name uses single quotes and closes. `appName` refuses control characters. A `hosted_ui` value that passed the 0.34.0-next.1 schema but breaks one of these rules is now refused.
