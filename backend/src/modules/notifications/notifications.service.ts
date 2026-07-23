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
