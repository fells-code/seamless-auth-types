import { describe, it, expect } from 'vitest';
import { RoleNameSchema, hasScopedRole, roleGrantsAccess } from './schema.js';
import * as matching from './matching.js';

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

describe('matching re-exports', () => {
  it('keeps the matcher importable from the schema module', () => {
    expect(roleGrantsAccess).toBe(matching.roleGrantsAccess);
    expect(hasScopedRole).toBe(matching.hasScopedRole);
  });
});
