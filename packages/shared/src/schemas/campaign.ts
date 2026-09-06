import { z } from "zod";
import { CampaignEventType, CampaignPostType, PartyStatus } from "../enums";

export const createCandidateAnnouncementSchema = z.object({
  candidateName: z.string().min(2).max(150),
  profileImageUrl: z.string().url().optional(),
  position: z.string().min(2).max(100),
  constituency: z.string().min(2).max(150),
  partyStatus: z.nativeEnum(PartyStatus).default(PartyStatus.PARTY),
  partyName: z.string().max(150).optional(),
  message: z.string().min(5).max(3000),
  publishAt: z.coerce.date().optional(),
});
export const updateCandidateAnnouncementSchema = createCandidateAnnouncementSchema.partial().extend({
  isPublished: z.boolean().optional(),
});
export type CreateCandidateAnnouncementInput = z.infer<typeof createCandidateAnnouncementSchema>;
export type UpdateCandidateAnnouncementInput = z.infer<typeof updateCandidateAnnouncementSchema>;

export const createCampaignPostSchema = z.object({
  type: z.nativeEnum(CampaignPostType),
  title: z.string().min(2).max(150),
  description: z.string().max(3000).optional(),
  mediaUrl: z.string().url().optional(),
  publishAt: z.coerce.date().optional(),
});
export const updateCampaignPostSchema = createCampaignPostSchema.partial().extend({
  isPublished: z.boolean().optional(),
});
export type CreateCampaignPostInput = z.infer<typeof createCampaignPostSchema>;
export type UpdateCampaignPostInput = z.infer<typeof updateCampaignPostSchema>;

export const createCampaignEventSchema = z.object({
  title: z.string().min(2).max(150),
  type: z.nativeEnum(CampaignEventType),
  eventDate: z.coerce.date(),
  location: z.string().min(2).max(200),
  details: z.string().max(2000).optional(),
});
export const updateCampaignEventSchema = createCampaignEventSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type CreateCampaignEventInput = z.infer<typeof createCampaignEventSchema>;
export type UpdateCampaignEventInput = z.infer<typeof updateCampaignEventSchema>;
