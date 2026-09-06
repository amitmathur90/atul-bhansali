import { OwnerType, updateProfileSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const profileRouter = Router();

profileRouter.get(
  "/me/analytics",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens have analytics");
    }
    const citizen = await prisma.citizen.findUnique({ where: { id: req.user!.sub } });
    if (!citizen?.isVerified) {
      throw new AppError(403, "FORBIDDEN", "Analytics are available to verified accounts only");
    }
    const citizenId = req.user!.sub;
    const [totalPosts, totalComments, totalReactions, followersCount, topPost] = await Promise.all([
      prisma.post.count({ where: { authorId: citizenId } }),
      prisma.postComment.count({ where: { post: { authorId: citizenId } } }),
      prisma.postLike.count({ where: { post: { authorId: citizenId } } }),
      prisma.follow.count({ where: { followingId: citizenId } }),
      prisma.post.findFirst({
        where: { authorId: citizenId },
        orderBy: { likes: { _count: "desc" } },
        select: { id: true, content: true, _count: { select: { likes: true } } },
      }),
    ]);
    res.json({
      totalPosts,
      totalComments,
      totalReactions,
      followersCount,
      topPost: topPost ? { id: topPost.id, content: topPost.content, likesCount: topPost._count.likes } : null,
    });
  }),
);

profileRouter.patch(
  "/me/profile",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens have a feed profile");
    }
    let profilePhotoUrl: string | undefined;
    if (req.file) {
      profilePhotoUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "profile-photos",
      );
    }
    const input = updateProfileSchema.parse(req.body);
    const updated = await prisma.citizen.update({
      where: { id: req.user!.sub },
      data: { ...input, ...(profilePhotoUrl ? { profilePhotoUrl } : {}) },
    });
    res.json(updated);
  }),
);

profileRouter.get(
  "/:citizenId/profile",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const citizen = await prisma.citizen.findUnique({ where: { id: req.params.citizenId } });
    if (!citizen) throw new AppError(404, "NOT_FOUND", "User not found");

    const [followersCount, followingCount, postsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: citizen.id } }),
      prisma.follow.count({ where: { followerId: citizen.id } }),
      prisma.post.count({ where: { authorId: citizen.id, isHidden: false } }),
    ]);
    res.json({
      id: citizen.id,
      name: citizen.name,
      bio: citizen.bio,
      city: citizen.city,
      profilePhotoUrl: citizen.profilePhotoUrl,
      isVerified: citizen.isVerified,
      verifiedLabel: citizen.verifiedLabel,
      followersCount,
      followingCount,
      postsCount,
    });
  }),
);
