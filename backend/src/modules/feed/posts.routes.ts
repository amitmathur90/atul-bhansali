import {
  createPostSchema,
  NotificationType,
  OwnerType,
  PostVisibility,
  ReactionType,
  StaffRole,
  updatePostSchema,
} from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { extractHashtags } from "../../lib/hashtags";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";
import { notifyFollowers, notifyOwner } from "../notifications/notifications.service";

export const postsRouter = Router();

const AUTHOR_SELECT = { id: true, name: true, isVerified: true, verifiedLabel: true, profilePhotoUrl: true };
const SHARED_POST_INCLUDE = { author: { select: AUTHOR_SELECT } };

const listQuerySchema = z.object({
  authorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

interface PostWithCounts {
  id: string;
  _count: { likes: number; comments: number };
}

const EMPTY_REACTIONS: Record<string, number> = Object.fromEntries(Object.values(ReactionType).map((t) => [t, 0]));

async function serializePosts<T extends PostWithCounts>(posts: T[], citizenId?: string) {
  const postIds = posts.map((p) => p.id);
  const allReactions = await prisma.postLike.findMany({
    where: { postId: { in: postIds } },
    select: { postId: true, citizenId: true, type: true },
  });
  const myReactionByPost = new Map(
    citizenId ? allReactions.filter((r) => r.citizenId === citizenId).map((r) => [r.postId, r.type]) : [],
  );
  return posts.map(({ _count, ...p }) => {
    const reactions = { ...EMPTY_REACTIONS };
    for (const r of allReactions) {
      if (r.postId === p.id) reactions[r.type] = (reactions[r.type] ?? 0) + 1;
    }
    return {
      ...p,
      likesCount: _count.likes,
      commentsCount: _count.comments,
      reactions,
      myReaction: myReactionByPost.get(p.id) ?? null,
    };
  });
}

// A viewer sees: public posts, their own posts (any visibility), followers-only posts from
// people they follow, and private posts they were explicitly given access to.
async function visibilityFilter(citizenId?: string) {
  if (!citizenId) return { visibility: PostVisibility.PUBLIC };

  const following = await prisma.follow.findMany({ where: { followerId: citizenId }, select: { followingId: true } });
  const followingIds = following.map((f) => f.followingId);

  return {
    OR: [
      { visibility: PostVisibility.PUBLIC },
      { authorId: citizenId },
      { visibility: PostVisibility.FOLLOWERS_ONLY, authorId: { in: followingIds } },
      { visibility: PostVisibility.PRIVATE, visibleTo: { some: { citizenId } } },
    ],
  };
}

postsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { authorId, page, pageSize } = listQuerySchema.parse(req.query);
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    const where = {
      ...(isStaff ? {} : { isHidden: false, ...(await visibilityFilter(citizenId)) }),
      ...(authorId ? { authorId } : {}),
    };
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: AUTHOR_SELECT },
          sharedPost: { include: SHARED_POST_INCLUDE },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);
    res.json({ items: await serializePosts(posts, citizenId), total, page, pageSize });
  }),
);

postsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: AUTHOR_SELECT },
        sharedPost: { include: SHARED_POST_INCLUDE },
        visibleTo: { select: { citizenId: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    if (!isStaff && post.isHidden) throw new AppError(404, "NOT_FOUND", "Post not found");

    if (!isStaff && post.authorId !== citizenId) {
      if (post.visibility === PostVisibility.FOLLOWERS_ONLY) {
        const follows = citizenId
          ? await prisma.follow.findUnique({
              where: { followerId_followingId: { followerId: citizenId, followingId: post.authorId } },
            })
          : null;
        if (!follows) throw new AppError(404, "NOT_FOUND", "Post not found");
      } else if (post.visibility === PostVisibility.PRIVATE) {
        if (!citizenId || !post.visibleTo.some((v) => v.citizenId === citizenId)) {
          throw new AppError(404, "NOT_FOUND", "Post not found");
        }
      }
    }
    const [serialized] = await serializePosts([post], citizenId);
    res.json(serialized);
  }),
);

