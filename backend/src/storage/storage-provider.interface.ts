export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface StorageProvider {
  /** Stores a file and returns a URL the frontend can load directly. */
  upload(file: UploadedFile, folder: string): Promise<string>;
}
