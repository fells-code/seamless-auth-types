---
'@seamless-auth/types': minor
---

OAuth provider config holds the rules the auth server enforces since 0.19.4 (GHSA-qx82-28gf-w744), so the dashboard and CLI refuse a bad provider before the API does.

- `clientSecretEnv` must be an env var name ending in `_CLIENT_SECRET` (new `OAuthClientSecretEnvSchema`).
- `authorizationUrl`, `tokenUrl`, `userInfoUrl` and `jwksUri` must use `http` or `https`. `z.url()` alone accepted any scheme, including `javascript:`. The server still requires `https` in production.

Breaking for a stored provider that names another env var or uses another scheme: it now fails `OAuthProviderConfigSchema`, as it already fails on API 0.19.4.
