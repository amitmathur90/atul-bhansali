import {
  createDevelopmentProjectSchema,
  StaffRole,
  updateDevelopmentProjectSchema,
} from "@abc/shared";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const developmentProjectsRouter = Router();

const PROJECT_INCLUDE = { ward: true, gallery: { orderBy: { order: "asc" as const } } };

developmentProjectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, status, wardId } = req.query as Record<string, string | undefined>;
    const where: Prisma.DevelopmentProjectWhereInput = {};
    if (category) where.category = category as Prisma.EnumDevProjectCategoryFilter["equals"];
    if (status) where.status = status as Prisma.EnumDevProjectStatusFilter["equals"];
    if (wardId) where.wardId = wardId;

    const items = await prisma.developmentProject.findMany({
      where,
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

developmentProjectsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.developmentProject.findUnique({
      where: { id: req.params.id },
      include: PROJECT_INCLUDE,
    });
    if (!project) throw new AppError(404, "NOT_FOUND", "Development project not found");
    res.json(project);
  }),
);

developmentProjectsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createDevelopmentProjectSchema.parse(req.body);
    const project = await prisma.developmentProject.create({ data: input, include: PROJECT_INCLUDE });
    res.status(201).json(project);
  }),
);

developmentProjectsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateDevelopmentProjectSchema.parse(req.body);
    const project = await prisma.developmentProject.update({
      where: { id: req.params.id },
      data: input,
      include: PROJECT_INCLUDE,
    });
    res.json(project);
  }),
);

developmentProjectsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.developmentProject.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

developmentProjectsRouter.post(
  "/:id/gallery",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.array("images", 10),
  asyncHandler(async (req, res) => {
    const project = await prisma.developmentProject.findUnique({ where: { id: req.params.id } });
    if (!project) throw new AppError(404, "NOT_FOUND", "Development project not found");

    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) throw new AppError(400, "NO_FILES", "No images uploaded");

    const existingCount = await prisma.gallery.count({ where: { projectId: project.id } });
    const urls = await Promise.all(
      files.map((f) =>
        storageProvider.upload(
          { buffer: f.buffer, originalName: f.originalname, mimeType: f.mimetype },
          "development-projects",
        ),
      ),
    );
    await prisma.gallery.createMany({
      data: urls.map((imageUrl, i) => ({
        projectId: project.id,
        imageUrl,
        order: existingCount + i,
      })),
    });

    const gallery = await prisma.gallery.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
    });
    res.status(201).json({ items: gallery });
  }),
);

developmentProjectsRouter.delete(
  "/:id/gallery/:galleryId",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.gallery.delete({ where: { id: req.params.galleryId } });
    res.status(204).send();
  }),
);
