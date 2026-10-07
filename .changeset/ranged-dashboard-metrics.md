---
'@seamless-auth/types': minor
---

Time ranges for the dashboard metrics and security anomalies (fells-code/seamless-auth-api#132).

- `DashboardMetricsQuerySchema` (`from`, `to`) and `SecurityAnomaliesQuerySchema` (`from`, `to`, `limit` 1 to 200 with a default of 200, `offset` with a default of 0). The range rules are the same as `MetricsQuerySchema`'s, which now shares them.
- `DashboardMetricsResponseSchema` gains optional `window`, `newUsers`, `loginSuccess`, `loginFailed`, `successRate`, `otpUsage` and `passkeyUsage`, which cover the requested window. The `*24h` fields keep meaning the last 24 hours.
- `SecurityAnomaliesResponseSchema` gains optional `window`, `limit` and `offset`, and `total` is documented as every matching event in the window.

All the new response fields are optional, so a response from a server without ranges still parses.
