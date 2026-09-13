---
'@seamless-auth/types': minor
---

Add `flow_rate_limits` to the system config, and pin the Android WebAuthn origin form.

`seamless-auth-api` limits how often one caller may start an OTP, magic link, or OAuth flow, on
top of the general `rate_limit`, with constants fixed in code: 10 OTP sends and 20 magic links per
IP per 15 minutes, 5 per address, 30 OAuth starts per IP and 10 per provider. Those are fine for a
web audience and wrong for a mobile one, because carriers put thousands of subscribers behind one
address. `flow_rate_limits` is an object key (`windowSeconds`, `otp.perIp`, `otp.perIdentity`,
`magicLink.perIp`, `magicLink.perIdentity`, `oauth.perIp`, `oauth.perProvider`) whose defaults
are exactly those constants, so a deployment that sets nothing behaves as it did, and a partial
value fills the flows it leaves out. `FlowRateLimitsSchema`, `FlowRateLimits` and
`DefaultFlowRateLimits` are exported; the patch schema accepts the key.

`origins` gains a test and a comment for the form Android reports, `android:apk-key-hash:<base64url>`,
which `z.url()` accepts as an opaque URL. It has to keep accepting it for native passkeys to
verify, and nothing said so until now.

Part of the mobile track, fells-code/seamless-templates#40.
