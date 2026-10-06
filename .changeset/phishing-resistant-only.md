---
'@seamless-auth/types': minor
---

Add `phishing_resistant_only` to `SystemConfigSchema` (default `false`) and `SystemConfigPatchSchema`. When it is on, the API starts a session only from a passkey, and refuses email and phone codes, magic links, TOTP and OAuth whatever `login_methods` says. A code is still accepted once, to verify a new account's address before its first passkey is enrolled.
