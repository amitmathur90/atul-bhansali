import { createCommentSchema, createReportSchema, NotificationType, OwnerType, updateCommentSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware";
import { notifyOwner } from "../notifications/notifications.service";

export const commentsRouter = Router({ mergeParams: true });

const AUTHOR_SELECT = { id: true, name: true, isVerified: true, verifiedLabel: true, profilePhotoUrl: true };

interface CommentWithLikes {
  likes: { citizenId: string }[];
  replies?: CommentWithLikes[];
  [key: string]: unknown;
}

interface SerializedComment {
  likesCount: number;
  likedByMe: boolean;
  replies?: SerializedComment[];
  [key: string]: unknown;
}

function withLikeInfo(comment: CommentWithLikes, citizenId?: string): SerializedComment {
  const { likes, replies, ...rest } = comment;
  return {
    ...rest,
    likesCount: likes.length,
    likedByMe: citizenId ? likes.some((l) => l.citizenId === citizenId) : false,
    ...(replies ? { replies: replies.map((r) => withLikeInfo(r, citizenId)) } : {}),
  };
}

commentsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const comments = await prisma.postComment.findMany({
      where: { postId: req.params.postId, parentCommentId: null },
      include: {
        citizen: { select: AUTHOR_SELECT },
        likes: { select: { citizenId: true } },
        replies: {
          include: { citizen: { select: AUTHOR_SELECT }, likes: { select: { citizenId: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    res.json({ items: comments.map((c) => withLikeInfo(c, citizenId)) });
  }),
);

commentsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can comment");
    }
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");

    const input = createCommentSchema.parse(req.body);
    let parent = null;
    if (input.parentCommentId) {
      parent = await prisma.postComment.findUnique({ where: { id: input.parentCommentId } });
      if (!parent || parent.postId !== req.params.postId) {
        throw new AppError(400, "INVALID_PARENT", "Invalid parent comment");
      }
    }
    const comment = await prisma.postComment.create({
      data: { ...input, postId: req.params.postId, citizenId: req.user!.sub },
      include: { citizen: { select: AUTHOR_SELECT }, likes: { select: { citizenId: true } } },
    });

    const commenter = await prisma.citizen.findUnique({ where: { id: req.user!.sub }, select: { name: true } });
    if (parent) {
      if (parent.citizenId !== req.user!.sub) {
        await notifyOwner(
          "CITIZEN",
          parent.citizenId,
          `${commenter?.name ?? "किसी ने"} ने आपकी टिप्पणी का जवाब दिया`,
          input.content.slice(0, 140),
          NotificationType.COMMENT_REPLY,
          { relatedPostId: req.params.postId },
        );
      }
    } else if (post.authorId !== req.user!.sub) {
      await notifyOwner(
        "CITIZEN",
        post.authorId,
        `${commenter?.name ?? "किसी ने"} ने आपकी पोस्ट पर टिप्पणी की`,
        input.content.slice(0, 140),
        NotificationType.POST_COMMENT,
        { relatedPostId: req.params.postId },
      );
    }
    res.status(201).json(withLikeInfo(comment, req.user!.sub));
  }),
);

commentsRouter.patch(
  "/:commentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const comment = await prisma.postComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) throw new AppError(404, "NOT_FOUND", "Comment not found");
    if (comment.citizenId !== req.user!.sub) throw new AppError(403, "FORBIDDEN", "You can only edit your own comment");
    const input = updateCommentSchema.parse(req.body);
    const updated = await prisma.postComment.update({
      where: { id: req.params.commentId },
      data: input,
      include: { citizen: { select: AUTHOR_SELECT }, likes: { select: { citizenId: true } } },
    });
    res.json(withLikeInfo(updated, req.user!.sub));
  }),
);

commentsRouter.delete(
  "/:commentId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const comment = await prisma.postComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) throw new AppError(404, "NOT_FOUND", "Comment not found");
    const isOwner = req.user!.ownerType === OwnerType.CITIZEN && comment.citizenId === req.user!.sub;
    const isAdmin = req.user!.ownerType === OwnerType.STAFF;
    if (!isOwner && !isAdmin) throw new AppError(403, "FORBIDDEN", "Not allowed to delete this comment");
    await prisma.postComment.delete({ where: { id: req.params.commentId } });
    res.status(204).send();
  }),
);

commentsRouter.post(
  "/:commentId/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can like comments");
    }
    const commentId = req.params.commentId;
    const citizenId = req.user!.sub;
    const existing = await prisma.commentLike.findUnique({ where: { commentId_citizenId: { commentId, citizenId } } });
    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.commentLike.create({ data: { commentId, citizenId } });
    }
    const likesCount = await prisma.commentLike.count({ where: { commentId } });
    res.json({ liked: !existing, likesCount });
  }),
);

commentsRouter.post(
  "/:commentId/report",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can report comments");
    }
    const comment = await prisma.postComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) throw new AppError(404, "NOT_FOUND", "Comment not found");
    const input = createReportSchema.parse(req.body);
    const report = await prisma.commentReport.create({
      data: { ...input, commentId: req.params.commentId, reporterId: req.user!.sub },
    });
    res.status(201).json(report);
  }),
);
