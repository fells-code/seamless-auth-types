---
'@seamless-auth/types': minor
---

Add `max_concurrent_sessions` to the system configuration.

How many sessions one user may hold at once. `null` means no limit, and that is
the default, so a deployment that predates the key keeps behaving exactly as it
does today.

`null` rather than `0` for unlimited: zero would otherwise read as "no sessions
allowed", which is a plausible way for someone to try to remove a cap and lock
every user out. The schema refuses zero and any negative or fractional value, on
both the full config and a patch.

The server side of this is NIST 800-53 AC-10, concurrent session control. It is
also an operational concern wherever workstations are shared, since an unbounded
session count leaves sessions alive on machines a user has walked away from.

This publishes the key. Enforcing it is the consuming server's job.
