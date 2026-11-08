import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import {
  CUSTOM_CLAIM_MAX_DEPTH,
  CUSTOM_CLAIM_NAME_PATTERN,
  CUSTOM_CLAIMS_BUDGET_BYTES,
  claimValueDepth,
  customClaimsByteLength,
  isReservedClaimName,
} from './reserved.js';

export * from './reserved.js';

/**
 * Static custom claims (API ADR 0005). Sources, lowest precedence first: an instance role, an
 * organization role (only while that organization is active), an OpenID Provider client
 * (provider tokens only), then the `pre_token` login hook. A later source overwrites an earlier
 * one for the same name. Values are literal JSON, with no templating.
 */
export const CustomClaimRoutes = {
  claims: '/admin/custom-claims',
  sourceClaims: '/admin/custom-claims/:sourceKind/:sourceName',
} as const;

export const CustomClaimSourceKindSchema = z.enum([
  'instance_role',
  'organization_role',
  'oidc_client',
]);

export type CustomClaimSourceKind = z.infer<typeof CustomClaimSourceKindSchema>;

export const CustomClaimNameSchema = z
  .string()
  .regex(CUSTOM_CLAIM_NAME_PATTERN)
  .refine((name) => !isReservedClaimName(name), 'is a reserved claim name');

export type CustomClaimName = z.infer<typeof CustomClaimNameSchema>;

export const CustomClaimValueSchema = z
  .json()
  .refine(
    (value) => claimValueDepth(value) <= CUSTOM_CLAIM_MAX_DEPTH,
    `must not nest deeper than ${CUSTOM_CLAIM_MAX_DEPTH} levels`,
  );

export type CustomClaimValue = z.infer<typeof CustomClaimValueSchema>;

/** A set of claims, held whole to the token budget so no single source can exceed it alone. */
export const CustomClaimSetSchema = z
  .record(CustomClaimNameSchema, CustomClaimValueSchema)
  .refine(
    (claims) => customClaimsByteLength(claims) <= CUSTOM_CLAIMS_BUDGET_BYTES,
    `must fit in ${CUSTOM_CLAIMS_BUDGET_BYTES} bytes serialized`,
  );

export type CustomClaimSet = z.infer<typeof CustomClaimSetSchema>;

export const CustomClaimSourceParamSchema = z.object({
  sourceKind: CustomClaimSourceKindSchema,
  /** A role name, or an OpenID Provider client id. */
  sourceName: z.string().min(1).max(200),
});

export type CustomClaimSourceParam = z.infer<typeof CustomClaimSourceParamSchema>;

/** Replaces the source's whole set, so a stale claim cannot be left behind by omission. */
export const SetCustomClaimsRequestSchema = z.object({
  claims: CustomClaimSetSchema,
});

export type SetCustomClaimsRequest = z.infer<typeof SetCustomClaimsRequestSchema>;

export const CustomClaimSourceSchema = z.object({
  sourceKind: CustomClaimSourceKindSchema,
  sourceName: z.string(),
  claims: z.record(z.string(), z.json()),
  updatedAt: IsoDate,
});

export type CustomClaimSource = z.infer<typeof CustomClaimSourceSchema>;

export const CustomClaimSourceResponseSchema = z.object({ source: CustomClaimSourceSchema });

export type CustomClaimSourceResponse = z.infer<typeof CustomClaimSourceResponseSchema>;

export const CustomClaimListResponseSchema = z.object({
  sources: z.array(CustomClaimSourceSchema),
  /** So the console can show which names are refused without its own copy of the list. */
  reservedNames: z.array(z.string()),
  reservedPrefixes: z.array(z.string()),
  budgetBytes: z.number().int().positive(),
});

export type CustomClaimListResponse = z.infer<typeof CustomClaimListResponseSchema>;
