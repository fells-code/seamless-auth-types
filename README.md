# @seamless-auth/types

Shared TypeScript types and Zod schemas for the SeamlessAuth ecosystem.

This package provides a single source of truth for domain models like Users, Credentials, Sessions, and Auth Events, ensuring consistency across:

- API servers
- SDKs
- Frontend applications
- CLI tools

---

## Features

- Zod-first schemas with runtime validation and type inference
- Strict typing across all models
- Framework-agnostic
- Minimal dependencies (Zod only)

---

## Installation

```bash
npm install @seamless-auth/types
```

---

## Usage

### Import schemas

```ts
import { UserSchema } from '@seamless-auth/types';
```

### Validate data

```ts
const user = UserSchema.parse(data);
```

### Infer types

```ts
import type { User } from '@seamless-auth/types';

function handleUser(user: User) {
  console.log(user.email);
}
```

---

## Zod as the Source of Truth

All models are defined using Zod:

```ts
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});
```

Types are inferred:

```ts
export type User = z.infer<typeof UserSchema>;
```

---

## Versioning

This package follows semantic versioning:

- PATCH for fixes and non-breaking improvements
- MINOR for additive changes such as new fields or models
- MAJOR for breaking changes such as field removals or type changes

---

## Development

```bash
# build
npm run build

# watch mode
npm run dev

# type check
npm run typecheck
```

## Contributing

Contributions are welcome.

Please ensure:

- strict TypeScript compliance
- schemas remain Zod-based
- no framework-specific dependencies are introduced

---

## License

AGPL-3.0 © Fells Code, LLC

---

## Links

- GitHub: [https://github.com/fells-code/seamless-auth-types](https://github.com/fells-code/seamless-auth-types)
- SeamlessAuth: [https://seamlessauth.com](https://seamlessauth.com)
