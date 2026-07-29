import { z } from 'zod';
import { AuthEventSchema } from '../authEvent/schema.js';

const MAX_METRICS_WINDOW_MS = 1000 * 60 * 60 * 24 * 366; // ~1 year

export const MetricsIntervalSchema = z.enum(['hour', 'day']);

export type MetricsInterval = z.infer<typeof MetricsIntervalSchema>;

export const MetricsQuerySchema = z
  .object({
    userId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    interval: MetricsIntervalSchema.optional().default('hour'),
  })
  .superRefine((data, ctx) => {
    const fromDate = data.from ? new Date(data.from) : undefined;
    const toDate = data.to ? new Date(data.to) : undefined;

    const fromValid = fromDate !== undefined && !Number.isNaN(fromDate.getTime());
    const toValid = toDate !== undefined && !Number.isNaN(toDate.getTime());

    if (data.from !== undefined && !fromValid) {
      ctx.addIssue({ code: 'custom', path: ['from'], message: 'Invalid from date' });
    }

    if (data.to !== undefined && !toValid) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Invalid to date' });
    }

    if (!fromValid || !toValid || !fromDate || !toDate) {
      return;
    }

    if (fromDate.getTime() > toDate.getTime()) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'from must be on or before to' });
      return;
    }

    // Unbounded windows let a single request scan the whole event table.
    if (toDate.getTime() - fromDate.getTime() > MAX_METRICS_WINDOW_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'time range exceeds the maximum window',
      });
    }
  });

export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

export const AuthEventSummaryItemSchema = z.object({
  type: z.string(),
  count: z.number(),
});

export const AuthEventSummaryResponseSchema = z.object({
  summary: z.array(AuthEventSummaryItemSchema),
});

export const AuthEventTimeseriesPointSchema = z.object({
  bucket: z.string(),
  success: z.number(),
  failed: z.number(),
});

export type AuthEventTimeseriesPoint = z.infer<typeof AuthEventTimeseriesPointSchema>;

export const AuthEventTimeseriesResponseSchema = z.object({
  timeseries: z.array(AuthEventTimeseriesPointSchema),
});

export const LoginStatsResponseSchema = z.object({
  success: z.number(),
  failed: z.number(),
  successRate: z.number(),
});

/**
 * Anomaly rows come straight out of the event store, where a partially written
 * event is still worth surfacing, so every field is optional here.
 */
export const PartialAuthEventSchema = AuthEventSchema.partial();

export type PartialAuthEvent = z.infer<typeof PartialAuthEventSchema>;

export const SecurityAnomaliesResponseSchema = z.object({
  suspiciousEvents: z.array(PartialAuthEventSchema),
  total: z.number().int().nonnegative(),
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
});

export type DashboardMetricsResponse = z.infer<typeof DashboardMetricsResponseSchema>;
