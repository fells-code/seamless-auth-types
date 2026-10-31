import { z } from 'zod';

import { AuthDeliverySchema, MessagingChannelSchema } from '../messaging/schema.js';

/**
 * A registered application telling one of its users something on that user's verified
 * channels, without holding their email or phone (ADR 0001, D14). The route is on the
 * private API and takes a client credentials token for the built-in resource
 * `<oidc_issuer>/seamless` with scope `notices:send`.
 *
 * The API sends the text inside a fixed template naming the application and the instance,
 * so an application cannot pose as a Seamless security notice.
 */
export const ApplicationNoticeRoutes = {
  send: '/applications/account-notices',
} as const;

export const APPLICATION_NOTICE_SCOPE = 'notices:send';

/** The resource identifier an application asks for to get a notices token. */
export function seamlessBuiltInResource(oidcIssuer: string) {
  return `${oidcIssuer.replace(/\/+$/, '')}/seamless`;
}

// No control characters at all in the subject, since it becomes an email header.
const SINGLE_LINE = /^[^\u0000-\u001f\u007f]+$/;
const PLAIN_TEXT = /^[^\u0000-\u0009\u000b-\u001f\u007f]+$/;

export const SendApplicationNoticeRequestSchema = z.object({
  userId: z.uuid(),
  /** Every verified channel when omitted. */
  channels: z
    .array(MessagingChannelSchema)
    .min(1)
    .refine((channels) => new Set(channels).size === channels.length, 'Channels must be unique')
    .optional(),
  subject: z.string().trim().min(1).max(120).regex(SINGLE_LINE),
  text: z.string().trim().min(1).max(2000).regex(PLAIN_TEXT),
  /** Must be https, on the origin of one of the application's registered redirect URIs. */
  actionUrl: z
    .url({ protocol: /^https$/ })
    .max(2048)
    .optional(),
});

export type SendApplicationNoticeRequest = z.infer<typeof SendApplicationNoticeRequestSchema>;

export const ApplicationNoticeStatusSchema = z.enum([
  'sent',
  'failed',
  'returned_for_external_delivery',
  'not_sent_external_delivery',
]);

export type ApplicationNoticeStatus = z.infer<typeof ApplicationNoticeStatusSchema>;

export const ApplicationNoticeChannelResultSchema = z.object({
  channel: MessagingChannelSchema,
  status: ApplicationNoticeStatusSchema,
});

export type ApplicationNoticeChannelResult = z.infer<typeof ApplicationNoticeChannelResultSchema>;

/**
 * Channels, never addresses. `deliveries` is only present for a caller that owns delivery
 * (the server adapter's service token and `x-seamless-auth-delivery-mode: external`) and
 * lists `account_notice_email` / `account_notice_sms` in `x-seamless-auth-delivery-kinds`.
 */
export const SendApplicationNoticeResponseSchema = z.object({
  channels: z.array(ApplicationNoticeChannelResultSchema),
  deliveries: z.array(AuthDeliverySchema).optional(),
});

export type SendApplicationNoticeResponse = z.infer<typeof SendApplicationNoticeResponseSchema>;

/**
 * `notice_unknown_user` covers both a user that does not exist and one with no grant for
 * the application, so an application cannot learn who else has an account.
 */
export const ApplicationNoticeErrorCodeSchema = z.enum([
  'notice_invalid_token',
  'notice_not_enabled',
  'notice_unknown_user',
  'notice_no_channel',
  'notice_action_url_not_allowed',
  'notice_rate_limited',
]);

export type ApplicationNoticeErrorCode = z.infer<typeof ApplicationNoticeErrorCodeSchema>;

export const ApplicationNoticeErrorResponseSchema = z.object({
  error: ApplicationNoticeErrorCodeSchema,
  message: z.string().optional(),
});

export type ApplicationNoticeErrorResponse = z.infer<typeof ApplicationNoticeErrorResponseSchema>;
