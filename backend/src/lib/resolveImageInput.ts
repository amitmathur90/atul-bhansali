import sharp from "sharp";
import { AppError } from "./errors";
import { prisma } from "./prisma";
import { recordMediaAsset } from "./recordMediaAsset";
import { storageProvider } from "../storage/storage.factory";

interface ResolvedImage {
  url: string;
  width: number;
  height: number;
}

// Powers the "upload a new file, or pick one from the Media Library" pattern for
// endpoints that need exact pixel dimensions (poster templates, the app banner).
// `libraryImageUrl` is the URL of a previously-uploaded MediaAsset the admin picked
// in the library modal instead of choosing a new file.
export async function resolveImageInput(
  file: Express.Multer.File | undefined,
  libraryImageUrl: string | undefined,
  uploadFolder: string,
  uploadedById: string,
): Promise<ResolvedImage | null> {
  if (file) {
    const url = await storageProvider.upload(
      { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype },
      uploadFolder,
    );
    const buffer = await storageProvider.read(url);
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new AppError(400, "INVALID_IMAGE", "Could not read the image dimensions");
    }
    await recordMediaAsset({
      url,
      mimeType: file.mimetype,
      uploadedById,
      width: metadata.width,
      height: metadata.height,
    });
    return { url, width: metadata.width, height: metadata.height };
  }
  if (libraryImageUrl) {
    const asset = await prisma.mediaAsset.findFirst({ where: { url: libraryImageUrl, uploadedById } });
    if (!asset) throw new AppError(400, "INVALID_IMAGE", "Selected image was not found in your media library");
    return { url: asset.url, width: asset.width, height: asset.height };
  }
  return null;
}
