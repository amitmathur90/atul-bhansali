import { createCommentSchema, OwnerType } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware";

export const commentsRouter = Router({ mergeParams: true });

const AUTHOR_SELECT = { id: true, name: true, isVerified: true, verifiedLabel: true };

commentsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const comments = await prisma.postComment.findMany({
      where: { postId: req.params.postId, parentCommentId: null },
      include: {
        citizen: { select: AUTHOR_SELECT },
        replies: { include: { citizen: { select: AUTHOR_SELECT } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ items: comments });
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
    if (input.parentCommentId) {
      const parent = await prisma.postComment.findUnique({ where: { id: input.parentCommentId } });
      if (!parent || parent.postId !== req.params.postId) {
        throw new AppError(400, "INVALID_PARENT", "Invalid parent comment");
      }
    }
    const comment = await prisma.postComment.create({
      data: { ...input, postId: req.params.postId, citizenId: req.user!.sub },
      include: { citizen: { select: AUTHOR_SELECT } },
    });
    res.status(201).json(comment);
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
