---
'@seamless-auth/types': patch
---

Fix `OAuthProviderUpdateSchema` filling in defaults for fields a patch did not send. `.partial()` kept each field's `.default()`, so `{ enabled: false }` parsed to that plus `allowSignup: true`, `accountLinking: 'email'`, `requireEmailVerified: false`, empty `scopes` and `redirectUris`, and the default claim paths. A server merging the parsed patch over the stored provider reset those settings. A patch now parses to exactly the fields that were sent (#83).
