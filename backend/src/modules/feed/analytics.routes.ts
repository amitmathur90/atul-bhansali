import { StaffRole } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const feedAnalyticsRouter = Router();
feedAnalyticsRouter.use(requireAuth, requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN));

feedAnalyticsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const activeSince = new Date();
    activeSince.setDate(activeSince.getDate() - 30);

    const [
      totalPosts,
      totalUsers,
      totalLikes,
      totalComments,
      totalShares,
      activePosters,
      activeCommenters,
      activeReactors,
      hashtags,
      postCounts,
      commentCounts,
      reactionCounts,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.citizen.count(),
      prisma.postLike.count(),
      prisma.postComment.count(),
      prisma.post.count({ where: { sharedPostId: { not: null } } }),
      prisma.post.findMany({ where: { createdAt: { gte: activeSince } }, select: { authorId: true }, distinct: ["authorId"] }),
      prisma.postComment.findMany({ where: { createdAt: { gte: activeSince } }, select: { citizenId: true }, distinct: ["citizenId"] }),
      prisma.postLike.findMany({ where: { createdAt: { gte: activeSince } }, select: { citizenId: true }, distinct: ["citizenId"] }),
      prisma.hashtag.findMany({ include: { _count: { select: { posts: true } } } }),
      prisma.post.groupBy({ by: ["authorId"], _count: { _all: true } }),
      prisma.postComment.groupBy({ by: ["citizenId"], _count: { _all: true } }),
      prisma.postLike.groupBy({ by: ["citizenId"], _count: { _all: true } }),
    ]);

    const activeUserIds = new Set([
      ...activePosters.map((p) => p.authorId),
      ...activeCommenters.map((c) => c.citizenId),
      ...activeReactors.map((r) => r.citizenId),
    ]);

    const trendingHashtags = hashtags
      .map((h) => ({ tag: h.tag, postsCount: h._count.posts }))
      .sort((a, b) => b.postsCount - a.postsCount)
      .slice(0, 10);

    const activityByCitizen = new Map<string, number>();
    for (const p of postCounts) activityByCitizen.set(p.authorId, (activityByCitizen.get(p.authorId) ?? 0) + p._count._all);
    for (const c of commentCounts) activityByCitizen.set(c.citizenId, (activityByCitizen.get(c.citizenId) ?? 0) + c._count._all);
    for (const r of reactionCounts) activityByCitizen.set(r.citizenId, (activityByCitizen.get(r.citizenId) ?? 0) + r._count._all);

    const topCitizenIds = Array.from(activityByCitizen.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);
    const topCitizens = await prisma.citizen.findMany({
      where: { id: { in: topCitizenIds } },
      select: { id: true, name: true, isVerified: true, verifiedLabel: true },
    });
    const mostActiveUsers = topCitizenIds
      .map((id) => {
        const citizen = topCitizens.find((c) => c.id === id);
        return citizen ? { ...citizen, activityScore: activityByCitizen.get(id) ?? 0 } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    res.json({
      totalPosts,
      totalUsers,
      activeUsers: activeUserIds.size,
      totalLikes,
      totalComments,
      totalShares,
      // Feed posts only support images, not video (see storage constraints), so there's
      // nothing to count views for yet — kept as a field so the admin UI doesn't need a
      // special case, and it becomes meaningful the day video upload is added.
      videoViews: 0,
      trendingHashtags,
      mostActiveUsers,
    });
  }),
);
