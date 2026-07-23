import { StaffRole } from "@abc/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const citizensRouter = Router();

citizensRouter.use(requireAuth, requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN));

const listQuerySchema = z.object({
  search: z.string().optional(),
  isBlocked: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

citizensRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, isBlocked, page, pageSize } = listQuerySchema.parse(req.query);
    const where = {
      ...(isBlocked !== undefined ? { isBlocked: isBlocked === "true" } : {}),
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { phone: { contains: search } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.citizen.findMany({
        where,
        include: { ward: true, _count: { select: { complaints: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.citizen.count({ where }),
    ]);
    res.json({ items, total, page, pageSize });
  }),
);

citizensRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const citizen = await prisma.citizen.findUnique({
      where: { id: req.params.id },
      include: { ward: true },
    });
    res.json(citizen);
  }),
);

citizensRouter.get(
  "/:id/complaints",
  asyncHandler(async (req, res) => {
    const complaints = await prisma.complaint.findMany({
      where: { citizenId: req.params.id },
      include: { category: true, ward: true, assignedStaff: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items: complaints });
  }),
);

const updateCitizenSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().max(255).optional(),
  wardId: z.string().uuid().optional(),
  city: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
});

citizensRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateCitizenSchema.parse(req.body);
    const citizen = await prisma.citizen.update({ where: { id: req.params.id }, data: input });
    res.json(citizen);
  }),
);

const blockSchema = z.object({ isBlocked: z.boolean() });

citizensRouter.patch(
  "/:id/block",
  asyncHandler(async (req, res) => {
    const { isBlocked } = blockSchema.parse(req.body);
    const citizen = await prisma.citizen.update({ where: { id: req.params.id }, data: { isBlocked } });
    res.json(citizen);
  }),
);
