---
'@seamless-auth/types': minor
---

Adds the contract for permissions and organization roles (seamless-auth-api#415, #416). New schemas cover permissions, role mappings, the organization role catalogue, the live `GET /users/me/permissions` response, and `AccessTokenClaimsSchema`, which names the new `permissions`, `org_roles`, `org_permissions` and `permissions_omitted` claims. `hasPermission` and `hasAllPermissions` match exactly, with no wildcards or implied grants, and are also available without Zod from `@seamless-auth/types/permission/matching`. `MeUserSchema` and `SeamlessAuthUserSchema` gain optional fields for the same data, which an older API does not send. `AUTH_EVENT_TYPES` gains the events that audit these changes, so an exhaustive switch over `AuthEventType` has to handle them.
