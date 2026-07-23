import {
  appointmentFiltersSchema,
  createAppointmentSchema,
  OwnerType,
  updateAppointmentStatusSchema,
} from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, requireOwnerType } from "../../middleware/auth.middleware";
import * as service from "./appointments.service";

export const appointmentsRouter = Router();

appointmentsRouter.use(requireAuth);

appointmentsRouter.post(
  "/",
  requireOwnerType(OwnerType.CITIZEN),
  asyncHandler(async (req, res) => {
    const input = createAppointmentSchema.parse(req.body);
    const appointment = await service.createAppointment(req.user!.sub, input);
    res.status(201).json(appointment);
  }),
);

appointmentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = appointmentFiltersSchema.parse(req.query);
    const result = await service.listAppointments(req.user!, filters);
    res.json(result);
  }),
);

appointmentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const appointment = await service.getAppointmentById(req.user!, req.params.id);
    res.json(appointment);
  }),
);

appointmentsRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const input = updateAppointmentStatusSchema.parse(req.body);
    const appointment = await service.updateAppointmentStatus(req.user!, req.params.id, input);
    res.json(appointment);
  }),
);
