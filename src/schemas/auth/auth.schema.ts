import z from 'zod';
import { AuthDeliverySchema } from '../messaging/schema.js';
import { LoginMethodSchema } from '../systemConfig/schema.js';

export const IdentifierTypeSchema = z.enum(['email', 'phone']);

export type IdentifierType = z.infer<typeof IdentifierTypeSchema>;

export const LoginRequestSchema = z.object({
  identifier: z.string(),
  passkeyAvailable: z.boolean().optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginSuccessResponseSchema = z.object({
  message: z.string(),
  token: z.string().optional(),
  sub: z.string().optional(),
  identifierType: IdentifierTypeSchema.optional(),
  loginMethods: z.array(LoginMethodSchema).optional(),
  ttl: z.number().optional(),
});

export type LoginSuccessResponse = z.infer<typeof LoginSuccessResponseSchema>;

export const RefreshTokenRequestSchema = z.object({});

/** @deprecated Use {@link RefreshTokenRequestSchema}. */
export const RefreshRequestSchema = RefreshTokenRequestSchema;

/**
 * The token envelope every completed authentication returns, whatever the
 * method. `sessionId` is only present where the flow names the session it
 * created; OTP, magic link, and OAuth completions omit it.
 */
export const RefreshSuccessResponseSchema = z.object({
  message: z.string(),
  token: z.string().optional(),
  refreshToken: z.string().optional(),
  sub: z.string().optional(),
  sessionId: z.string().optional(),
  organizationId: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
  email: z.string().optional(),
  phone: z.string().nullable().optional(),
  ttl: z.number().optional(),
  refreshTtl: z.number().optional(),
});

export type RefreshSuccessResponse = z.infer<typeof RefreshSuccessResponseSchema>;

export const LogoutScopeSchema = z.enum(['current_session', 'all_sessions']);

export type LogoutScope = z.infer<typeof LogoutScopeSchema>;

export const RegistrationRequestSchema = z.object({
  email: z.email(),
  // Registration only needs an email. A phone can be added and verified later.
  phone: z.string().nullish(),
});

export type RegistrationRequest = z.infer<typeof RegistrationRequestSchema>;

export const RegistrationSuccessSchema = z.object({
  message: z.string(),
  sub: z.string().optional(),
  token: z.string().optional(),
  ttl: z.string().optional(),
  delivery: AuthDeliverySchema.optional(),
});

export type RegistrationSuccessResponse = z.infer<typeof RegistrationSuccessSchema>;

export const RegisterPhoneRequestSchema = z.object({
  phone: z.string(),
});

export const RegisterPhoneSuccessSchema = z.object({
  message: z.string(),
  phone: z.string(),
  delivery: AuthDeliverySchema.optional(),
});

export const VerifyOTPRequestSchema = z.object({
  verificationToken: z.string(),
});

export const OTPVerifyTokenSuccessSchema = RefreshSuccessResponseSchema.omit({
  sessionId: true,
});

export const MagicLinkVerifyParamsSchema = z.object({
  token: z.string(),
});

export const MagicLinkPollSuccessSchema = RefreshSuccessResponseSchema.omit({
  sessionId: true,
  organizationId: true,
});

/** Body for endpoints that acknowledge a request and may hand back a delivery. */
export const AuthMessageResponseSchema = z.object({
  message: z.string(),
  token: z.string().optional(),
  delivery: AuthDeliverySchema.optional(),
});

export type AuthMessageResponse = z.infer<typeof AuthMessageResponseSchema>;

/** The access token's claims, as a resource server reads them off a request. */
export const SeamlessAuthUserSchema = z.object({
  id: z.string(),
  roles: z.array(z.string()),
  email: z.string().optional(),
  phone: z.string().nullable().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
  token: z.string().optional(),
});

export type SeamlessAuthUser = z.infer<typeof SeamlessAuthUserSchema>;
