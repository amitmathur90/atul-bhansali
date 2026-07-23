import { z } from "zod";
import { DevProjectCategory, DevProjectStatus } from "../enums";

export const createDevelopmentProjectSchema = z.object({
  title: z.string().min(3).max(150),
  category: z.nativeEnum(DevProjectCategory),
  description: z.string().min(5).max(3000),
  budget: z.coerce.number().nonnegative().optional(),
  wardId: z.string().uuid(),
  status: z.nativeEnum(DevProjectStatus).default(DevProjectStatus.PLANNED),
  startDate: z.coerce.date().optional(),
  completionDate: z.coerce.date().optional(),
});

export const updateDevelopmentProjectSchema = createDevelopmentProjectSchema.partial();

export type CreateDevelopmentProjectInput = z.infer<typeof createDevelopmentProjectSchema>;
export type UpdateDevelopmentProjectInput = z.infer<typeof updateDevelopmentProjectSchema>;
