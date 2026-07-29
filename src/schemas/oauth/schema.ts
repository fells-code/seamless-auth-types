import { z } from 'zod';
import { RefreshSuccessResponseSchema } from '../auth/auth.schema.js';
import { OAuthProviderIdSchema } from '../systemConfig/schema.js';

export const OAuthProviderParamSchema = z.object({
  providerId: OAuthProviderIdSchema,
});

export type OAuthProviderParam = z.infer<typeof OAuthProviderParamSchema>;

/** A provider as an unauthenticated client may see it: no client or secret material. */
export const PublicOAuthProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  scopes: z.array(z.string()),
});

export type PublicOAuthProvider = z.infer<typeof PublicOAuthProviderSchema>;

export const OAuthProvidersResponseSchema = z.object({
  providers: z.array(PublicOAuthProviderSchema),
});

export type OAuthProvidersResponse = z.infer<typeof OAuthProvidersResponseSchema>;

export const StartOAuthLoginRequestSchema = z.object({
  redirectUri: z.url().optional(),
  returnTo: z.url().optional(),
});

export type StartOAuthLoginRequest = z.infer<typeof StartOAuthLoginRequestSchema>;

export const StartOAuthLoginResponseSchema = z.object({
  provider: PublicOAuthProviderSchema,
  state: z.string(),
  authorizationUrl: z.url(),
});

export type StartOAuthLoginResponse = z.infer<typeof StartOAuthLoginResponseSchema>;

export const FinishOAuthLoginRequestSchema = z.object({
  code: z.string().trim().min(1),
  state: z.string().trim().min(1),
});

export type FinishOAuthLoginRequest = z.infer<typeof FinishOAuthLoginRequestSchema>;

export const OAuthLoginSuccessResponseSchema = RefreshSuccessResponseSchema.omit({
  sessionId: true,
});

export type OAuthLoginSuccessResponse = z.infer<typeof OAuthLoginSuccessResponseSchema>;

export const OAUTH_ERROR_CODES = [
  'oauth_missing_email',
  'oauth_email_not_verified',
  'oauth_missing_subject',
] as const;

export const OAuthErrorCodeSchema = z.enum(OAUTH_ERROR_CODES);

export type OAuthErrorCode = z.infer<typeof OAuthErrorCodeSchema>;

export const OAuthLoginErrorResponseSchema = z.object({
  message: z.string().optional(),
  error: z.string(),
  code: OAuthErrorCodeSchema.optional(),
});

export type OAuthLoginErrorResponse = z.infer<typeof OAuthLoginErrorResponseSchema>;
