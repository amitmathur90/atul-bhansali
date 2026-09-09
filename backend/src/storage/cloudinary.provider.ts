import crypto from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { processImage } from "./processImage";
import type { StorageProvider, UploadedFile } from "./storage-provider.interface";

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error(
        "STORAGE_PROVIDER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET",
      );
    }
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async upload(file: UploadedFile, folder: string): Promise<string> {
    const { buffer } = await processImage(file);
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `citizen-connect/${folder}`, public_id: crypto.randomUUID(), resource_type: "image" },
        (error, uploadResult) => {
          if (error || !uploadResult) reject(error ?? new Error("Cloudinary upload returned no result"));
          else resolve(uploadResult);
        },
      );
      stream.end(buffer);
    });
    return result.secure_url;
  }

  async read(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
}
