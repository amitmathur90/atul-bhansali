import jwt from "jsonwebtoken";
import type { OwnerType, StaffRole } from "@abc/shared";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  ownerType: OwnerType;
  role?: StaffRole;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}
