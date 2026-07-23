import { z } from "zod";
import { EmergencyContactCategory } from "../enums";

export const createEmergencyContactSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.nativeEnum(EmergencyContactCategory),
  phone: z.string().min(3).max(20),
  order: z.coerce.number().int().default(0),
});

export const updateEmergencyContactSchema = createEmergencyContactSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateEmergencyContactInput = z.infer<typeof createEmergencyContactSchema>;
export type UpdateEmergencyContactInput = z.infer<typeof updateEmergencyContactSchema>;
