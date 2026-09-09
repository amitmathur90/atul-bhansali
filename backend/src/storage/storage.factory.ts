import { env } from "../config/env";
import { CloudinaryStorageProvider } from "./cloudinary.provider";
import { LocalDiskStorageProvider } from "./local-disk.provider";
import type { StorageProvider } from "./storage-provider.interface";

export function createStorageProvider(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "cloudinary":
      return new CloudinaryStorageProvider();
    case "local":
    default:
      return new LocalDiskStorageProvider();
    // "s3" provider plugs in here once the user has real bucket credentials.
  }
}

export const storageProvider = createStorageProvider();
