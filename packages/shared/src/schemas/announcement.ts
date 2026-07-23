import { z } from "zod";
import { AnnouncementType } from "../enums";

export const createAnnouncementSchema = z.object({
  title: z.string().min(3).max(150),
  body: z.string().min(5).max(3000),
  type: z.nativeEnum(AnnouncementType),
  imageUrl: z.string().url().optional(),
  publishAt: z.coerce.date().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  isPublished: z.boolean().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
