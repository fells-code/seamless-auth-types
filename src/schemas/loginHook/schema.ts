import { z } from 'zod';
import { IsoDate } from '../../shared.js';
import { CalloutFailureSchema, CalloutSecretSchema, CalloutUrlSchema } from '../callout/schema.js';

/**
 * Login hooks: HTTPS callouts the API makes during sign-in (API ADR 0005). One hook per trigger.
 * Calls are signed with the Standard Webhooks scheme, like webhooks, so a hook service can check
 * they came from Seamless.
 *
 * - `post_login` runs once the factor is proven and before the session exists. It may allow or
 *   deny.
 * - `pre_token` runs when a token is minted for a new session and on organization switch. It may
 *   add claims or deny. It is not called on refresh: its claims are kept on the session.
 *
 * Break-glass sign-in and recovery sessions never call a hook, so a hook that is down cannot lock
 * out the administrator who would fix it.
 */
export const LoginHookRoutes = {
  hooks: '/admin/login-hooks',
  hook: '/admin/login-hooks/:trigger',
  hookSecret: '/admin/login-hooks/:trigger/secret',
  hookTest: '/admin/login-hooks/:trigger/test',
  invocations: '/admin/login-hooks/:trigger/invocations',
} as const;

export const LoginHookTriggerSchema = z.enum(['post_login', 'pre_token']);

export type LoginHookTrigger = z.infer<typeof LoginHookTriggerSchema>;

/**
 * What happens when a hook times out, answers other than 2xx, or returns a body that does not
 * parse or does not fit the claims budget. `closed` fails the sign-in; `open` lets it continue
 * without the hook's claims.
 */
export const LoginHookFailureModeSchema = z.enum(['open', 'closed']);

export type LoginHookFailureMode = z.infer<typeof LoginHookFailureModeSchema>;

export const LOGIN_HOOK_DEFAULT_TIMEOUT_MS = 2000;
export const LOGIN_HOOK_MAX_TIMEOUT_MS = 5000;
export const LOGIN_HOOK_MIN_TIMEOUT_MS = 100;

export const LoginHookSchema = z.object({
  trigger: LoginHookTriggerSchema,
  url: z.string(),
  timeoutMs: z.number().int(),
  failureMode: LoginHookFailureModeSchema,
  enabled: z.boolean(),
  previousSecretExpiresAt: IsoDate.nullable(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});

export type LoginHook = z.infer<typeof LoginHookSchema>;

export const LoginHookTriggerParamSchema = z.object({ trigger: LoginHookTriggerSchema });

export type LoginHookTriggerParam = z.infer<typeof LoginHookTriggerParamSchema>;

/** Creates the trigger's hook or replaces its settings. The secret survives a replace. */
export const SetLoginHookRequestSchema = z.object({
  url: CalloutUrlSchema,
  timeoutMs: z
    .number()
    .int()
    .min(LOGIN_HOOK_MIN_TIMEOUT_MS)
    .max(LOGIN_HOOK_MAX_TIMEOUT_MS)
    .default(LOGIN_HOOK_DEFAULT_TIMEOUT_MS),
  failureMode: LoginHookFailureModeSchema.default('closed'),
  enabled: z.boolean().default(true),
});

export type SetLoginHookRequest = z.infer<typeof SetLoginHookRequestSchema>;

export const LoginHookResponseSchema = z.object({
  hook: LoginHookSchema,
  /** Present only when this call created the hook. It cannot be read back. */
  secret: CalloutSecretSchema.optional(),
});

export type LoginHookResponse = z.infer<typeof LoginHookResponseSchema>;

export const LoginHookListResponseSchema = z.object({ hooks: z.array(LoginHookSchema) });

export type LoginHookListResponse = z.infer<typeof LoginHookListResponseSchema>;

export const LoginHookSecretRotatedResponseSchema = z.object({
  secret: CalloutSecretSchema,
  previousSecretExpiresAt: IsoDate,
});

export type LoginHookSecretRotatedResponse = z.infer<typeof LoginHookSecretRotatedResponseSchema>;

/** The body Seamless sends a hook. It never carries a token, code or secret. */
export const LoginHookCallSchema = z.object({
  /** The invocation id, which is also the `webhook-id` header. */
  id: z.string(),
  trigger: LoginHookTriggerSchema,
  timestamp: IsoDate,
  user: z.object({
    id: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    roles: z.array(z.string()),
  }),
  /** How the sign-in was completed, such as `passkey` or `otp`. */
  method: z.string().nullable(),
  organization: z.object({ id: z.string(), roles: z.array(z.string()) }).nullable(),
  /** The OpenID Provider client the sign-in is for, if any. */
  client: z.object({ id: z.string(), name: z.string().nullable() }).nullable(),
  request: z.object({
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
  }),
});

export type LoginHookCall = z.infer<typeof LoginHookCallSchema>;

const decision = {
  decision: z.enum(['allow', 'deny']),
  /** Audited, never shown to the user, since it may hold internal detail. */
  reason: z.string().max(500).optional(),
  /** Shown on the sign-in screen when the hook denies. Plain text. */
  userMessage: z.string().max(200).optional(),
};

/** A `post_login` hook decides; it cannot add claims, and a body that tries is a failure. */
export const PostLoginHookResultSchema = z.object({
  ...decision,
  claims: z.never().optional(),
});

export type PostLoginHookResult = z.infer<typeof PostLoginHookResultSchema>;

/**
 * Claims are read loosely here. The API then strips reserved names (and audits that) and holds
 * the rest to the custom claims budget, failing the hook if they do not fit.
 */
export const PreTokenHookResultSchema = z.object({
  ...decision,
  claims: z.record(z.string(), z.json()).optional(),
});

export type PreTokenHookResult = z.infer<typeof PreTokenHookResultSchema>;

/**
 * The 403 a sign-in answers when a hook denies it. `message` is the hook's `userMessage`, for the
 * sign-in screen; the hook's `reason` is only audited.
 */
export const LoginDeniedErrorSchema = z.object({
  error: z.literal('login_denied'),
  message: z.string().optional(),
});

export type LoginDeniedError = z.infer<typeof LoginDeniedErrorSchema>;

/** The 503 a sign-in answers when a `closed` hook fails. */
export const LoginHookUnavailableErrorSchema = z.object({
  error: z.literal('login_hook_unavailable'),
});

export type LoginHookUnavailableError = z.infer<typeof LoginHookUnavailableErrorSchema>;

export const LoginHookOutcomeSchema = z.enum(['allowed', 'denied', 'failed_open', 'failed_closed']);

export type LoginHookOutcome = z.infer<typeof LoginHookOutcomeSchema>;

export const LoginHookInvocationSchema = z.object({
  id: z.string(),
  trigger: LoginHookTriggerSchema,
  userId: z.string().nullable(),
  outcome: LoginHookOutcomeSchema,
  failure: CalloutFailureSchema.nullable(),
  statusCode: z.number().int().nullable(),
  durationMs: z.number().int().nonnegative(),
  createdAt: IsoDate,
});

export type LoginHookInvocation = z.infer<typeof LoginHookInvocationSchema>;

export const LoginHookInvocationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  outcome: LoginHookOutcomeSchema.optional(),
});

export type LoginHookInvocationQuery = z.infer<typeof LoginHookInvocationQuerySchema>;

export const LoginHookInvocationListResponseSchema = z.object({
  invocations: z.array(LoginHookInvocationSchema),
});

export type LoginHookInvocationListResponse = z.infer<typeof LoginHookInvocationListResponseSchema>;
