/**
 * Permission matching logic, deliberately free of any Zod import, for the same reason as
 * `role/matching`: consumers on the authorization hot path can reach this through the
 * `./permission/matching` subpath export without pulling Zod into their dependency tree.
 *
 * Matching is exact. Unlike a role, a permission grants nothing beneath it and implies
 * nothing else: `invoices:write` does not satisfy `invoices:read`. A token can therefore be
 * checked with any JWT library and a plain membership test, and nothing is granted that the
 * console does not list.
 */

function grantedPermissions(granted: unknown): Set<string> {
  if (!Array.isArray(granted)) {
    return new Set();
  }

  return new Set(granted.filter((value): value is string => typeof value === 'string'));
}

function asList(required: string | string[]) {
  return Array.isArray(required) ? required : [required];
}

/** Whether the granted permissions include at least one of the required ones. */
export function hasPermission(granted: unknown, required: string | string[]): boolean {
  const held = grantedPermissions(granted);

  return asList(required).some((permission) => held.has(permission));
}

/**
 * Whether the granted permissions include every required one. Requiring nothing is refused
 * rather than vacuously true, so a guard built from an empty list cannot open a route.
 */
export function hasAllPermissions(granted: unknown, required: string | string[]): boolean {
  const held = grantedPermissions(granted);
  const list = asList(required);

  return list.length > 0 && list.every((permission) => held.has(permission));
}
