---
'@seamless-auth/types': minor
---

Add `binding` to the OAuth start response and the callback request. The auth server returns a
random `binding` from `/oauth/:providerId/start` and checks it on `/oauth/:providerId/callback`,
so a `state` can only be finished by the client that started the sign-in. Both fields are
optional in the schemas so a client can still parse a response from an older auth server.
