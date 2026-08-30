import { z } from 'zod';

const BooleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

/**
 * PRF salts are validated for length and encoding by the server, which owns the
 * rule. This schema only asserts the wire shape so both sides agree on it.
 */
export const WebAuthnPrfRequestSchema = z.object({
  salt: z.string(),
  secondSalt: z.string().optional(),
});

export type WebAuthnPrfRequest = z.infer<typeof WebAuthnPrfRequestSchema>;

export const WebAuthnRegisterStartQuerySchema = z.object({
  requestPrf: BooleanQuerySchema,
  requirePrf: BooleanQuerySchema,
});

export type WebAuthnRegisterStartQuery = z.infer<typeof WebAuthnRegisterStartQuerySchema>;

export const WebAuthnAssertionStartSchema = z
  .object({
    credentialId: z.string().optional(),
    prf: WebAuthnPrfRequestSchema.optional(),
  })
  .default({});

export type WebAuthnAssertionStart = z.infer<typeof WebAuthnAssertionStartSchema>;

export const WebAuthnCredentialMetadataSchema = z.object({
  friendlyName: z.string().optional(),
  platform: z.string().optional(),
  browser: z.string().optional(),
  deviceInfo: z.string().optional(),
  prfCapable: z.boolean().optional(),
});

export type WebAuthnCredentialMetadata = z.infer<typeof WebAuthnCredentialMetadataSchema>;

export const WebAuthnRegisterFinishSchema = z.object({
  attestationResponse: z.record(z.string(), z.unknown()),
  metadata: WebAuthnCredentialMetadataSchema.optional(),
});

export type WebAuthnRegisterFinish = z.infer<typeof WebAuthnRegisterFinishSchema>;

export const WebAuthnLoginFinishSchema = z.object({
  assertionResponse: z.record(z.string(), z.unknown()),
});

export type WebAuthnLoginFinish = z.infer<typeof WebAuthnLoginFinishSchema>;

/**
 * The credential creation and request options are passed through to the browser
 * verbatim, so they are not narrowed here.
 */
export const WebAuthnChallengeSchema = z.record(z.string(), z.unknown());

export type WebAuthnChallenge = z.infer<typeof WebAuthnChallengeSchema>;

export const WebAuthnTokenSuccessSchema = z.object({
  message: z.string(),
  token: z.string().optional(),
  refreshToken: z.string().optional(),
  refreshTokenHash: z.string().optional(),

  sub: z.string().optional(),
  roles: z.array(z.string()).optional(),
  email: z.string().optional(),
  phone: z.string().nullable().optional(),

  ttl: z.number().optional(),
  refreshTtl: z.number().optional(),
});

export type WebAuthnTokenSuccessResponse = z.infer<typeof WebAuthnTokenSuccessSchema>;

/**
 * Machine-readable codes the auth API returns as the whole of an error body's
 * `error` field, for WebAuthn failures a client can act on.
 *
 * Published here for the same reason as `OAUTH_ERROR_CODES`: a consumer that
 * declares its own copy has no way to find out when the API adds a code, and
 * degrades to generic messaging with nothing failing anywhere. Checking a local
 * map against this union with `Record<WebAuthnErrorCode, true>` turns that into
 * a compile error.
 *
 * The remaining WebAuthn failures answer with prose rather than a code, so they
 * are deliberately absent rather than forgotten.
 */
export const WEBAUTHN_ERROR_CODES = [
  /** Registration asked for an attachment the deployment's policy does not allow. */
  'attachment_not_allowed',
  /** The credential is backup eligible and the deployment blocks synced passkeys. */
  'synced_passkey_not_allowed',
  /** The authenticator model is denied, or absent from a non-empty allow list. */
  'authenticator_not_allowed',
  /** Registration required a PRF-capable credential and the one offered was not. */
  'prf_required',
  /** An assertion carried PRF output, which must never leave the client. */
  'prf_output_not_allowed',
] as const;

export const WebAuthnErrorCodeSchema = z.enum(WEBAUTHN_ERROR_CODES);

export type WebAuthnErrorCode = z.infer<typeof WebAuthnErrorCodeSchema>;

export const WebAuthnErrorResponseSchema = z.object({
  error: z.string(),
});

export type WebAuthnErrorResponse = z.infer<typeof WebAuthnErrorResponseSchema>;
