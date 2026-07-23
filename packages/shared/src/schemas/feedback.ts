import { z } from "zod";

export const createFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  satisfied: z.boolean(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
