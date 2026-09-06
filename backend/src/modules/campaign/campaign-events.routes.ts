import { createCampaignEventSchema, OwnerType, StaffRole, updateCampaignEventSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";

export const campaignEventsRouter = Router();

campaignEventsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const items = await prisma.campaignEvent.findMany({
      where: isStaff ? {} : { isActive: true },
      orderBy: { eventDate: "asc" },
    });
    res.json({ items });
  }),
);

campaignEventsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const item = await prisma.campaignEvent.findUnique({ where: { id: req.params.id } });
    if (!item) throw new AppError(404, "NOT_FOUND", "Campaign event not found");

    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    if (!isStaff && !item.isActive) throw new AppError(404, "NOT_FOUND", "Campaign event not found");
    res.json(item);
  }),
);

campaignEventsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createCampaignEventSchema.parse(req.body);
    const item = await prisma.campaignEvent.create({ data: { ...input, createdById: req.user!.sub } });
    res.status(201).json(item);
  }),
);

campaignEventsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateCampaignEventSchema.parse(req.body);
    const item = await prisma.campaignEvent.update({ where: { id: req.params.id }, data: input });
    res.json(item);
  }),
);

campaignEventsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.campaignEvent.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
