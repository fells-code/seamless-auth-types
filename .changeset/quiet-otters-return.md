---
'@seamless-auth/types': minor
---

Carry `returnTo` back out of the OAuth callback, and hold it to a scheme that can be a
link destination.

`StartOAuthLoginRequestSchema` has taken a `returnTo` since OAuth landed, and nothing ever
gave it back. `seamless-auth-api` validated it against the configured origins and signed it
into the state, and `seamless-auth-react` sent it, but no schema carried it to the end of the
flow, so a client that asked to be returned somewhere had no way to learn where. It was a
field that looked supported and did nothing.

`OAuthLoginSuccessResponseSchema` now carries an optional `returnTo`. The API reads it back
out of the signed state rather than from the callback request, so it is the value validated
at `/start` and not one introduced at the end of the round trip. Absent when the caller asked
for nothing, so a client falls through to its own default rather than treating absence as an
error.

Both `returnTo` fields move from `z.url()` to `RedirectTargetSchema`. `z.url()` accepts
`javascript:alert(1)` and `data:text/html,...`, and a client navigates to whatever comes back
out of this flow, so it is the same sink a magic link destination is. That is what
`RedirectTargetSchema` was added for in 0.18.0, and the OAuth fields should have used it
then.

Additive for a consumer that ignores the new field. A caller that was somehow sending a
`javascript:` or `data:` `returnTo` is now refused at the schema rather than later, which is
the intended change.
