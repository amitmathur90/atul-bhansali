import { OwnerType } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware";

export const followsRouter = Router();

followsRouter.get(
  "/:citizenId/follow-info",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const citizenId = req.params.citizenId;
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: citizenId } }),
      prisma.follow.count({ where: { followerId: citizenId } }),
    ]);
    const viewerId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    const followedByMe = viewerId
      ? !!(await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: citizenId } },
        }))
      : false;
    res.json({ followersCount, followingCount, followedByMe });
  }),
);

followsRouter.post(
  "/:citizenId/follow",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can follow others");
    }
    const followingId = req.params.citizenId;
    const followerId = req.user!.sub;
    if (followerId === followingId) throw new AppError(400, "INVALID", "You cannot follow yourself");

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
    } else {
      await prisma.follow.create({ data: { followerId, followingId } });
    }
    const followersCount = await prisma.follow.count({ where: { followingId } });
    res.json({ followed: !existing, followersCount });
  }),
);
