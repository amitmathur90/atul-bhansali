import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { logger } from "../../../lib/logger";
import { prisma } from "../../../lib/prisma";
import type { PushProvider } from "./push-provider.interface";

const expo = new Expo();

export class ExpoPushProvider implements PushProvider {
  async send(deviceTokens: string[], title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    const validTokens = deviceTokens.filter((t) => Expo.isExpoPushToken(t));
    const invalidTokens = deviceTokens.filter((t) => !Expo.isExpoPushToken(t));
    if (invalidTokens.length > 0) {
      logger.warn(`[ExpoPushProvider] Skipping ${invalidTokens.length} invalid Expo push token(s)`);
    }
    if (validTokens.length === 0) return;

    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data: data ?? {},
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        // "DeviceNotRegistered" means the app was uninstalled or the token is stale — clean it up
        // so we stop trying to push to it.
        const staleTokens = tickets
          .map((ticket, i) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? chunk[i].to : null))
          .filter((t): t is string => !!t);
        if (staleTokens.length > 0) {
          await prisma.deviceToken.deleteMany({ where: { token: { in: staleTokens as string[] } } });
        }
      } catch (err) {
        logger.error("[ExpoPushProvider] Failed to send push chunk", err);
      }
    }
  }
}
