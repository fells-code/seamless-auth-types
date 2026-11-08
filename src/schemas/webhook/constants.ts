/**
 * Webhook constants, free of Zod so a receiver's verifier can import them through the
 * `./webhook/constants` subpath without the dependency.
 *
 * Seamless signs webhooks and login hook calls with the Standard Webhooks scheme
 * (https://github.com/standard-webhooks/standard-webhooks, `spec/standard-webhooks.md`): the
 * signed content is `${id}.${timestamp}.${body}`, signed with HMAC-SHA256 and sent as
 * `v1,<base64 signature>`. While a secret rotates, the header carries one signature per
 * secret, separated by a space.
 */

export const WEBHOOK_ID_HEADER = 'webhook-id';
export const WEBHOOK_TIMESTAMP_HEADER = 'webhook-timestamp';
export const WEBHOOK_SIGNATURE_HEADER = 'webhook-signature';

export const WEBHOOK_SIGNATURE_VERSION = 'v1';
export const WEBHOOK_SECRET_PREFIX = 'whsec_';

/** How far a receiver should accept a `webhook-timestamp` from its own clock, either way. */
export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;

/** How long a rotated secret keeps signing beside its replacement. */
export const WEBHOOK_SECRET_ROTATION_OVERLAP_SECONDS = 24 * 60 * 60;

/**
 * Delay before each attempt, counted from the previous one. The first is immediate; after the
 * last a delivery is dead, just under 42 hours after the event.
 */
export const WEBHOOK_RETRY_SCHEDULE_SECONDS = [0, 5, 300, 1800, 7200, 18000, 36000, 86400] as const;

/** A delivery gets a response within this long, or the attempt fails. */
export const WEBHOOK_TIMEOUT_MS = 15_000;

/** An endpoint whose every delivery has failed for this long is disabled. */
export const WEBHOOK_FAILING_DISABLE_SECONDS = 3 * 24 * 60 * 60;
