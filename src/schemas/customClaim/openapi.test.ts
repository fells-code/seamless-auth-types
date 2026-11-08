import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Zod 4 attaches methods per instance, so the extension has to run before the schemas are built.
// The API generates its OpenAPI document this way.
extendZodWithOpenApi(z);
const schemas = await import('../../index.js');

function generate(entries: Record<string, z.ZodType>) {
  const registry = new OpenAPIRegistry();
  for (const [name, schema] of Object.entries(entries)) registry.register(name, schema);
  return new OpenApiGeneratorV3(registry.definitions).generateComponents();
}

describe('OpenAPI generation', () => {
  it('overflows on a recursive JSON schema, which is why claim values are spelled out', () => {
    expect(() => generate({ Json: z.object({ value: z.json() }) })).toThrow(RangeError);
  });

  it('describes every schema that carries a custom claim value', () => {
    const { components } = generate({
      CustomClaimValue: schemas.CustomClaimValueSchema,
      SetCustomClaimsRequest: schemas.SetCustomClaimsRequestSchema,
      CustomClaimSourceResponse: schemas.CustomClaimSourceResponseSchema,
      CustomClaimListResponse: schemas.CustomClaimListResponseSchema,
      OidcAccountClaims: schemas.OidcAccountClaimsSchema,
    });

    expect(Object.keys(components?.schemas ?? {})).toEqual(
      expect.arrayContaining(['CustomClaimValue', 'SetCustomClaimsRequest', 'OidcAccountClaims']),
    );
  });
});
