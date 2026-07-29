import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string(),
  deviceName: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  lastUsedAt: z.string(),
  expiresAt: z.string(),
  current: z.boolean(),
});

export type Session = z.infer<typeof SessionSchema>;

export const SessionIdParamsSchema = z.object({
  id: z.string(),
});

export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionSchema),
  total: z.number(),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;
