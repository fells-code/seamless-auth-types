---
'@seamless-auth/types': minor
---

Correlate audit events to the session they happened in.

`AuthEventSchema` gains `session_id`, and `AuthEventQuerySchema` gains a
`sessionId` filter.

Given a suspicious session there was no way to pull its event history, and given
an event no way to find the session it came from, even though sessions already
have a stable id and it already travels in the access token.

Additive and backward compatible. The field is nullable and optional, so events
predating the column still parse, and it stays null for anything that happened
before a session existed: login challenges, OTP sends, magic link requests.
