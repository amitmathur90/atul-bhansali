import { z } from "zod";
import { PostMediaType, ReactionType } from "../enums";

export const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaType: z.nativeEnum(PostMediaType).default(PostMediaType.NONE),
  mediaUrl: z.string().url().optional(),
  sharedPostId: z.string().uuid().optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const reactToPostSchema = z.object({
  type: z.nativeEnum(ReactionType),
});
export type ReactToPostInput = z.infer<typeof reactToPostSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePostSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentCommentId: z.string().uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const createReportSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const createVerificationRequestSchema = z.object({
  requestedLabel: z.string().min(2).max(100),
});
export type CreateVerificationRequestInput = z.infer<typeof createVerificationRequestSchema>;
