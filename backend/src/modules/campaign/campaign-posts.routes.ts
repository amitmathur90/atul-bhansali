import { createCampaignPostSchema, NotificationType, OwnerType, StaffRole, updateCampaignPostSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { recordMediaAsset } from "../../lib/recordMediaAsset";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";
import { notifyAllCitizens } from "../notifications/notifications.service";

export const campaignPostsRouter = Router();

async function withLikeInfo(items: { id: string }[], citizenId?: string) {
  const counts = await prisma.campaignPostLike.groupBy({
    by: ["postId"],
    _count: { _all: true },
    where: { postId: { in: items.map((i) => i.id) } },
  });
  const likedIds = citizenId
    ? new Set(
        (
          await prisma.campaignPostLike.findMany({
            where: { citizenId, postId: { in: items.map((i) => i.id) } },
            select: { postId: true },
          })
        ).map((l) => l.postId),
      )
    : new Set<string>();

  return items.map((item) => ({
    ...item,
    likesCount: counts.find((c) => c.postId === item.id)?._count._all ?? 0,
    likedByMe: likedIds.has(item.id),
  }));
}

campaignPostsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const items = await prisma.campaignPost.findMany({
      where: isStaff ? {} : { isPublished: true, publishAt: { lte: new Date() } },
      orderBy: { publishAt: "desc" },
    });
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    res.json({ items: await withLikeInfo(items, citizenId) });
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
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    const [withInfo] = await withLikeInfo([item], citizenId);
    res.json(withInfo);
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
      await recordMediaAsset({ url: mediaUrl, mimeType: req.file.mimetype, uploadedById: req.user!.sub });
    }
    const input = createCampaignPostSchema.parse({
      ...req.body,
      ...(mediaUrl ? { mediaUrl } : {}),
    });
    const item = await prisma.campaignPost.create({
      data: { ...input, createdById: req.user!.sub },
    });
    if (item.isPublished && item.publishAt <= new Date()) {
      await notifyAllCitizens(item.title, item.description ?? item.title, NotificationType.CAMPAIGN_POST, {
        relatedCampaignPostId: item.id,
      });
    }
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
      await recordMediaAsset({ url: mediaUrl, mimeType: req.file.mimetype, uploadedById: req.user!.sub });
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

campaignPostsRouter.post(
  "/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can like posts");
    }
    const postId = req.params.id;
    const citizenId = req.user!.sub;
    const existing = await prisma.campaignPostLike.findUnique({
      where: { postId_citizenId: { postId, citizenId } },
    });
    if (existing) {
      await prisma.campaignPostLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.campaignPostLike.create({ data: { postId, citizenId } });
    }
    const likesCount = await prisma.campaignPostLike.count({ where: { postId } });
    res.json({ liked: !existing, likesCount });
  }),
);
