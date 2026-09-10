import {
  OwnerType,
  otpRequestSchema,
  otpVerifySchema,
  refreshTokenSchema,
  staffLoginSchema,
} from "@abc/shared";
import { getOrCreateLinkedCitizenId } from "../../lib/actingCitizen";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { issueTokenPair, revokeRefreshToken, rotateRefreshToken, staffLogin } from "./auth.service";
import { requestOtp, verifyOtp } from "./otp.service";

export const requestOtpHandler = asyncHandler(async (req, res) => {
  const { phone } = otpRequestSchema.parse(req.body);
  const result = await requestOtp(phone);
  res.json({
    purpose: result.purpose,
    // No real SMS/WhatsApp delivery is configured yet (SMS_PROVIDER=console just logs
    // server-side), so surface the OTP in the response until a real provider is wired up.
    // Always surfaced for the reviewer test account regardless of provider, since a real
    // SMS provider being added later shouldn't break app store review access.
    ...(env.SMS_PROVIDER === "console" || result.isReviewerAccount ? { devOtp: result.otp } : {}),
  });
});

export const verifyOtpHandler = asyncHandler(async (req, res) => {
  const input = otpVerifySchema.parse(req.body);
  const citizen = await verifyOtp(input);
  const tokens = await issueTokenPair(OwnerType.CITIZEN, citizen.id);
  res.json({ citizen, ...tokens });
});

export const staffLoginHandler = asyncHandler(async (req, res) => {
  const { username, password } = staffLoginSchema.parse(req.body);
  const staff = await staffLogin(username, password);
  const tokens = await issueTokenPair(OwnerType.STAFF, staff.id, staff.role);
  const linkedCitizenId = await getOrCreateLinkedCitizenId(staff.id);
  const { passwordHash: _passwordHash, ...safeStaff } = staff;
  res.json({ staff: { ...safeStaff, linkedCitizenId }, ...tokens });
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);
  const tokens = await rotateRefreshToken(refreshToken);
  res.json(tokens);
});

export const logoutHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);
  await revokeRefreshToken(refreshToken);
  res.status(204).send();
});

export const meHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  }

  if (req.user.ownerType === OwnerType.CITIZEN) {
    const citizen = await prisma.citizen.findUnique({ where: { id: req.user.sub } });
    if (!citizen) throw new AppError(404, "NOT_FOUND", "Account not found");
    res.json({ ownerType: OwnerType.CITIZEN, profile: citizen });
    return;
  }

  const staff = await prisma.staffMember.findUnique({ where: { id: req.user.sub } });
  if (!staff) throw new AppError(404, "NOT_FOUND", "Account not found");
  const linkedCitizenId = await getOrCreateLinkedCitizenId(staff.id);
  const { passwordHash: _passwordHash, ...safeStaff } = staff;
  res.json({ ownerType: OwnerType.STAFF, profile: { ...safeStaff, linkedCitizenId } });
});