postsRouter.post(
  "/",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can create posts");
    }
    let mediaUrl: string | undefined;
    let mediaType = req.body.mediaType;
    if (req.file) {
      mediaUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "feed-posts",
      );
      mediaType = "IMAGE";
    }
    const input = createPostSchema.parse({
      ...req.body,
      ...(mediaType ? { mediaType } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
    });
    if (input.sharedPostId) {
      const original = await prisma.post.findUnique({ where: { id: input.sharedPostId } });
      if (!original || original.isHidden) throw new AppError(404, "NOT_FOUND", "Shared post not found");
    }
    if (input.visibility === PostVisibility.PRIVATE && !input.visibleToPhones) {
      throw new AppError(400, "MISSING_VIEWERS", "Private posts need at least one selected viewer");
    }

    const hashtags = extractHashtags(input.content);
    const { visibleToPhones, ...postFields } = input;

    let viewerIds: string[] = [];
    if (visibleToPhones) {
      const phones = visibleToPhones.split(",").map((p) => p.trim()).filter(Boolean);
      const viewers = await prisma.citizen.findMany({ where: { phone: { in: phones } }, select: { id: true } });
      viewerIds = viewers.map((v) => v.id);
      if (viewerIds.length === 0) {
        throw new AppError(400, "NO_MATCHING_USERS", "None of the given phone numbers match a registered citizen");
      }
    }

    const post = await prisma.post.create({
      data: {
        ...postFields,
        authorId: req.user!.sub,
        hashtags: {
          connectOrCreate: hashtags.map((tag) => ({ where: { tag }, create: { tag } })),
        },
        ...(viewerIds.length > 0
          ? { visibleTo: { create: viewerIds.map((citizenId) => ({ citizenId })) } }
          : {}),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        sharedPost: { include: SHARED_POST_INCLUDE },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const author = await prisma.citizen.findUnique({ where: { id: req.user!.sub }, select: { name: true } });
    if (post.visibility === PostVisibility.PUBLIC) {
      await notifyFollowers(
        req.user!.sub,
        `${author?.name ?? "एक उपयोगकर्ता"} ने नई पोस्ट साझा की`,
        post.content.slice(0, 140),
        NotificationType.NEW_POST,
      );
    }
    if (post.sharedPostId && post.sharedPost && post.sharedPost.author.id !== req.user!.sub) {
      await notifyOwner(
        "CITIZEN",
        post.sharedPost.author.id,
        `${author?.name ?? "किसी ने"} ने आपकी पोस्ट शेयर की`,
        post.content.slice(0, 140),
        NotificationType.POST_SHARE,
        { relatedPostId: post.sharedPostId },
      );
    }
    const [serialized] = await serializePosts([post], req.user!.sub);
    res.status(201).json(serialized);
  }),
);

postsRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");
    if (post.authorId !== req.user!.sub) throw new AppError(403, "FORBIDDEN", "You can only edit your own posts");
    const input = updatePostSchema.parse(req.body);
    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        ...input,
        ...(input.content
          ? {
              hashtags: {
                set: [],
                connectOrCreate: extractHashtags(input.content).map((tag) => ({ where: { tag }, create: { tag } })),
              },
            }
          : {}),
      },
    });
    res.json(updated);
  }),
);

postsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");
    const isOwner = req.user!.ownerType === OwnerType.CITIZEN && post.authorId === req.user!.sub;
    const isAdmin = req.user!.ownerType === OwnerType.STAFF;
    if (!isOwner && !isAdmin) throw new AppError(403, "FORBIDDEN", "Not allowed to delete this post");
    await prisma.post.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

const reactSchema = z.object({ type: z.nativeEnum(ReactionType) });

// One reaction per citizen per post. Sending the same type again removes it; sending a
// different type switches it. Returns the full per-type breakdown so the client can render
// "👍 120 ❤️ 45 👏 20" without a second round trip.
postsRouter.post(
  "/:id/react",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can react to posts");
    }
    const { type } = reactSchema.parse(req.body);
    const postId = req.params.id;
    const citizenId = req.user!.sub;
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");

    const existing = await prisma.postLike.findUnique({ where: { postId_citizenId: { postId, citizenId } } });
    let myReaction: string | null = type;
    if (existing && existing.type === type) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      myReaction = null;
    } else if (existing) {
      await prisma.postLike.update({ where: { id: existing.id }, data: { type } });
    } else {
      await prisma.postLike.create({ data: { postId, citizenId, type } });
    }
    if (myReaction && post.authorId !== citizenId) {
      const reactor = await prisma.citizen.findUnique({ where: { id: citizenId }, select: { name: true } });
      await notifyOwner(
        "CITIZEN",
        post.authorId,
        `${reactor?.name ?? "किसी ने"} ने आपकी पोस्ट पर प्रतिक्रिया दी`,
        post.content.slice(0, 140),
        NotificationType.POST_LIKE,
        { relatedPostId: postId },
      );
    }
    const allReactions = await prisma.postLike.findMany({ where: { postId }, select: { type: true } });
    const reactions = { ...EMPTY_REACTIONS };
    for (const r of allReactions) reactions[r.type] = (reactions[r.type] ?? 0) + 1;
    res.json({ reactions, myReaction, likesCount: allReactions.length });
  }),
);

// Pinning: a verified citizen can pin/unpin their own post; admin can pin/unpin any post.
postsRouter.patch(
  "/:id/pin",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");
    const isAdmin = req.user!.ownerType === OwnerType.STAFF;
    if (!isAdmin) {
      if (req.user!.ownerType !== OwnerType.CITIZEN || post.authorId !== req.user!.sub) {
        throw new AppError(403, "FORBIDDEN", "Not allowed to pin this post");
      }
      const citizen = await prisma.citizen.findUnique({ where: { id: req.user!.sub } });
      if (!citizen?.isVerified) throw new AppError(403, "FORBIDDEN", "Only verified accounts can pin posts");
    }
    const updated = await prisma.post.update({ where: { id: req.params.id }, data: { isPinned: !post.isPinned } });
    res.json(updated);
  }),
);

postsRouter.patch(
  "/:id/feature",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");
    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data: { isFeatured: !post.isFeatured },
    });
    res.json(updated);
  }),
);

postsRouter.patch(
  "/:id/hide",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");
    const updated = await prisma.post.update({ where: { id: req.params.id }, data: { isHidden: !post.isHidden } });
    res.json(updated);
  }),
);
