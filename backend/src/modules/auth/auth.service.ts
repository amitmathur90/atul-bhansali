import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { OwnerType, type StaffRole } from "@abc/shared";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { signAccessToken } from "../../lib/jwt";
import { prisma } from "../../lib/prisma";

function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 0;
  const amount = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "s" | "m" | "h" | "d"];
  return amount * unitMs;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueTokenPair(ownerType: OwnerType, ownerId: string, role?: StaffRole) {
  const accessToken = signAccessToken({ sub: ownerId, ownerType, role });

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL));

  await prisma.refreshToken.create({
    data: { ownerType, ownerId, tokenHash: hashToken(refreshToken), expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function staffLogin(username: string, password: string) {
  const staff = await prisma.staffMember.findUnique({ where: { username } });
  if (!staff || !staff.isActive) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
  }
  const valid = await bcrypt.compare(password, staff.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
  }
  return staff;
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

  let role: StaffRole | undefined;
  if (record.ownerType === OwnerType.STAFF) {
    const staff = await prisma.staffMember.findUnique({ where: { id: record.ownerId } });
    if (!staff || !staff.isActive) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Account no longer active");
    }
    role = staff.role;
  } else {
    const citizen = await prisma.citizen.findUnique({ where: { id: record.ownerId } });
    if (!citizen || citizen.isBlocked) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Account no longer active");
    }
  }

  return issueTokenPair(record.ownerType, record.ownerId, role);
}

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
