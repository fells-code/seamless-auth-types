---
'@seamless-auth/types': minor
---

Carry the telemetry dimensions `seamless-auth-api` now records on every auth event.

`AuthEventSchema` gains `deployment_id`, `device_class`, `mail_provider`, `owner` and
`attempt_id`, all optional and nullable. The API writes them on every `auth_events` row
(fells-code/seamless-auth-api#306): which deployment wrote the row, the platform family the
user agent folds into, the subject's mail provider (a provider name, never the domain), whether
the subject is a configured owner, and the sign-in attempt the row belongs to (the ephemeral
token's `jti`).

Until now the schema stripped them from `GET /admin/auth-events`, since it is a plain object
schema, so a dashboard could not show which device or attempt an event came from. The two
classifications stay plain strings rather than enums for the same reason `type` does: a newer
server may add a class an older consumer has not heard of, and a stored event must still parse.
