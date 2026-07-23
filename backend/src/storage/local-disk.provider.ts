import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { publicUrl } from "../config/env";
import type { StorageProvider, UploadedFile } from "./storage-provider.interface";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

function sanitizeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

export class LocalDiskStorageProvider implements StorageProvider {
  async upload(file: UploadedFile, folder: string): Promise<string> {
    const dir = path.join(UPLOADS_ROOT, folder);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${crypto.randomUUID()}${sanitizeExtension(file.originalName)}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    return `${publicUrl}/uploads/${folder}/${filename}`;
  }
}
