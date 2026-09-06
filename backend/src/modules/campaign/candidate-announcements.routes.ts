import { createCandidateAnnouncementSchema, OwnerType, StaffRole, updateCandidateAnnouncementSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const candidateAnnouncementsRouter = Router();

candidateAnnouncementsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const items = await prisma.candidateAnnouncement.findMany({
      where: isStaff ? {} : { isPublished: true, publishAt: { lte: new Date() } },
      orderBy: { publishAt: "desc" },
    });
    res.json({ items });
  }),
);

candidateAnnouncementsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const item = await prisma.candidateAnnouncement.findUnique({ where: { id: req.params.id } });
    if (!item) throw new AppError(404, "NOT_FOUND", "Candidate announcement not found");

    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    if (!isStaff && (!item.isPublished || item.publishAt > new Date())) {
      throw new AppError(404, "NOT_FOUND", "Candidate announcement not found");
    }
    res.json(item);
  }),
);

candidateAnnouncementsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    let profileImageUrl: string | undefined;
    if (req.file) {
      profileImageUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "candidate-announcements",
      );
    }
    const input = createCandidateAnnouncementSchema.parse({
      ...req.body,
      ...(profileImageUrl ? { profileImageUrl } : {}),
    });
    const item = await prisma.candidateAnnouncement.create({
      data: { ...input, createdById: req.user!.sub },
    });
    res.status(201).json(item);
  }),
);

candidateAnnouncementsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    let profileImageUrl: string | undefined;
    if (req.file) {
      profileImageUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "candidate-announcements",
      );
    }
    const input = updateCandidateAnnouncementSchema.parse({
      ...req.body,
      ...(profileImageUrl ? { profileImageUrl } : {}),
    });
    const item = await prisma.candidateAnnouncement.update({ where: { id: req.params.id }, data: input });
    res.json(item);
  }),
);

candidateAnnouncementsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.candidateAnnouncement.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
