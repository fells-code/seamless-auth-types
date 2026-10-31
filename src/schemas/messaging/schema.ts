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
  // Passed through as given, such as `List-Unsubscribe`. A transport that cannot send custom
  // headers ignores them, and the messaging transports refuse names that would inject more.
  headers: z.record(z.string(), z.string()).optional(),
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

export const SendEnrollmentInviteEmailInputSchema = z.object({
  to: z.string(),
  // The sign-in page. It carries no credential, so it signs nobody in on its own.
  signInUrl: z.string(),
  from: z.string().optional(),
  subject: z.string().optional(),
});

export type SendEnrollmentInviteEmailInput = z.infer<typeof SendEnrollmentInviteEmailInputSchema>;

/**
 * What the auth API tells a self-hosted server to deliver. The API never sends
 * the message itself when the adopter owns delivery, so this is the contract
 * between the two.
 */
/**
 * Why a code was sent, when it is not an ordinary sign-in or verification code. A server
 * that ignores it still delivers the code; one that reads it can warn the owner.
 */
export const DeliveryPurposeSchema = z.enum(['account_recovery']);

export type DeliveryPurpose = z.infer<typeof DeliveryPurposeSchema>;

/** The owner notices the auth API sends about something that happened to an account. */
export const AccountNoticeNameSchema = z.enum([
  'account_recovery_opened',
  'account_recovery_completed',
  'recovery_code_used',
  'identity_changed',
  'application_notice',
]);

export type AccountNoticeName = z.infer<typeof AccountNoticeNameSchema>;

/**
 * The registered application an `application_notice` was sent for. The text already says
 * so; this is for a server that renders the notice with its own template.
 */
export const AccountNoticeApplicationSchema = z.object({
  clientId: z.string(),
  name: z.string(),
});

export type AccountNoticeApplication = z.infer<typeof AccountNoticeApplicationSchema>;

export const AuthDeliverySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('otp_email'),
    to: z.string(),
    token: z.string(),
    purpose: DeliveryPurposeSchema.optional(),
  }),
  z.object({
    kind: z.literal('otp_sms'),
    to: z.string(),
    token: z.union([z.string(), z.number()]),
    purpose: DeliveryPurposeSchema.optional(),
  }),
  z.object({
    kind: z.literal('magic_link_email'),
    to: z.string(),
    token: z.string().optional(),
    magicLinkUrl: z.string(),
  }),
  z.object({
    kind: z.literal('enrollment_invite_email'),
    to: z.string(),
    // The sign-in page. It carries no credential, so it signs nobody in on its own.
    signInUrl: z.string(),
  }),
  // `subject` and `text` are ready to send as they are; `notice` lets a server use its
  // own template instead. `cancelUrl` carries a credential, so it must reach only `to`.
  z.object({
    kind: z.literal('account_notice_email'),
    notice: AccountNoticeNameSchema,
    to: z.string(),
    subject: z.string(),
    text: z.string(),
    cancelUrl: z.string().optional(),
    application: AccountNoticeApplicationSchema.optional(),
  }),
  z.object({
    kind: z.literal('account_notice_sms'),
    notice: AccountNoticeNameSchema,
    to: z.string(),
    text: z.string(),
    cancelUrl: z.string().optional(),
    application: AccountNoticeApplicationSchema.optional(),
  }),
]);

export type AuthDeliveryInstruction = z.infer<typeof AuthDeliverySchema>;
