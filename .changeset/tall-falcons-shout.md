---
'@seamless-auth/types': minor
---

Require identity proofing on admin-assisted device replacement.

**Breaking for callers of `DeviceReplacementRecoverySchema`.** The schema now
requires a `proofing` object:

```ts
proofing: {
  method: 'in_person' | 'remote_exception';
  evidenceRef: string;   // a ticket or case number, not the evidence itself
  approver?: string;     // required when method is 'remote_exception'
}
```

Admin-assisted recovery revokes every session, removes every passkey and
disables TOTP, so it is the step social engineering aims at. It previously
carried no record of how the operator established who they were talking to, which
made a recovery impossible to review after the fact.

`in_person` is the default path and needs no approver. `remote_exception` is the
documented exception and does not validate without a named approver, so taking
the weaker path is a deliberate act with someone's name attached.

`evidenceRef` is a pointer rather than the evidence. It ends up in the audit
trail, where identifiers are redacted, so personal data does not belong in it.

Callers sending `{}` and relying on the clearing defaults will now fail
validation. Those defaults are unchanged.
