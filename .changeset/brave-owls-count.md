---
'@seamless-auth/types': minor
---

Record who performed an audited action, not only who it happened to.

`AuthEventSchema` gains `actor_user_id`, and `AuthEventQuerySchema` gains an
`actorUserId` filter.

An administrator acting on someone else's account is recorded with the target in
`user_id` and the administrator in `actor_user_id`. Without it an administrative
event reads as though the user did it to themselves, which makes reviewing
administrative action after the fact impossible.

Additive and backward compatible. The field is nullable and optional, so events
written before the column existed still parse, as do events from a server that
does not populate it. `actorUserId` on the query schema is optional and unset
when absent.
