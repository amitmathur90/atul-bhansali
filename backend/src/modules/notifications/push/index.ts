import { env } from "../../../config/env";
import { ConsolePushProvider } from "./console-push.provider";
import { ExpoPushProvider } from "./expo-push.provider";
import type { PushProvider } from "./push-provider.interface";

export function createPushProvider(): PushProvider {
  switch (env.PUSH_PROVIDER) {
    case "expo":
      return new ExpoPushProvider();
    case "console":
    default:
      return new ConsolePushProvider();
  }
}

export const pushProvider = createPushProvider();
