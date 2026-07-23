import { z } from "zod";

export const createWardSchema = z.object({
  wardNumber: z.coerce.number().int().positive(),
  name: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
});
export const updateWardSchema = createWardSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(150),
});
export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  departmentId: z.string().uuid(),
});
export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateWardInput = z.infer<typeof createWardSchema>;
export type UpdateWardInput = z.infer<typeof updateWardSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
