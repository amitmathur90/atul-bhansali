import { assignStaffAreasSchema, createStaffSchema, StaffRole, updateStaffSchema } from "@abc/shared";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const staffRouter = Router();

staffRouter.use(requireAuth);

// Read-only list — used by the admin portal's "assign to" dropdown (MLA + Super Admin).
staffRouter.get(
  "/",
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (_req, res) => {
    const staff = await prisma.staffMember.findMany({
      where: { isActive: true, role: "STAFF" },
      select: { id: true, name: true, username: true, designation: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json({ items: staff });
  }),
);

// Full staff management (create/edit/deactivate/assign areas) is Super Admin only.
staffRouter.use(requireRole(StaffRole.SUPER_ADMIN));

staffRouter.get(
  "/all",
  asyncHandler(async (_req, res) => {
    const staff = await prisma.staffMember.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        designation: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        wardAssignments: { include: { ward: true } },
        categoryAssignments: { include: { category: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ items: staff });
  }),
);

staffRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createStaffSchema.parse(req.body);
    const existing = await prisma.staffMember.findUnique({ where: { username: input.username } });
    if (existing) throw new AppError(409, "ALREADY_EXISTS", "Username already taken");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const staff = await prisma.staffMember.create({
      data: {
        name: input.name,
        username: input.username,
        passwordHash,
        role: input.role,
        phone: input.phone,
        designation: input.designation,
      },
    });
    const { passwordHash: _passwordHash, ...safeStaff } = staff;
    res.status(201).json(safeStaff);
  }),
);

staffRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const staff = await prisma.staffMember.findUnique({
      where: { id: req.params.id },
      include: {
        wardAssignments: { include: { ward: true } },
        categoryAssignments: { include: { category: true } },
      },
    });
    if (!staff) throw new AppError(404, "NOT_FOUND", "Staff member not found");
    const { passwordHash: _passwordHash, ...safeStaff } = staff;
    res.json(safeStaff);
  }),
);

staffRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateStaffSchema.parse(req.body);
    const staff = await prisma.staffMember.update({ where: { id: req.params.id }, data: input });
    const { passwordHash: _passwordHash, ...safeStaff } = staff;
    res.json(safeStaff);
  }),
);

staffRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    // Deactivate rather than hard-delete — staff may be referenced by existing complaints.
    await prisma.staffMember.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  }),
);

staffRouter.patch(
  "/:id/assignments",
  asyncHandler(async (req, res) => {
    const { wardIds, categoryIds } = assignStaffAreasSchema.parse(req.body);
    const staffId = req.params.id;

    await prisma.$transaction([
      prisma.staffWardAssignment.deleteMany({ where: { staffId } }),
      prisma.staffCategoryAssignment.deleteMany({ where: { staffId } }),
      prisma.staffWardAssignment.createMany({ data: wardIds.map((wardId) => ({ staffId, wardId })) }),
      prisma.staffCategoryAssignment.createMany({
        data: categoryIds.map((categoryId) => ({ staffId, categoryId })),
      }),
    ]);

    const staff = await prisma.staffMember.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        designation: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        wardAssignments: { include: { ward: true } },
        categoryAssignments: { include: { category: true } },
      },
    });
    res.json(staff);
  }),
);

staffRouter.get(
  "/:id/performance",
  asyncHandler(async (req, res) => {
    const staffId = req.params.id;
    const [assigned, completed, pending, rejected] = await Promise.all([
      prisma.complaint.count({ where: { assignedStaffId: staffId } }),
      prisma.complaint.count({ where: { assignedStaffId: staffId, status: "COMPLETED" } }),
      prisma.complaint.count({ where: { assignedStaffId: staffId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.complaint.count({ where: { assignedStaffId: staffId, status: "REJECTED" } }),
    ]);
    res.json({ assigned, completed, pending, rejected });
  }),
);
