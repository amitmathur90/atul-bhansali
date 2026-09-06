import { createCampaignPostSchema, OwnerType, StaffRole, updateCampaignPostSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const campaignPostsRouter = Router();

campaignPostsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const items = await prisma.campaignPost.findMany({
      where: isStaff ? {} : { isPublished: true, publishAt: { lte: new Date() } },
      orderBy: { publishAt: "desc" },
    });
    res.json({ items });
  }),
);

campaignPostsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const item = await prisma.campaignPost.findUnique({ where: { id: req.params.id } });
    if (!item) throw new AppError(404, "NOT_FOUND", "Campaign post not found");

    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    if (!isStaff && (!item.isPublished || item.publishAt > new Date())) {
      throw new AppError(404, "NOT_FOUND", "Campaign post not found");
    }
    res.json(item);
  }),
);

// Posters/work-update photos upload an image file directly. Videos are linked via an
// external URL (YouTube/Vimeo/etc.) in `mediaUrl` instead of being hosted here — raw
// video is too large for the 8MB in-memory upload pipeline used for images.
campaignPostsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    let mediaUrl: string | undefined;
    if (req.file) {
      mediaUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "campaign-posts",
      );
    }
    const input = createCampaignPostSchema.parse({
      ...req.body,
      ...(mediaUrl ? { mediaUrl } : {}),
    });
    const item = await prisma.campaignPost.create({
      data: { ...input, createdById: req.user!.sub },
    });
    res.status(201).json(item);
  }),
);

campaignPostsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    let mediaUrl: string | undefined;
    if (req.file) {
      mediaUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "campaign-posts",
      );
    }
    const input = updateCampaignPostSchema.parse({
      ...req.body,
      ...(mediaUrl ? { mediaUrl } : {}),
    });
    const item = await prisma.campaignPost.update({ where: { id: req.params.id }, data: input });
    res.json(item);
  }),
);

campaignPostsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.campaignPost.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
