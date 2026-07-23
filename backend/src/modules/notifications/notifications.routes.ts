import { OwnerType } from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth.middleware";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const registerDeviceSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["ANDROID", "IOS"]),
});

notificationsRouter.post(
  "/register-device",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
    const { token, platform } = registerDeviceSchema.parse(req.body);

    await prisma.deviceToken.upsert({
      where: { token },
      update: { ownerType: req.user.ownerType, ownerId: req.user.sub, platform },
      create: { token, platform, ownerType: req.user.ownerType, ownerId: req.user.sub },
    });
    res.status(204).send();
  }),
);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
    const recipientType = req.user.ownerType === OwnerType.CITIZEN ? "CITIZEN" : "STAFF";
    const items = await prisma.notification.findMany({
      where: { recipientType, recipientId: req.user.sub },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ items });
  }),
);

notificationsRouter.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.recipientId !== req.user.sub) {
      throw new AppError(404, "NOT_FOUND", "Notification not found");
    }
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.status(204).send();
  }),
);

notificationsRouter.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
    const recipientType = req.user.ownerType === OwnerType.CITIZEN ? "CITIZEN" : "STAFF";
    await prisma.notification.updateMany({
      where: { recipientType, recipientId: req.user.sub, isRead: false },
      data: { isRead: true },
    });
    res.status(204).send();
  }),
);
