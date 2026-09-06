import { OwnerType } from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { optionalAuth } from "../../middleware/auth.middleware";

export const searchRouter = Router();

const searchQuerySchema = z.object({ q: z.string().min(1).max(100) });

// One combined endpoint (rather than four separate calls) so the mobile search screen can
// show all four result sections from a single request as the user types.
searchRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { q } = searchQuerySchema.parse(req.query);
    const isStaff = req.user?.ownerType === OwnerType.STAFF;

    const [users, officialAccounts, posts, hashtags] = await Promise.all([
      prisma.citizen.findMany({
        where: { name: { contains: q, mode: "insensitive" }, isBlocked: false },
        select: { id: true, name: true, isVerified: true, verifiedLabel: true, profilePhotoUrl: true },
        take: 10,
      }),
      prisma.citizen.findMany({
        where: { name: { contains: q, mode: "insensitive" }, isVerified: true, isBlocked: false },
        select: { id: true, name: true, isVerified: true, verifiedLabel: true, profilePhotoUrl: true },
        take: 10,
      }),
      prisma.post.findMany({
        where: {
          content: { contains: q, mode: "insensitive" },
          ...(isStaff ? {} : { isHidden: false, visibility: "PUBLIC" }),
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, isVerified: true, verifiedLabel: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.hashtag.findMany({
        where: { tag: { contains: q.toLowerCase() } },
        include: { _count: { select: { posts: true } } },
        take: 10,
      }),
    ]);

    res.json({
      users,
      officialAccounts,
      posts,
      hashtags: hashtags.map((h) => ({ tag: h.tag, postsCount: h._count.posts })),
    });
  }),
);
