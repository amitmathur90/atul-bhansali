import { z } from "zod";
import { StaffRole } from "../enums";

export const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  role: z.nativeEnum(StaffRole).default(StaffRole.STAFF),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  designation: z.string().max(100).optional(),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ password: true }).extend({
  isActive: z.boolean().optional(),
});

export const assignStaffAreasSchema = z.object({
  wardIds: z.array(z.string().uuid()).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type AssignStaffAreasInput = z.infer<typeof assignStaffAreasSchema>;
