import { env } from "../config/env";
import { LocalDiskStorageProvider } from "./local-disk.provider";
import type { StorageProvider } from "./storage-provider.interface";

export function createStorageProvider(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "local":
    default:
      return new LocalDiskStorageProvider();
    // "s3" / "cloudinary" providers plug in here once the user has real bucket credentials.
  }
}

export const storageProvider = createStorageProvider();
