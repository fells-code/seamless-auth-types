import { z } from 'zod';
import { AuthEventSchema } from '../authEvent/schema.js';

const MAX_METRICS_WINDOW_MS = 1000 * 60 * 60 * 24 * 366; // ~1 year

export const MetricsIntervalSchema = z.enum(['hour', 'day']);

export type MetricsInterval = z.infer<typeof MetricsIntervalSchema>;

type RangeIssue = { path: ['from'] | ['to']; message: string };

// Shared by every metrics query that takes a range, so they agree on what a valid window is.
function timeRangeIssues(data: {
  from?: string | undefined;
  to?: string | undefined;
}): RangeIssue[] {
  const fromDate = data.from ? new Date(data.from) : undefined;
  const toDate = data.to ? new Date(data.to) : undefined;

  const fromValid = fromDate !== undefined && !Number.isNaN(fromDate.getTime());
  const toValid = toDate !== undefined && !Number.isNaN(toDate.getTime());
  const issues: RangeIssue[] = [];

  if (data.from !== undefined && !fromValid) {
    issues.push({ path: ['from'], message: 'Invalid from date' });
  }

  if (data.to !== undefined && !toValid) {
    issues.push({ path: ['to'], message: 'Invalid to date' });
  }

  if (!fromValid || !toValid || !fromDate || !toDate) {
    return issues;
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return [{ path: ['to'], message: 'from must be on or before to' }];
  }

  // Unbounded windows let a single request scan the whole event table.
  if (toDate.getTime() - fromDate.getTime() > MAX_METRICS_WINDOW_MS) {
    return [{ path: ['to'], message: 'time range exceeds the maximum window' }];
  }

  return issues;
}

function refineTimeRange<T extends { from?: string | undefined; to?: string | undefined }>(
  data: T,
  ctx: z.RefinementCtx<T>,
) {
  for (const issue of timeRangeIssues(data)) {
    ctx.addIssue({ code: 'custom', ...issue });
  }
}

export const MetricsQuerySchema = z
  .object({
    userId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    interval: MetricsIntervalSchema.optional().default('hour'),
  })
  .superRefine((data, ctx) => refineTimeRange(data, ctx));

export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

export const AuthEventSummaryItemSchema = z.object({
  type: z.string(),
  count: z.number(),
});

export type AuthEventSummaryItem = z.infer<typeof AuthEventSummaryItemSchema>;

export const AuthEventSummaryResponseSchema = z.object({
  summary: z.array(AuthEventSummaryItemSchema),
});

export type AuthEventSummaryResponse = z.infer<typeof AuthEventSummaryResponseSchema>;

export const AuthEventTimeseriesPointSchema = z.object({
  bucket: z.string(),
  success: z.number(),
  failed: z.number(),
});

export type AuthEventTimeseriesPoint = z.infer<typeof AuthEventTimeseriesPointSchema>;

export const AuthEventTimeseriesResponseSchema = z.object({
  timeseries: z.array(AuthEventTimeseriesPointSchema),
});

export type AuthEventTimeseriesResponse = z.infer<typeof AuthEventTimeseriesResponseSchema>;

export const LoginStatsResponseSchema = z.object({
  success: z.number(),
  failed: z.number(),
  successRate: z.number(),
});

export type LoginStatsResponse = z.infer<typeof LoginStatsResponseSchema>;

/**
 * Anomaly rows come straight out of the event store, where a partially written
 * event is still worth surfacing, so every field is optional here.
 */
export const PartialAuthEventSchema = AuthEventSchema.partial();

export type PartialAuthEvent = z.infer<typeof PartialAuthEventSchema>;

/** The window a ranged response covers, as resolved by the server. */
export const MetricsWindowSchema = z.object({ from: z.string(), to: z.string() });

export type MetricsWindow = z.infer<typeof MetricsWindowSchema>;

/** `from`/`to` default to the last 24 hours, as the endpoints did before they took a range. */
export const DashboardMetricsQuerySchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .superRefine((data, ctx) => refineTimeRange(data, ctx));

export type DashboardMetricsQuery = z.infer<typeof DashboardMetricsQuerySchema>;

export const SecurityAnomaliesQuerySchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional().default(200),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .superRefine((data, ctx) => refineTimeRange(data, ctx));

export type SecurityAnomaliesQuery = z.infer<typeof SecurityAnomaliesQuerySchema>;

export const SecurityAnomaliesResponseSchema = z.object({
  suspiciousEvents: z.array(PartialAuthEventSchema),
  /**
   * Every matching event in the window. Servers before the range was added reported
   * the number returned, at most 200, here instead.
   */
  total: z.number().int().nonnegative(),
  window: MetricsWindowSchema.optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});

export type SecurityAnomaliesResponse = z.infer<typeof SecurityAnomaliesResponseSchema>;

export const DashboardMetricsResponseSchema = z.object({
  totalUsers: z.number(),
  activeSessions: z.number(),
  newUsers24h: z.number(),
  loginSuccess24h: z.number(),
  loginFailed24h: z.number(),
  successRate24h: z.number(),
  otpUsage24h: z.number(),
  passkeyUsage24h: z.number(),
  databaseSize: z.number(),
  /**
   * The same figures as the `*24h` fields, over the requested window instead of the
   * last 24 hours. The `*24h` fields keep their meaning whatever window is asked for.
   * Optional because servers before the range was added do not send them.
   */
  window: MetricsWindowSchema.optional(),
  newUsers: z.number().optional(),
  loginSuccess: z.number().optional(),
  loginFailed: z.number().optional(),
  successRate: z.number().optional(),
  otpUsage: z.number().optional(),
  passkeyUsage: z.number().optional(),
});

export type DashboardMetricsResponse = z.infer<typeof DashboardMetricsResponseSchema>;
