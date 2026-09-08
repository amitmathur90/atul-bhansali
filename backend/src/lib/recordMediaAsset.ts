import sharp from "sharp";
import { prisma } from "./prisma";
import { storageProvider } from "../storage/storage.factory";

interface RecordMediaAssetParams {
  url: string;
  mimeType: string;
  uploadedById: string;
  width?: number;
  height?: number;
}

// Called after every image upload across the admin panel so it becomes selectable
// later from the shared Media Library picker. Best-effort: a failure here must
// never break the primary upload flow that triggered it.
export async function recordMediaAsset(params: RecordMediaAssetParams): Promise<void> {
  try {
    let { width, height } = params;
    if (!width || !height) {
      const buffer = await storageProvider.read(params.url);
      const metadata = await sharp(buffer).metadata();
      width = metadata.width;
      height = metadata.height;
    }
    if (!width || !height) return;
    await prisma.mediaAsset.create({
      data: { url: params.url, width, height, mimeType: params.mimeType, uploadedById: params.uploadedById },
    });
  } catch {
    // best-effort
  }
}
