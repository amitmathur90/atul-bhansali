import { StaffRole } from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const settingsRouter = Router();

const updateSettingsSchema = z.record(z.string(), z.string());

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.settings.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json(settings);
  }),
);

settingsRouter.patch(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateSettingsSchema.parse(req.body);
    await prisma.$transaction(
      Object.entries(input).map(([key, value]) =>
        prisma.settings.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    );
    const rows = await prisma.settings.findMany();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  }),
);
