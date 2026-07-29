import { describe, it, expect } from 'vitest';
import { RoleNameSchema, hasScopedRole, roleGrantsAccess } from './schema.js';

describe('RoleNameSchema', () => {
  it('accepts a plain role', () => {
    expect(RoleNameSchema.parse('admin')).toBe('admin');
  });

  it('accepts a scoped role', () => {
    expect(RoleNameSchema.parse('billing:invoices:read')).toBe('billing:invoices:read');
  });

  it('trims surrounding whitespace', () => {
    expect(RoleNameSchema.parse('  admin  ')).toBe('admin');
  });

  it.each(['bad role', 'bad_role', 'bad/role', 'bad\\role', '', 'a'.repeat(81)])(
    'rejects %j',
    (value) => {
      expect(() => RoleNameSchema.parse(value)).toThrow();
    },
  );
});

describe('roleGrantsAccess', () => {
  it('matches an identical role', () => {
    expect(roleGrantsAccess('admin', 'admin')).toBe(true);
  });

  it('grants everything under a wildcard', () => {
    expect(roleGrantsAccess('billing:*', 'billing')).toBe(true);
    expect(roleGrantsAccess('billing:*', 'billing:invoices:read')).toBe(true);
    expect(roleGrantsAccess('billing:*', 'users:read')).toBe(false);
  });

  it('grants every scope beneath an unscoped role', () => {
    expect(roleGrantsAccess('billing', 'billing:invoices')).toBe(true);
    expect(roleGrantsAccess('billing', 'billingx:invoices')).toBe(false);
  });

  it('lets write imply read at the same scope', () => {
    expect(roleGrantsAccess('billing:invoices:write', 'billing:invoices:read')).toBe(true);
    expect(roleGrantsAccess('billing:invoices:read', 'billing:invoices:write')).toBe(false);
    expect(roleGrantsAccess('billing:write', 'users:read')).toBe(false);
  });

  it('does not grant a narrower role to a broader requirement', () => {
    expect(roleGrantsAccess('billing:invoices', 'billing')).toBe(false);
  });

  it('rejects empty roles', () => {
    expect(roleGrantsAccess('', 'admin')).toBe(false);
    expect(roleGrantsAccess('admin', '   ')).toBe(false);
  });
});

describe('hasScopedRole', () => {
  it('passes when any granted role satisfies any requirement', () => {
    expect(hasScopedRole(['users:read', 'billing:write'], ['billing:read'])).toBe(true);
  });

  it('accepts a single required role', () => {
    expect(hasScopedRole(['admin'], 'admin')).toBe(true);
  });

  it('fails when nothing matches', () => {
    expect(hasScopedRole(['users:read'], ['billing:read'])).toBe(false);
  });

  it('ignores non-string entries', () => {
    expect(hasScopedRole([null, 42, 'admin'], 'admin')).toBe(true);
  });

  it('fails when granted roles are not an array', () => {
    expect(hasScopedRole('admin', 'admin')).toBe(false);
    expect(hasScopedRole(undefined, 'admin')).toBe(false);
  });
});
