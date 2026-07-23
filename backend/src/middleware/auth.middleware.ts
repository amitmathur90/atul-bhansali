import type { NextFunction, Request, Response } from "express";
import { OwnerType, type StaffRole } from "@abc/shared";
import { AppError } from "../lib/errors";
import { verifyAccessToken } from "../lib/jwt";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "UNAUTHENTICATED", "Missing or invalid Authorization header"));
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(new AppError(401, "UNAUTHENTICATED", "Invalid or expired token"));
  }
}

// For public-ish endpoints that vary their response for logged-in staff (e.g. announcements
// admins need to see unpublished/scheduled items too) without requiring auth for citizens.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // Ignore invalid tokens on optional-auth routes — treat as anonymous.
    }
  }
  next();
}

export function requireOwnerType(...types: OwnerType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !types.includes(req.user.ownerType)) {
      next(new AppError(403, "FORBIDDEN", "Not allowed for this account type"));
      return;
    }
    next();
  };
}

export function requireRole(...roles: StaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.ownerType !== OwnerType.STAFF || !req.user.role || !roles.includes(req.user.role)) {
      next(new AppError(403, "FORBIDDEN", "Insufficient role"));
      return;
    }
    next();
  };
}
