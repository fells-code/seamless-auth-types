---
'@seamless-auth/types': minor
---

Let a deployment state whether the authenticator must verify the human.

`AuthenticatorPolicySchema` gains `userVerification`, accepting `required`,
`preferred` or `discouraged`, defaulting to `required`.

One value is meant to drive both what the browser is asked for and what the
server enforces. Asking for less than is enforced sends a user through an entire
ceremony that fails at the last step, which is what `seamless-auth-api` does
today: it advertises `preferred` and then rejects a response that skipped
verification.

`required` is the default because user verification is what separates a second
factor from a second signature, and it is the basis of any AAL2 claim.

Additive: config that predates the key parses to `required`, and the field sits
on the existing authenticator policy block rather than adding another top-level
key.
