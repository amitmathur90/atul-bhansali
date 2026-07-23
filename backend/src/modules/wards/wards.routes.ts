import { createWardSchema, StaffRole, updateWardSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const wardsRouter = Router();

wardsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const wards = await prisma.ward.findMany({ orderBy: { wardNumber: "asc" } });
    res.json({ items: wards });
  }),
);

wardsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createWardSchema.parse(req.body);
    const ward = await prisma.ward.create({ data: input });
    res.status(201).json(ward);
  }),
);

wardsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateWardSchema.parse(req.body);
    const ward = await prisma.ward.update({ where: { id: req.params.id }, data: input });
    res.json(ward);
  }),
);

wardsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.ward.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
