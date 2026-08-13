interface ZodIssueLike {
  path: (string | number)[];
  message: string;
}

export function extractErrorMessage(err: unknown): string {
  const errorBody = (
    err as { response?: { data?: { error?: { message?: string; details?: ZodIssueLike[] } } } }
  )?.response?.data?.error;
  if (errorBody?.details?.length) {
    return errorBody.details.map((d) => `${d.path.join(".") || "field"}: ${d.message}`).join("; ");
  }
  return errorBody?.message ?? "Something went wrong";
}
