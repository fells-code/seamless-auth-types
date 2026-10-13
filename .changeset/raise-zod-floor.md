---
'@seamless-auth/types': patch
---

Raise the `zod` dependency floor from `^4.3.6` to `^4.5.0`. The published declarations use the two-argument `ZodPreprocess` type, which zod 4.3.x does not export and zod 4.4.x declares with a single type parameter, so a consumer resolving zod below 4.5.0 with `skipLibCheck: false` got TS2724 or TS2707 from this package's `.d.ts` files. Consumers pinned to zod 4.4.x or older should upgrade to zod 4.5.0 or later.
