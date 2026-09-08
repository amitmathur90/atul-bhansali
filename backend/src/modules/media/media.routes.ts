import { StaffRole } from "@abc/shared";
import { Router } from "express";
import sharp from "sharp";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { storageProvider } from "../../storage/storage.factory";

export const mediaRouter = Router();

// The media library is scoped to "images this account uploaded" per the spec —
// every admin sees and reuses only their own uploads.
mediaRouter.get(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const items = await prisma.mediaAsset.findMany({
      where: { uploadedById: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ items });
  }),
);

mediaRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "MISSING_IMAGE", "An image is required");
    const url = await storageProvider.upload(
      { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype },
      "media-library",
    );
    const storedBuffer = await storageProvider.read(url);
    const metadata = await sharp(storedBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new AppError(400, "INVALID_IMAGE", "Could not read the image dimensions");
    }
    const asset = await prisma.mediaAsset.create({
      data: {
        url,
        width: metadata.width,
        height: metadata.height,
        mimeType: req.file.mimetype,
        uploadedById: req.user!.sub,
      },
    });
    res.status(201).json(asset);
  }),
);
