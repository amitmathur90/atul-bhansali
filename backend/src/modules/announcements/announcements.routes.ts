import { createAnnouncementSchema, OwnerType, StaffRole, updateAnnouncementSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const announcementsRouter = Router();

announcementsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const items = await prisma.announcement.findMany({
      where: isStaff ? {} : { isPublished: true, publishAt: { lte: new Date() } },
      orderBy: { publishAt: "desc" },
    });
    res.json({ items });
  }),
);

announcementsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!announcement) throw new AppError(404, "NOT_FOUND", "Announcement not found");

    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    if (!isStaff && (!announcement.isPublished || announcement.publishAt > new Date())) {
      throw new AppError(404, "NOT_FOUND", "Announcement not found");
    }
    res.json(announcement);
  }),
);

announcementsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "announcements",
      );
    }
    const input = createAnnouncementSchema.parse({
      ...req.body,
      ...(imageUrl ? { imageUrl } : {}),
    });
    const announcement = await prisma.announcement.create({
      data: { ...input, createdById: req.user!.sub },
    });
    res.status(201).json(announcement);
  }),
);

announcementsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "announcements",
      );
    }
    const input = updateAnnouncementSchema.parse({
      ...req.body,
      ...(imageUrl ? { imageUrl } : {}),
    });
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: input,
    });
    res.json(announcement);
  }),
);

announcementsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
