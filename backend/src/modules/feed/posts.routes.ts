import { createPostSchema, OwnerType, StaffRole, updatePostSchema } from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const postsRouter = Router();

const AUTHOR_SELECT = { id: true, name: true, isVerified: true, verifiedLabel: true };

const listQuerySchema = z.object({
  authorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

interface PostWithCounts {
  id: string;
  _count: { likes: number; comments: number };
}

async function serializePosts<T extends PostWithCounts>(posts: T[], citizenId?: string) {
  const postIds = posts.map((p) => p.id);
  const likedIds = citizenId
    ? new Set(
        (
          await prisma.postLike.findMany({
            where: { citizenId, postId: { in: postIds } },
            select: { postId: true },
          })
        ).map((l) => l.postId),
      )
    : new Set<string>();
  return posts.map(({ _count, ...p }) => ({
    ...p,
    likesCount: _count.likes,
    commentsCount: _count.comments,
    likedByMe: likedIds.has(p.id),
  }));
}

postsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { authorId, page, pageSize } = listQuerySchema.parse(req.query);
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const where = {
      ...(isStaff ? {} : { isHidden: false }),
      ...(authorId ? { authorId } : {}),
    };
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: { author: { select: AUTHOR_SELECT }, _count: { select: { likes: true, comments: true } } },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    res.json({ items: await serializePosts(posts, citizenId), total, page, pageSize });
  }),
);

postsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { author: { select: AUTHOR_SELECT }, _count: { select: { likes: true, comments: true } } },
    });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    if (!isStaff && post.isHidden) throw new AppError(404, "NOT_FOUND", "Post not found");
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
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
    const post = await prisma.post.create({
      data: { ...input, authorId: req.user!.sub },
      include: { author: { select: AUTHOR_SELECT }, _count: { select: { likes: true, comments: true } } },
    });
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
    const updated = await prisma.post.update({ where: { id: req.params.id }, data: input });
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

postsRouter.post(
  "/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can like posts");
    }
    const postId = req.params.id;
    const citizenId = req.user!.sub;
    const existing = await prisma.postLike.findUnique({ where: { postId_citizenId: { postId, citizenId } } });
    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.postLike.create({ data: { postId, citizenId } });
    }
    const likesCount = await prisma.postLike.count({ where: { postId } });
    res.json({ liked: !existing, likesCount });
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
