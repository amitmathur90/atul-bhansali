import { createAppBannerSchema, StaffRole, updateAppBannerSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { resolveImageInput } from "../../lib/resolveImageInput";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";

export const appBannerRouter = Router();

// Public and unauthenticated on purpose: the mobile app shows this popup before a
// citizen has logged in, so it cannot send a Bearer token yet.
appBannerRouter.get(
  "/active",
  asyncHandler(async (_req, res) => {
    const banner = await prisma.appBanner.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ banner });
  }),
);

appBannerRouter.get(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (_req, res) => {
    const items = await prisma.appBanner.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ items });
  }),
);

appBannerRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const resolved = await resolveImageInput(req.file, req.body.imageUrl, "app-banners", req.user!.sub);
    if (!resolved) throw new AppError(400, "MISSING_IMAGE", "A banner image is required");

    const input = createAppBannerSchema.parse(req.body);
    const banner = await prisma.$transaction(async (tx) => {
      if (input.isActive) {
        await tx.appBanner.updateMany({ where: { isActive: true }, data: { isActive: false } });
      }
      return tx.appBanner.create({
        data: {
          imageUrl: resolved.url,
          imageWidth: resolved.width,
          imageHeight: resolved.height,
          isActive: input.isActive ?? false,
          createdById: req.user!.sub,
        },
      });
    });
    res.status(201).json(banner);
  }),
);

appBannerRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.appBanner.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Banner not found");

    const resolved = await resolveImageInput(req.file, req.body.imageUrl, "app-banners", req.user!.sub);
    const input = updateAppBannerSchema.parse(req.body);
    const banner = await prisma.$transaction(async (tx) => {
      if (input.isActive) {
        await tx.appBanner.updateMany({
          where: { isActive: true, id: { not: req.params.id } },
          data: { isActive: false },
        });
      }
      return tx.appBanner.update({
        where: { id: req.params.id },
        data: {
          ...input,
          ...(resolved ? { imageUrl: resolved.url, imageWidth: resolved.width, imageHeight: resolved.height } : {}),
        },
      });
    });
    res.json(banner);
  }),
);

appBannerRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.appBanner.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
