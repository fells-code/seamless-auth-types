---
name: Contract change
about: Propose a new schema, a new field, or a change to an existing contract
title: 'feat: '
labels: enhancement
---

## Problem

What you are trying to model or validate, and why the current contracts do not cover it.

## Proposed contract

The schema or field you want, as concretely as you can express it.

```ts
export const ExampleSchema = z.object({
  /* ... */
});
```

## Alternatives Considered

Other shapes you thought about and why you did not choose them.

## Consumer impact

Which repositories need to react to this, and the semver bump you think it needs. A removed or
renamed export, a field whose type changes, or a schema that starts rejecting input it used to
accept is a major. See [RELEASES.md](../../RELEASES.md).

## Additional Context

Links, references, or prior discussion.
