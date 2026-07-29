import { z } from 'zod';

export const TotpVerifyRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export type TotpVerifyRequest = z.infer<typeof TotpVerifyRequestSchema>;

export const TotpStatusSchema = z.object({
  enabled: z.boolean(),
  verifiedAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
});

export type TotpStatus = z.infer<typeof TotpStatusSchema>;

export const TotpEnrollmentStartSchema = z.object({
  message: z.string(),
  secret: z.string(),
  otpauthUrl: z.string(),
  issuer: z.string(),
  accountName: z.string(),
  algorithm: z.literal('SHA1'),
  digits: z.number(),
  period: z.number(),
});

export type TotpEnrollmentStartResponse = z.infer<typeof TotpEnrollmentStartSchema>;

export const TotpVerifySuccessSchema = z.object({
  message: z.string(),
});
