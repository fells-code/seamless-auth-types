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

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

/** @deprecated Use {@link RefreshTokenRequestSchema}. */
export const RefreshRequestSchema = RefreshTokenRequestSchema;

/** @deprecated Use {@link RefreshTokenRequest}. */
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

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
  // Seconds, as everywhere else a ttl appears in this file. It was a string,
  // matching what the API sent, which left this the only ttl in the contract a
  // consumer could not treat like the others. A string reaching a cookie library
  // that requires an integer is a failed request, so the type states what the
  // value has to be rather than what it happened to be.
  ttl: z.number().optional(),
  delivery: AuthDeliverySchema.optional(),
});

export type RegistrationSuccessResponse = z.infer<typeof RegistrationSuccessSchema>;

export const RegisterPhoneRequestSchema = z.object({
  phone: z.string(),
});

export type RegisterPhoneRequest = z.infer<typeof RegisterPhoneRequestSchema>;

export const RegisterPhoneSuccessSchema = z.object({
  message: z.string(),
  phone: z.string(),
  delivery: AuthDeliverySchema.optional(),
});

export type RegisterPhoneSuccess = z.infer<typeof RegisterPhoneSuccessSchema>;

export const VerifyOTPRequestSchema = z.object({
  verificationToken: z.string(),
});

export type VerifyOTPRequest = z.infer<typeof VerifyOTPRequestSchema>;

export const OTPVerifyTokenSuccessSchema = RefreshSuccessResponseSchema.omit({
  sessionId: true,
});

export type OTPVerifyTokenSuccess = z.infer<typeof OTPVerifyTokenSuccessSchema>;

export const MagicLinkVerifyParamsSchema = z.object({
  token: z.string(),
});

export type MagicLinkVerifyParams = z.infer<typeof MagicLinkVerifyParamsSchema>;

export const MagicLinkPollSuccessSchema = RefreshSuccessResponseSchema.omit({
  sessionId: true,
  organizationId: true,
});

export type MagicLinkPollSuccess = z.infer<typeof MagicLinkPollSuccessSchema>;

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
