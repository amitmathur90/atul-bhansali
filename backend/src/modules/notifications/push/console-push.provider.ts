import { logger } from "../../../lib/logger";
import type { PushProvider } from "./push-provider.interface";

// Dev-default provider: logs push payloads instead of sending them. Swap for ExpoPushProvider
// (via expo-server-sdk) once real device tokens are being registered — see build plan Phase 5.
export class ConsolePushProvider implements PushProvider {
  async send(deviceTokens: string[], title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    logger.info(
      `[ConsolePushProvider] -> ${deviceTokens.length} device(s) | "${title}": "${body}"`,
      data ?? {},
    );
  }
}
