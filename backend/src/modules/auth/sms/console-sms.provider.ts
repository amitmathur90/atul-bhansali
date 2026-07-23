import { logger } from "../../../lib/logger";
import type { SmsProvider } from "./sms-provider.interface";

// Dev-default provider: logs the OTP to the server console instead of sending a real SMS.
// Swap for a real provider (Twilio/MSG91/etc.) once the user has an account — see SMS_PROVIDER env.
export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<void> {
    logger.info(`[ConsoleSmsProvider] OTP for ${phone}: ${otp}`);
  }
}
