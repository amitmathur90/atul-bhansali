import { z } from "zod";

export const createPosterTemplateSchema = z.object({
  name: z.string().min(2).max(150),
  category: z.string().max(100).optional(),
  selfieX: z.coerce.number().min(0).max(1),
  selfieY: z.coerce.number().min(0).max(1),
  selfieSize: z.coerce.number().min(0.02).max(1),
  nameX: z.coerce.number().min(0).max(1),
  nameY: z.coerce.number().min(0).max(1),
  nameFontSize: z.coerce.number().int().min(8).max(300).default(32),
  nameColor: z.string().min(1).max(20).default("#FFFFFF"),
  nameAlign: z.enum(["left", "center", "right"]).default("center"),
  nameMaxWidth: z.coerce.number().min(0).max(1).optional(),
});
export const updatePosterTemplateSchema = createPosterTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type CreatePosterTemplateInput = z.infer<typeof createPosterTemplateSchema>;
export type UpdatePosterTemplateInput = z.infer<typeof updatePosterTemplateSchema>;

export const generatePosterSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(60),
});
export type GeneratePosterInput = z.infer<typeof generatePosterSchema>;

export const publishPosterSchema = z.object({
  content: z.string().max(2000).optional(),
});
export type PublishPosterInput = z.infer<typeof publishPosterSchema>;
