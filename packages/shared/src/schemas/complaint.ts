import { z } from "zod";
import { ComplaintPriority, ComplaintStatus } from "../enums";

export const createComplaintSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(10).max(2000),
  categoryId: z.string().uuid(),
  wardId: z.string().uuid(),
  address: z.string().min(3).max(255),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  priority: z.nativeEnum(ComplaintPriority).default(ComplaintPriority.MEDIUM),
  contactNumber: z.string().regex(/^[6-9]\d{9}$/),
});

export const updateComplaintStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  remarks: z.string().max(1000).optional(),
});

export const assignComplaintSchema = z.object({
  staffId: z.string().uuid(),
});

export const complaintFiltersSchema = z.object({
  status: z.nativeEnum(ComplaintStatus).optional(),
  categoryId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
  priority: z.nativeEnum(ComplaintPriority).optional(),
  search: z.string().max(150).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
export type ComplaintFiltersInput = z.infer<typeof complaintFiltersSchema>;
