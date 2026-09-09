import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { publicUrl } from "../config/env";
import { processImage } from "./processImage";
import type { StorageProvider, UploadedFile } from "./storage-provider.interface";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

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
