---
'@seamless-auth/types': minor
---

Lets an instance tell a native admin tool how to sign in through its OpenID Provider (ADR 0003). `SystemConfigSchema` and `SystemConfigPatchSchema` gain `oidc_cli_client_id`, a string or `null` that defaults to `null`, so a config from an older API still parses. `PublicSystemConfigResponseSchema` gains an optional `oidcProvider: { issuer, cliClientId }`. It is optional because an older API does not send it, and a client must treat its absence as "this instance does not advertise a provider" and offer email code sign-in. The inferred `SystemConfig` type now includes `oidc_cli_client_id`, so code that builds a full `SystemConfig` by hand has to set it.
