import { apiClient } from "./api-client";

// Export endpoints require the Authorization header, so a plain <a href> won't work —
// fetch as a blob and trigger the browser's save dialog manually.
export async function downloadFile(path: string, filenameFallback: string) {
  const res = await apiClient.get(path, { responseType: "blob" });
  const disposition = res.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? filenameFallback;

  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
