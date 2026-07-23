import { z } from "zod";

export const createWelfareSchemeSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(5).max(3000),
  eligibility: z.string().min(3).max(2000),
  imageUrl: z.string().url().optional(),
});

export const updateWelfareSchemeSchema = createWelfareSchemeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateWelfareSchemeInput = z.infer<typeof createWelfareSchemeSchema>;
export type UpdateWelfareSchemeInput = z.infer<typeof updateWelfareSchemeSchema>;
