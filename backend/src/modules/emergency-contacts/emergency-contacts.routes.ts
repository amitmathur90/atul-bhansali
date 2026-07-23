import { createEmergencyContactSchema, StaffRole, updateEmergencyContactSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const emergencyContactsRouter = Router();

emergencyContactsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await prisma.emergencyContact.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    res.json({ items });
  }),
);

emergencyContactsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createEmergencyContactSchema.parse(req.body);
    const contact = await prisma.emergencyContact.create({ data: input });
    res.status(201).json(contact);
  }),
);

emergencyContactsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateEmergencyContactSchema.parse(req.body);
    const contact = await prisma.emergencyContact.update({ where: { id: req.params.id }, data: input });
    res.json(contact);
  }),
);

emergencyContactsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.emergencyContact.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
