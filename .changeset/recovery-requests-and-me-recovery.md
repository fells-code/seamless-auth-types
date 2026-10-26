---
'@seamless-auth/types': minor
---

Shared schemas for the rest of the v0.20 account recovery contract, and a recovery flag on `/users/me`.

- `AccountRecoveryRequestSchema` and `AccountRecoveryRequestsResponseSchema` for `GET /recovery/requests`, and `AccountRecoveryRequestIdParamSchema` for `DELETE /recovery/requests/:id`.
- `AccountRecoveryVerifyResponseSchema`: the status plus the optional `deliveries` returned to a server that owns delivery.
- `RecoveryErrorCodeSchema`, the `error` values the recovery code and account recovery routes answer with.
- `MeResponseSchema` gains optional `recovery`, true for a recovery session, so a cookie client can tell after a reload that the user still has to enroll a factor.
