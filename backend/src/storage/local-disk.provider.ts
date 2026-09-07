import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { publicUrl } from "../config/env";
import type { StorageProvider, UploadedFile } from "./storage-provider.interface";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const MAX_DIMENSION = 1600;

function sanitizeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

// Downscales+recompresses every uploaded image to a sane max size — uploads otherwise
// keep their original camera resolution (often 3000px+), which is wasted bytes for
// thumbnails/avatars and slows list scrolling on low-end devices. Falls back to the
// original buffer if sharp can't decode the format (e.g. an odd HEIC variant).
async function processImage(file: UploadedFile): Promise<{ buffer: Buffer; extension: string }> {
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

export class LocalDiskStorageProvider implements StorageProvider {
  async upload(file: UploadedFile, folder: string): Promise<string> {
    const dir = path.join(UPLOADS_ROOT, folder);
    await fs.mkdir(dir, { recursive: true });

    const { buffer, extension } = await processImage(file);
    const filename = `${crypto.randomUUID()}${extension}`;
    await fs.writeFile(path.join(dir, filename), buffer);

    return `${publicUrl}/uploads/${folder}/${filename}`;
  }

  async read(url: string): Promise<Buffer> {
    const marker = "/uploads/";
    const index = url.indexOf(marker);
    if (index === -1) throw new Error(`Not a local-disk URL: ${url}`);
    const relativePath = url.slice(index + marker.length);
    return fs.readFile(path.join(UPLOADS_ROOT, relativePath));
  }
}
