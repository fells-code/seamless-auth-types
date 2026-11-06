import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { hasAllPermissions, hasPermission } from './matching.js';

describe('matching module', () => {
  it('stays free of Zod so consumers can import it without the dependency', () => {
    const source = readFileSync(new URL('./matching.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from ['"]zod/);
  });
});

describe('hasPermission', () => {
  it('matches an exact permission', () => {
    expect(hasPermission(['invoices:read'], 'invoices:read')).toBe(true);
  });

  it('passes when any required permission is held', () => {
    expect(hasPermission(['invoices:read'], ['invoices:write', 'invoices:read'])).toBe(true);
  });

  it.each([
    ['write does not imply read', ['invoices:write'], 'invoices:read'],
    ['a parent does not grant a child', ['invoices'], 'invoices:read'],
    ['a child does not grant a parent', ['invoices:read'], 'invoices'],
    ['a wildcard is not special', ['invoices:*'], 'invoices:read'],
    ['case is significant', ['Invoices:read'], 'invoices:read'],
  ])('refuses when %s', (_name, granted, required) => {
    expect(hasPermission(granted, required)).toBe(false);
  });

  it.each([[undefined], [null], ['invoices:read'], [{ 'invoices:read': true }]])(
    'refuses a granted value of %j',
    (granted) => {
      expect(hasPermission(granted, 'invoices:read')).toBe(false);
    },
  );

  it('ignores non-string entries', () => {
    expect(hasPermission([1, null, 'invoices:read'], 'invoices:read')).toBe(true);
  });

  it('refuses when nothing is required', () => {
    expect(hasPermission(['invoices:read'], [])).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('passes only when every required permission is held', () => {
    const granted = ['invoices:read', 'invoices:write'];

    expect(hasAllPermissions(granted, ['invoices:read', 'invoices:write'])).toBe(true);
    expect(hasAllPermissions(granted, ['invoices:read', 'reports:read'])).toBe(false);
  });

  it('refuses when nothing is required', () => {
    expect(hasAllPermissions(['invoices:read'], [])).toBe(false);
  });

  it('refuses a granted value that is not a list', () => {
    expect(hasAllPermissions(undefined, 'invoices:read')).toBe(false);
  });
});
