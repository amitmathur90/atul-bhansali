import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { OtpVerifyInput } from "@abc/shared";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { createSmsProvider } from "./sms";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

// A fixed, effectively-never-expiring login for Google Play / App Store reviewers.
// A real random OTP only exists within a single API response, which a reviewer
// can't reliably reuse across a review session spanning days — this account gets
// the same OTP every time instead. "9999999999" is never a real citizen's number.
const REVIEWER_TEST_PHONE = "9999999999";
const REVIEWER_TEST_OTP = "123456";
const REVIEWER_OTP_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000;

const smsProvider = createSmsProvider();

function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestOtp(phone: string) {
  const isReviewerAccount = phone === REVIEWER_TEST_PHONE;
  const existingCitizen = await prisma.citizen.findUnique({ where: { phone } });
  const purpose = existingCitizen ? "LOGIN" : "REGISTRATION";

  const otp = isReviewerAccount ? REVIEWER_TEST_OTP : generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.otpVerification.create({
    data: {
      phone,
      otpHash,
      purpose,
      expiresAt: new Date(Date.now() + (isReviewerAccount ? REVIEWER_OTP_TTL_MS : OTP_TTL_MS)),
    },
  });

  if (!isReviewerAccount) {
    await smsProvider.sendOtp(phone, otp);
  }

  return { purpose, otp, isReviewerAccount };
}

export async function verifyOtp(input: OtpVerifyInput) {
  const record = await prisma.otpVerification.findFirst({
    where: { phone: input.phone, verifiedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError(
      400,
      "OTP_EXPIRED_OR_NOT_FOUND",
      "OTP expired or not requested. Please request a new one.",
    );
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError(429, "OTP_LOCKED", "Too many incorrect attempts. Please request a new OTP.");
  }

  const isValid = await bcrypt.compare(input.otp, record.otpHash);
  if (!isValid) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError(400, "OTP_INVALID", "Incorrect OTP");
  }

  // Check registration completeness before consuming the OTP, so a first-time citizen who
  // forgets to submit their name can retry with the same still-valid OTP instead of
  // having to request a brand new one.
  let citizen = await prisma.citizen.findUnique({ where: { phone: input.phone } });
  if (!citizen && !input.name) {
    throw new AppError(400, "REGISTRATION_INCOMPLETE", "Name is required to complete registration");
  }
  if (citizen?.isBlocked) {
    throw new AppError(403, "ACCOUNT_BLOCKED", "This account has been blocked. Contact the MLA office.");
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  if (!citizen) {
    citizen = await prisma.citizen.create({
      data: {
        phone: input.phone,
        name: input.name!,
        wardId: input.wardId,
        address: input.address,
        city: input.city,
        pincode: input.pincode,
      },
    });
  }

  return citizen;
}
