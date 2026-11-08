---
'@seamless-auth/types': minor
---

Add schemas for webhooks, login hooks, custom claims and audit sinks (API ADR 0005).

- Webhooks: endpoint and delivery schemas, the event catalog with one payload schema per type, and the versioned envelope. Header names, the replay tolerance and the retry schedule are in `@seamless-auth/types/webhook/constants`, with no Zod import.
- Login hooks: configuration per trigger (`post_login`, `pre_token`), the call body Seamless sends, the result a hook returns, and the invocation log.
- Custom claims: claim sets per instance role, organization role and OpenID Provider client, held to a 1 KiB budget. The reserved claim names are in `@seamless-auth/types/customClaim/reserved`, with no Zod import.
- Audit sinks: OTLP and syslog settings, sink status, and `AuditExportEventSchema`, the `seamless-auth-events/1` line every sink and export writes.
- New audit event types for managing and running all four.
