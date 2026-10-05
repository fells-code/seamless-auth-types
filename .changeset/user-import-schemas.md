---
'@seamless-auth/types': minor
---

Add the user import contract: `ImportUsersRequestSchema`, `ImportUsersResponseSchema` and the row, organization, status, rejection and change schemas behind them, with `USER_IMPORT_MAX_ROWS` (200). Export `MembershipRoleSchema` and `MembershipScopeSchema`, and add the `admin_user_imported` and `admin_user_import_completed` audit event types.
