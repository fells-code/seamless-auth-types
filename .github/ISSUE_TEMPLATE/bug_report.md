---
name: Bug report
about: Report a defect in a schema, type, or export
title: 'bug: '
labels: bug
---

## Summary

A clear description of the bug and its impact.

## Affected schema or export

Which export is wrong, for example `UserSchema`, `LoginRequestSchema`, or `hasScopedRole`.

## Reproduction

A minimal snippet, including the input you passed in.

```ts
import { UserSchema } from '@seamless-auth/types';

UserSchema.parse({
  /* ... */
});
```

## Expected Behavior

What you expected, for example that the input parses, that it is rejected, or that the
inferred type is narrower.

## Actual Behavior

What happened instead. Include the Zod issues or the TypeScript error text (redact secrets).

## Environment

- `@seamless-auth/types` version:
- `zod` version:
- TypeScript version and `moduleResolution`:
- Node version (`node -v`):
- Consuming repository, if relevant:

## Additional Context

Anything else that helps, such as related issues or the downstream code that broke.

> Do not report security vulnerabilities here. Follow the [Security Policy](../../SECURITY.md).
