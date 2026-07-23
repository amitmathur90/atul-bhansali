import { z } from "zod";
import { AppointmentStatus } from "../enums";

export const createAppointmentSchema = z.object({
  purpose: z.string().min(5).max(1000),
  preferredDate: z.coerce.date(),
  contactNumber: z.string().regex(/^[6-9]\d{9}$/),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
  scheduledAt: z.coerce.date().optional(),
  remarks: z.string().max(1000).optional(),
});

export const appointmentFiltersSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type AppointmentFiltersInput = z.infer<typeof appointmentFiltersSchema>;
