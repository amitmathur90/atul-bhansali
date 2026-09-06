import { z } from "zod";
import { PostMediaType } from "../enums";

export const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaType: z.nativeEnum(PostMediaType).default(PostMediaType.NONE),
  mediaUrl: z.string().url().optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentCommentId: z.string().uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const createReportSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const createVerificationRequestSchema = z.object({
  requestedLabel: z.string().min(2).max(100),
});
export type CreateVerificationRequestInput = z.infer<typeof createVerificationRequestSchema>;
