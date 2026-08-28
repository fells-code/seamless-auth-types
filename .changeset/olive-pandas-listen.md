---
'@seamless-auth/types': minor
---

Add `session_idle_ttl` to the system configuration.

A session can now be bounded by how long it goes unrefreshed, separately from
its absolute lifetime:

```ts
session_idle_ttl: string; // "\d+[smhd]", defaults to "8h"
```

The absolute session lifetime stays `refresh_token_ttl`, since the refresh token
is the session credential. `session_idle_ttl` is the idle bound underneath it,
and it only does anything when it is the shorter of the two.

Additive and backward compatible: config that predates the key parses to `8h`.
The key is accepted by the strict patch schema, and deliberately carries no
default there, so a patch that does not mention it leaves the stored value alone.
