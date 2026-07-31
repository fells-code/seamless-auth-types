---
'@seamless-auth/types': minor
---

`RegistrationSuccessSchema.ttl` is a number, matching every other `ttl` in the contract.

It was `z.string()`, which described what the auth API sent rather than what the value is. That made
it the only `ttl` in the auth schemas a consumer could not treat like the others, and it had a real
consequence: the Fastify adapter passes the value straight to a cookie library that requires an
integer, so registration failed there with `TypeError: option maxAge is invalid: 300`. The Express
adapter multiplies it into milliseconds, which coerces the string, so the same response worked.

This is a breaking contract change, taken as a minor because the package is pre-1.0. It breaks anyone
reading `RegistrationSuccessResponse['ttl']` as a string, or parsing a registration body that still
carries one. The auth API is fixed in the same round to send a number, and `@seamless-auth/core`
parses the value defensively regardless of what arrives.
