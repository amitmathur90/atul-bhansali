import { createPosterTemplateSchema, OwnerType, StaffRole, updatePosterTemplateSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { resolveImageInput } from "../../lib/resolveImageInput";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";

export const posterTemplatesRouter = Router();

posterTemplatesRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const templates = await prisma.posterTemplate.findMany({
      where: isStaff ? {} : { isActive: true },
      include: { _count: { select: { generations: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      items: templates.map(({ _count, ...t }) => ({ ...t, generationsCount: _count.generations })),
    });
  }),
);

posterTemplatesRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const resolved = await resolveImageInput(req.file, req.body.imageUrl, "poster-templates", req.user!.sub);
    if (!resolved) throw new AppError(400, "MISSING_IMAGE", "A template image is required");

    const input = createPosterTemplateSchema.parse(req.body);
    const template = await prisma.posterTemplate.create({
      data: {
        ...input,
        imageUrl: resolved.url,
        imageWidth: resolved.width,
        imageHeight: resolved.height,
        createdById: req.user!.sub,
      },
    });
    res.status(201).json(template);
  }),
);

posterTemplatesRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.posterTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Poster template not found");

    const resolved = await resolveImageInput(req.file, req.body.imageUrl, "poster-templates", req.user!.sub);

    const input = updatePosterTemplateSchema.parse(req.body);
    const template = await prisma.posterTemplate.update({
      where: { id: req.params.id },
      data: {
        ...input,
        ...(resolved ? { imageUrl: resolved.url, imageWidth: resolved.width, imageHeight: resolved.height } : {}),
      },
    });
    res.json(template);
  }),
);

posterTemplatesRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.posterTemplate.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
