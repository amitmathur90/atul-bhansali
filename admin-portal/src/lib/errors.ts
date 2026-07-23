export function extractErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
    ?.error?.message;
  return message ?? "Something went wrong";
}
