/**
 * Role matching logic, deliberately free of any Zod import. Consumers on the
 * authorization hot path can reach this through the `./role/matching` subpath
 * export without pulling Zod into their dependency tree.
 */

/**
 * Roles are colon-scoped (`billing:invoices:read`). Underscores, slashes, and
 * whitespace are excluded so a role name is always safe to embed in a JWT claim,
 * a URL path segment, and a config file without escaping.
 */
export const ROLE_NAME_PATTERN = /^(?!.*[_/\\\s])(?=.{1,80}$)[A-Za-z0-9-]+(?::[A-Za-z0-9-]+)*$/;

function normalizeRole(value: string) {
  return value.trim();
}

function samePrefix(left: string[], right: string[]) {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

/**
 * Whether a granted role satisfies a required role. A `:*` suffix grants every
 * role under that prefix, an unscoped role grants every role beneath it, and a
 * `:write` role implies the matching `:read` role.
 */
export function roleGrantsAccess(grantedRole: string, requiredRole: string): boolean {
  const granted = normalizeRole(grantedRole);
  const required = normalizeRole(requiredRole);

  if (!granted || !required) {
    return false;
  }

  if (granted === required) {
    return true;
  }

  if (granted.endsWith(':*')) {
    const prefix = granted.slice(0, -2);
    return required === prefix || required.startsWith(`${prefix}:`);
  }

  if (!required.includes(':')) {
    return false;
  }

  if (!granted.includes(':')) {
    return required.startsWith(`${granted}:`);
  }

  const grantedParts = granted.split(':');
  const requiredParts = required.split(':');
  const grantedAction = grantedParts[grantedParts.length - 1];
  const requiredAction = requiredParts[requiredParts.length - 1];

  return (
    grantedAction === 'write' &&
    requiredAction === 'read' &&
    samePrefix(grantedParts.slice(0, -1), requiredParts.slice(0, -1))
  );
}

/** Whether any granted role satisfies at least one of the required roles. */
export function hasScopedRole(grantedRoles: unknown, requiredRoles: string | string[]): boolean {
  if (!Array.isArray(grantedRoles)) {
    return false;
  }

  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const granted = grantedRoles.filter((role): role is string => typeof role === 'string');

  return required.some((requiredRole) =>
    granted.some((grantedRole) => roleGrantsAccess(grantedRole, requiredRole)),
  );
}
