import { z } from 'zod';

export const MessagingChannelSchema = z.enum(['email', 'sms']);

export type MessagingChannel = z.infer<typeof MessagingChannelSchema>;

export const DeliveryResultSchema = z.object({
  accepted: z.boolean(),
  provider: z.string(),
  channel: MessagingChannelSchema,
  messageId: z.string().optional(),
  raw: z.unknown().optional(),
});

export type DeliveryResult = z.infer<typeof DeliveryResultSchema>;

export const EmailMessageSchema = z.object({
  to: z.string(),
  from: z.string().optional(),
  subject: z.string(),
  text: z.string(),
  html: z.string().optional(),
});

export type EmailMessage = z.infer<typeof EmailMessageSchema>;

export const SmsMessageSchema = z.object({
  to: z.string(),
  from: z.string().optional(),
  body: z.string(),
});

export type SmsMessage = z.infer<typeof SmsMessageSchema>;

export const SendOtpEmailInputSchema = z.object({
  to: z.string(),
  token: z.string(),
  from: z.string().optional(),
  subject: z.string().optional(),
});

export type SendOtpEmailInput = z.infer<typeof SendOtpEmailInputSchema>;

export const SendOtpSmsInputSchema = z.object({
  to: z.string(),
  token: z.union([z.string(), z.number()]),
  from: z.string().optional(),
});

export type SendOtpSmsInput = z.infer<typeof SendOtpSmsInputSchema>;

export const SendMagicLinkEmailInputSchema = z.object({
  to: z.string(),
  magicLinkUrl: z.string(),
  token: z.string().optional(),
  from: z.string().optional(),
  subject: z.string().optional(),
});

export type SendMagicLinkEmailInput = z.infer<typeof SendMagicLinkEmailInputSchema>;

/**
 * What the auth API tells a self-hosted server to deliver. The API never sends
 * the message itself when the adopter owns delivery, so this is the contract
 * between the two.
 */
export const AuthDeliverySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('otp_email'),
    to: z.string(),
    token: z.string(),
  }),
  z.object({
    kind: z.literal('otp_sms'),
    to: z.string(),
    token: z.union([z.string(), z.number()]),
  }),
  z.object({
    kind: z.literal('magic_link_email'),
    to: z.string(),
    token: z.string().optional(),
    magicLinkUrl: z.string(),
  }),
]);

export type AuthDeliveryInstruction = z.infer<typeof AuthDeliverySchema>;
