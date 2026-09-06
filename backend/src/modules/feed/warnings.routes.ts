import { createWarningSchema, NotificationType, StaffRole } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { notifyOwner } from "../notifications/notifications.service";

export const warningsRouter = Router({ mergeParams: true });
warningsRouter.use(requireAuth, requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN));

warningsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.userWarning.findMany({
      where: { citizenId: req.params.citizenId },
      include: { issuedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

warningsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createWarningSchema.parse(req.body);
    const warning = await prisma.userWarning.create({
      data: { ...input, citizenId: req.params.citizenId, issuedById: req.user!.sub },
    });
    await notifyOwner("CITIZEN", req.params.citizenId, "आपको एक चेतावनी मिली है", input.reason, NotificationType.WARNING);
    res.status(201).json(warning);
  }),
);
