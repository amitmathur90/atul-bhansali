import { createReportSchema, OwnerType, StaffRole } from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

// Mounted twice: at /api/posts/:postId/report (create) and /api/post-reports (admin review).
export const postReportCreateRouter = Router({ mergeParams: true });
export const postReportsAdminRouter = Router();

postReportCreateRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can report posts");
    }
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post) throw new AppError(404, "NOT_FOUND", "Post not found");
    const input = createReportSchema.parse(req.body);
    const report = await prisma.postReport.create({
      data: { ...input, postId: req.params.postId, reporterId: req.user!.sub },
    });
    res.status(201).json(report);
  }),
);

postReportsAdminRouter.use(requireAuth, requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN));

const listQuerySchema = z.object({ status: z.enum(["PENDING", "REVIEWED", "DISMISSED"]).optional() });

postReportsAdminRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = listQuerySchema.parse(req.query);
    const items = await prisma.postReport.findMany({
      where: status ? { status } : {},
      include: {
        post: { include: { author: { select: { id: true, name: true } } } },
        reporter: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

const updateStatusSchema = z.object({ status: z.enum(["REVIEWED", "DISMISSED"]) });

postReportsAdminRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { status } = updateStatusSchema.parse(req.body);
    const report = await prisma.postReport.update({ where: { id: req.params.id }, data: { status } });
    res.json(report);
  }),
);

export const commentReportsAdminRouter = Router();
commentReportsAdminRouter.use(requireAuth, requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN));

commentReportsAdminRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = listQuerySchema.parse(req.query);
    const items = await prisma.commentReport.findMany({
      where: status ? { status } : {},
      include: {
        comment: { include: { citizen: { select: { id: true, name: true } } } },
        reporter: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

commentReportsAdminRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { status } = updateStatusSchema.parse(req.body);
    const report = await prisma.commentReport.update({ where: { id: req.params.id }, data: { status } });
    res.json(report);
  }),
);
