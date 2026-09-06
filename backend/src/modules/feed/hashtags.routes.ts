import { OwnerType } from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { optionalAuth } from "../../middleware/auth.middleware";

export const hashtagsRouter = Router();

// Trending = hashtags with the most recent-activity score (post count + likes + comments on
// posts from the last 7 days), which is a reasonable proxy without needing a background job.
hashtagsRouter.get(
  "/trending",
  asyncHandler(async (_req, res) => {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const hashtags = await prisma.hashtag.findMany({
      where: { posts: { some: { createdAt: { gte: since }, isHidden: false } } },
      include: {
        posts: {
          where: { createdAt: { gte: since }, isHidden: false },
          select: { _count: { select: { likes: true, comments: true } } },
        },
      },
    });

    const ranked = hashtags
      .map((h) => {
        const postsCount = h.posts.length;
        const engagement = h.posts.reduce((sum, p) => sum + p._count.likes + p._count.comments, 0);
        return { tag: h.tag, postsCount, score: postsCount * 2 + engagement };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ items: ranked });
  }),
);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

hashtagsRouter.get(
  "/:tag/posts",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { page, pageSize } = listQuerySchema.parse(req.query);
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const tag = req.params.tag.toLowerCase();

    const where = {
      hashtags: { some: { tag } },
      ...(isStaff ? {} : { isHidden: false, visibility: "PUBLIC" as const }),
    };
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, isVerified: true, verifiedLabel: true, profilePhotoUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);
    res.json({
      items: posts.map(({ _count, ...p }) => ({ ...p, likesCount: _count.likes, commentsCount: _count.comments })),
      total,
      page,
      pageSize,
    });
  }),
);
