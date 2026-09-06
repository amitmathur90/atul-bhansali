import { OwnerType, updateProfileSchema } from "@abc/shared";
import { Router } from "express";
import { resolveActingCitizenId } from "../../lib/actingCitizen";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const profileRouter = Router();

// Badges are computed on the fly from simple activity thresholds rather than stored/awarded
// records — keeps the "badge" concept honest (it always reflects current activity) without
// needing a background job to grant/revoke them as thresholds are crossed.
function computeBadges(stats: {
  postsCount: number;
  commentsCount: number;
  reactionsReceived: number;
  followersCount: number;
}) {
  const badges: { key: string; emoji: string; label: string }[] = [];
  if (stats.postsCount >= 5) badges.push({ key: "ACTIVE_CITIZEN", emoji: "🏆", label: "Active Citizen" });
  if (stats.postsCount + stats.commentsCount >= 20) {
    badges.push({ key: "COMMUNITY_CONTRIBUTOR", emoji: "⭐", label: "Community Contributor" });
  }
  if (stats.postsCount >= 10) badges.push({ key: "LOCAL_REPORTER", emoji: "📢", label: "Local Reporter" });
  if (stats.reactionsReceived >= 50 || stats.followersCount >= 20) {
    badges.push({ key: "TOP_CONTRIBUTOR", emoji: "🔥", label: "Top Contributor" });
  }
  return badges;
}

profileRouter.get(
  "/me/analytics",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN && req.user!.ownerType !== OwnerType.STAFF) {
      throw new AppError(403, "FORBIDDEN", "Only citizens or staff have analytics");
    }
    const citizenId = (await resolveActingCitizenId(req.user))!;
    const citizen = await prisma.citizen.findUnique({ where: { id: citizenId } });
    if (!citizen?.isVerified) {
      throw new AppError(403, "FORBIDDEN", "Analytics are available to verified accounts only");
    }
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
    if (req.user!.ownerType !== OwnerType.CITIZEN && req.user!.ownerType !== OwnerType.STAFF) {
      throw new AppError(403, "FORBIDDEN", "Only citizens or staff have a feed profile");
    }
    const citizenId = (await resolveActingCitizenId(req.user))!;
    let profilePhotoUrl: string | undefined;
    if (req.file) {
      profilePhotoUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "profile-photos",
      );
    }
    const input = updateProfileSchema.parse(req.body);
    const updated = await prisma.citizen.update({
      where: { id: citizenId },
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

    const [followersCount, followingCount, postsCount, commentsCount, reactionsReceived] = await Promise.all([
      prisma.follow.count({ where: { followingId: citizen.id } }),
      prisma.follow.count({ where: { followerId: citizen.id } }),
      prisma.post.count({ where: { authorId: citizen.id, isHidden: false } }),
      prisma.postComment.count({ where: { citizenId: citizen.id } }),
      prisma.postLike.count({ where: { post: { authorId: citizen.id } } }),
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
      badges: computeBadges({ postsCount, commentsCount, reactionsReceived, followersCount }),
    });
  }),
);
