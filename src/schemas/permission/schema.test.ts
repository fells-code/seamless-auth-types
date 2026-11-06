import { describe, it, expect } from 'vitest';
import {
  AccessTokenClaimsSchema,
  CreateOrganizationRoleRequestSchema,
  CreatePermissionRequestSchema,
  EffectivePermissionsResponseSchema,
  PermissionNameSchema,
  RoleDefinitionSchema,
  RolePermissionsParamSchema,
  SetRolePermissionsRequestSchema,
  UpdatePermissionRequestSchema,
  hasPermission,
} from './schema.js';
import * as matching from './matching.js';

describe('PermissionNameSchema', () => {
  it.each(['reports', 'invoices:read', 'billing:invoices:read'])('accepts %j', (value) => {
    expect(PermissionNameSchema.parse(value)).toBe(value);
  });

  it('trims surrounding whitespace', () => {
    expect(PermissionNameSchema.parse('  invoices:read  ')).toBe('invoices:read');
  });

  // A wildcard would read as a grant that exact matching never honors.
  it.each(['invoices:*', '*', 'bad name', 'bad_name', 'bad/name', '', 'a'.repeat(81)])(
    'rejects %j',
    (value) => {
      expect(() => PermissionNameSchema.parse(value)).toThrow();
    },
  );
});

describe('matching re-exports', () => {
  it('keeps the matcher importable from the schema module', () => {
    expect(hasPermission).toBe(matching.hasPermission);
  });
});

describe('permission requests', () => {
  it('needs a valid name to create', () => {
    expect(() => CreatePermissionRequestSchema.parse({})).toThrow();
    expect(CreatePermissionRequestSchema.parse({ name: 'a:b' })).toEqual({ name: 'a:b' });
  });

  it('clears a description with null, and needs the key to be explicit', () => {
    expect(UpdatePermissionRequestSchema.parse({ description: null }).description).toBeNull();
    expect(() => UpdatePermissionRequestSchema.parse({})).toThrow();
  });
});

describe('role definitions', () => {
  const role = {
    name: 'finance',
    kind: 'organization',
    description: null,
    builtIn: false,
    permissions: ['invoices:read'],
  };

  it('parses a role', () => {
    expect(RoleDefinitionSchema.parse(role)).toEqual(role);
  });

  it('reads a legacy organization role whose name a new one could not use', () => {
    expect(RoleDefinitionSchema.parse({ ...role, name: 'Team Lead' }).name).toBe('Team Lead');
  });

  it('holds a new organization role to the role name pattern', () => {
    expect(() => CreateOrganizationRoleRequestSchema.parse({ name: 'Team Lead' })).toThrow();
    expect(CreateOrganizationRoleRequestSchema.parse({ name: 'team-lead' }).name).toBe('team-lead');
  });

  it('addresses a legacy role by path', () => {
    expect(
      RolePermissionsParamSchema.parse({ kind: 'organization', roleName: 'Team Lead' }),
    ).toEqual({ kind: 'organization', roleName: 'Team Lead' });
  });

  it('refuses an unknown role kind', () => {
    expect(() => RolePermissionsParamSchema.parse({ kind: 'global', roleName: 'x' })).toThrow();
  });

  it('caps a mapping and refuses a wildcard in it', () => {
    expect(() =>
      SetRolePermissionsRequestSchema.parse({
        permissions: Array.from({ length: 201 }, (_, index) => `p:${index}`),
      }),
    ).toThrow();
    expect(() => SetRolePermissionsRequestSchema.parse({ permissions: ['a:*'] })).toThrow();
  });
});

describe('AccessTokenClaimsSchema', () => {
  const claims = { sub: 'user-1', sid: 'session-1', typ: 'access' };

  it('parses a token with no authorization claims', () => {
    expect(AccessTokenClaimsSchema.parse(claims)).toEqual(claims);
  });

  it('parses a token with the active organization', () => {
    const withOrganization = {
      ...claims,
      roles: ['user'],
      permissions: ['reports:read'],
      org_id: 'org-1',
      org_roles: ['admin'],
      org_permissions: ['projects:write'],
    };

    expect(AccessTokenClaimsSchema.parse(withOrganization)).toEqual(withOrganization);
  });

  it('keeps a claim it does not know', () => {
    expect(AccessTokenClaimsSchema.parse({ ...claims, later: 1 }).later).toBe(1);
  });

  it('refuses another token type', () => {
    expect(() => AccessTokenClaimsSchema.parse({ ...claims, typ: 'ephemeral' })).toThrow();
  });

  it('refuses permissions that are not a list', () => {
    expect(() => AccessTokenClaimsSchema.parse({ ...claims, permissions: 'a:b' })).toThrow();
  });
});

describe('EffectivePermissionsResponseSchema', () => {
  it('parses a caller with no active organization', () => {
    const body = {
      roles: ['user'],
      permissions: [],
      organizationId: null,
      organizationRoles: [],
      organizationPermissions: [],
    };

    expect(EffectivePermissionsResponseSchema.parse(body)).toEqual(body);
  });
});
