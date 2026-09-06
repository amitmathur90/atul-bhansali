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
