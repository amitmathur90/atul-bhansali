import { createWelfareSchemeSchema, OwnerType, StaffRole, updateWelfareSchemeSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";

export const welfareSchemesRouter = Router();

welfareSchemesRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const items = await prisma.welfareScheme.findMany({
      where: isStaff ? {} : { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

welfareSchemesRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const scheme = await prisma.welfareScheme.findUnique({ where: { id: req.params.id } });
    if (!scheme) throw new AppError(404, "NOT_FOUND", "Welfare scheme not found");

    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    if (!isStaff && !scheme.isActive) throw new AppError(404, "NOT_FOUND", "Welfare scheme not found");
    res.json(scheme);
  }),
);

welfareSchemesRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createWelfareSchemeSchema.parse(req.body);
    const scheme = await prisma.welfareScheme.create({ data: input });
    res.status(201).json(scheme);
  }),
);

welfareSchemesRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateWelfareSchemeSchema.parse(req.body);
    const scheme = await prisma.welfareScheme.update({ where: { id: req.params.id }, data: input });
    res.json(scheme);
  }),
);

welfareSchemesRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.welfareScheme.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
