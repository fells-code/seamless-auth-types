import { z } from 'zod';

/**
 * Shared by every outbound callout the API makes to an adopter-supplied destination: webhook
 * endpoints, login hooks and audit sinks (API ADR 0005).
 *
 * These schemas only check the shape of a URL. Whether a host may be reached (public address,
 * https in production, the operator's private host list) is decided by the API, which resolves
 * the name at connect time.
 */
export const CalloutUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .superRefine((value, ctx) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'must be an absolute URL' });
      return;
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      ctx.addIssue({ code: 'custom', message: 'must use https' });
    }
    // Credentials in a URL end up in logs and the delivery view.
    if (url.username || url.password) {
      ctx.addIssue({ code: 'custom', message: 'must not carry a username or password' });
    }
    if (url.hash) {
      ctx.addIssue({ code: 'custom', message: 'must not carry a fragment' });
    }
  });

export type CalloutUrl = z.infer<typeof CalloutUrlSchema>;

/**
 * Why a callout failed, as shown to administrators. Deliberately coarse: the resolved address
 * and the socket's own error text are never shown, so a delivery log cannot be used to map the
 * network the API runs on.
 *
 * `refused` means the API would not connect to the destination's address. `misconfigured`
 * means the destination's own configuration cannot be used, such as a secret it names that the
 * server does not have, so no call was attempted.
 */
export const CalloutFailureSchema = z.enum([
  'refused',
  'misconfigured',
  'timed_out',
  'connection_failed',
  'http_status',
  'invalid_response',
  'too_large',
]);

export type CalloutFailure = z.infer<typeof CalloutFailureSchema>;

/** The result of a test call from the console or CLI. */
export const CalloutTestResponseSchema = z.object({
  ok: z.boolean(),
  failure: CalloutFailureSchema.nullable(),
  statusCode: z.number().int().nullable(),
  durationMs: z.number().int().nonnegative(),
});

export type CalloutTestResponse = z.infer<typeof CalloutTestResponseSchema>;

/**
 * A Standard Webhooks symmetric secret: `whsec_` and the base64 of 32 random bytes. Webhooks and
 * login hooks are signed the same way, so a hook service can prove a call came from Seamless.
 */
export const CalloutSecretSchema = z.string().regex(/^whsec_[A-Za-z0-9+/]{43}=$/);

export type CalloutSecret = z.infer<typeof CalloutSecretSchema>;
