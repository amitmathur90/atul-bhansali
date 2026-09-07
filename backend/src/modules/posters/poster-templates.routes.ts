import { createPosterTemplateSchema, OwnerType, StaffRole, updatePosterTemplateSchema } from "@abc/shared";
import { Router } from "express";
import sharp from "sharp";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

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
    if (!req.file) throw new AppError(400, "MISSING_IMAGE", "A template image is required");
    const imageUrl = await storageProvider.upload(
      { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
      "poster-templates",
    );
    const storedBuffer = await storageProvider.read(imageUrl);
    const metadata = await sharp(storedBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new AppError(400, "INVALID_IMAGE", "Could not read the template image dimensions");
    }

    const input = createPosterTemplateSchema.parse(req.body);
    const template = await prisma.posterTemplate.create({
      data: {
        ...input,
        imageUrl,
        imageWidth: metadata.width,
        imageHeight: metadata.height,
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

    let imageFields: { imageUrl: string; imageWidth: number; imageHeight: number } | undefined;
    if (req.file) {
      const imageUrl = await storageProvider.upload(
        { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
        "poster-templates",
      );
      const storedBuffer = await storageProvider.read(imageUrl);
      const metadata = await sharp(storedBuffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new AppError(400, "INVALID_IMAGE", "Could not read the template image dimensions");
      }
      imageFields = { imageUrl, imageWidth: metadata.width, imageHeight: metadata.height };
    }

    const input = updatePosterTemplateSchema.parse(req.body);
    const template = await prisma.posterTemplate.update({
      where: { id: req.params.id },
      data: { ...input, ...imageFields },
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
