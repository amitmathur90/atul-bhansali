import { env } from "../../../config/env";
import { ConsoleSmsProvider } from "./console-sms.provider";
import type { SmsProvider } from "./sms-provider.interface";

export function createSmsProvider(): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case "console":
    default:
      return new ConsoleSmsProvider();
    // "twilio" / "msg91" providers plug in here once real credentials are configured.
  }
}
