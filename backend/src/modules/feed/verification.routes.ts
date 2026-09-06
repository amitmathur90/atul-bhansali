import { createVerificationRequestSchema, OwnerType, StaffRole } from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const verificationRouter = Router();

verificationRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can request verification");
    }
    const input = createVerificationRequestSchema.parse(req.body);
    const request = await prisma.verificationRequest.create({
      data: { ...input, citizenId: req.user!.sub },
    });
    res.status(201).json(request);
  }),
);

verificationRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens have verification requests");
    }
    const items = await prisma.verificationRequest.findMany({
      where: { citizenId: req.user!.sub },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

verificationRouter.get(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const items = await prisma.verificationRequest.findMany({
      include: { citizen: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

const reviewSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

verificationRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { status } = reviewSchema.parse(req.body);
    const request = await prisma.verificationRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new AppError(404, "NOT_FOUND", "Verification request not found");

    const updated = await prisma.verificationRequest.update({
      where: { id: req.params.id },
      data: { status, reviewedById: req.user!.sub },
    });
    if (status === "APPROVED") {
      await prisma.citizen.update({
        where: { id: request.citizenId },
        data: { isVerified: true, verifiedLabel: request.requestedLabel },
      });
    }
    res.json(updated);
  }),
);
