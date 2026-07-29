import { z } from 'zod';

export const StepUpMethodSchema = z.enum(['webauthn', 'totp']);

export type StepUpMethod = z.infer<typeof StepUpMethodSchema>;

/** Every field but `fresh` is null until the user has stepped up at least once. */
export const StepUpStatusSchema = z.object({
  fresh: z.boolean(),
  method: StepUpMethodSchema.nullable(),
  verifiedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  maxAgeSeconds: z.number(),
});

export type StepUpStatus = z.infer<typeof StepUpStatusSchema>;

export const StepUpSuccessSchema = z.object({
  message: z.string(),
  fresh: z.boolean(),
  method: StepUpMethodSchema,
  verifiedAt: z.string(),
  expiresAt: z.string(),
  maxAgeSeconds: z.number(),
});

export type StepUpSuccessResponse = z.infer<typeof StepUpSuccessSchema>;
