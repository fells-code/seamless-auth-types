---
'@seamless-auth/types': minor
---

Add `PublicSystemConfigResponseSchema`, the slice of the system configuration a signed-out client
may read.

It carries `loginMethods` and nothing else. The sign-in screens in the SDKs currently fall back to a
hardcoded list of methods when they have no session, which can advertise a method an instance has
turned off. A contract for the configured methods lets a client ask instead of guess, and lets it
decide whether declining a passkey during registration would leave the user with no way back in.

Additive. No existing schema, type, or export changes.
