import { createCampaignFeedbackSchema, OwnerType, StaffRole } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const campaignFeedbackRouter = Router();

campaignFeedbackRouter.get(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (_req, res) => {
    const items = await prisma.campaignFeedback.findMany({
      orderBy: { createdAt: "desc" },
      include: { citizen: { select: { name: true, phone: true } } },
    });
    res.json({ items });
  }),
);

campaignFeedbackRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can send feedback");
    }
    const input = createCampaignFeedbackSchema.parse(req.body);
    const item = await prisma.campaignFeedback.create({
      data: { ...input, citizenId: req.user!.sub },
    });
    res.status(201).json(item);
  }),
);

campaignFeedbackRouter.patch(
  "/:id/read",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.campaignFeedback.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.status(204).send();
  }),
);
