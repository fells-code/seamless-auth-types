import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Body for endpoints that only acknowledge the request. */
export const MessageResponseSchema = z.object({
  message: z.string(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;

export const ErrorResponseSchema = z.object({
  message: z.string().optional(),
  error: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const InvalidPayloadResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});

export type InvalidPayloadResponse = z.infer<typeof InvalidPayloadResponseSchema>;

export const MetadataSchema = z.record(z.string(), z.unknown()).nullable().optional();
