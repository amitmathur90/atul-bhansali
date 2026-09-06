import type { NotificationType, RecipientType } from "@abc/shared";
import { prisma } from "../../lib/prisma";
import { pushProvider } from "./push";

export async function notifyOwner(
  recipientType: RecipientType,
  recipientId: string,
  title: string,
  body: string,
  type: NotificationType,
  extra?: {
    relatedComplaintId?: string;
    relatedAnnouncementId?: string;
    relatedAppointmentId?: string;
  },
) {
  await prisma.notification.create({
    data: { recipientType, recipientId, title, body, type, ...extra },
  });

  const deviceTokens = await prisma.deviceToken.findMany({
    where: { ownerType: recipientType, ownerId: recipientId },
  });

  if (deviceTokens.length > 0) {
    await pushProvider.send(
      deviceTokens.map((d) => d.token),
      title,
      body,
      extra,
    );
  }
}

// Broadcasts a notification to every non-blocked citizen — used when publishing content
// meant for all citizens (announcements, campaign posts/events), as opposed to notifyOwner
// above which targets one specific recipient (e.g. a complaint's citizen).
export async function notifyAllCitizens(
  title: string,
  body: string,
  type: NotificationType,
  extra?: {
    relatedAnnouncementId?: string;
    relatedCampaignPostId?: string;
    relatedCampaignEventId?: string;
  },
) {
  const citizens = await prisma.citizen.findMany({ where: { isBlocked: false }, select: { id: true } });
  if (citizens.length === 0) return;

  await prisma.notification.createMany({
    data: citizens.map((c) => ({
      recipientType: "CITIZEN" as const,
      recipientId: c.id,
      title,
      body,
      type,
      ...extra,
    })),
  });

  const deviceTokens = await prisma.deviceToken.findMany({
    where: { ownerType: "CITIZEN", ownerId: { in: citizens.map((c) => c.id) } },
  });
  if (deviceTokens.length > 0) {
    await pushProvider.send(
      deviceTokens.map((d) => d.token),
      title,
      body,
      extra,
    );
  }
}

// Notifies everyone following a given citizen — used when that citizen publishes a new
// feed post, so followers hear about it without every citizen being spammed.
export async function notifyFollowers(citizenId: string, title: string, body: string, type: NotificationType) {
  const followers = await prisma.follow.findMany({ where: { followingId: citizenId }, select: { followerId: true } });
  if (followers.length === 0) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      recipientType: "CITIZEN" as const,
      recipientId: f.followerId,
      title,
      body,
      type,
    })),
  });

  const deviceTokens = await prisma.deviceToken.findMany({
    where: { ownerType: "CITIZEN", ownerId: { in: followers.map((f) => f.followerId) } },
  });
  if (deviceTokens.length > 0) {
    await pushProvider.send(
      deviceTokens.map((d) => d.token),
      title,
      body,
    );
  }
}
