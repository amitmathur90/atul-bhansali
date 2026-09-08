import { z } from "zod";

const booleanField = z.preprocess((v) => v === "true" || v === true, z.boolean());

export const createAppBannerSchema = z.object({
  isActive: booleanField.optional(),
});
export type CreateAppBannerInput = z.infer<typeof createAppBannerSchema>;

export const updateAppBannerSchema = z.object({
  isActive: booleanField.optional(),
});
export type UpdateAppBannerInput = z.infer<typeof updateAppBannerSchema>;
