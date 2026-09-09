import path from "node:path";
import sharp from "sharp";
import type { UploadedFile } from "./storage-provider.interface";

const MAX_DIMENSION = 1600;

function sanitizeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

// Downscales+recompresses every uploaded image to a sane max size — uploads otherwise
// keep their original camera resolution (often 3000px+), which is wasted bytes for
// thumbnails/avatars and slows list scrolling on low-end devices. Falls back to the
// original buffer if sharp can't decode the format (e.g. an odd HEIC variant).
export async function processImage(file: UploadedFile): Promise<{ buffer: Buffer; extension: string }> {
  if (!file.mimeType.startsWith("image/")) {
    return { buffer: file.buffer, extension: sanitizeExtension(file.originalName) };
  }
  try {
    const buffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    return { buffer, extension: ".jpg" };
  } catch {
    return { buffer: file.buffer, extension: sanitizeExtension(file.originalName) };
  }
}
