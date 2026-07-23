import { createDepartmentSchema, StaffRole, updateDepartmentSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const departmentsRouter = Router();

departmentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    res.json({ items: departments });
  }),
);

departmentsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createDepartmentSchema.parse(req.body);
    const department = await prisma.department.create({ data: input });
    res.status(201).json(department);
  }),
);

departmentsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateDepartmentSchema.parse(req.body);
    const department = await prisma.department.update({ where: { id: req.params.id }, data: input });
    res.json(department);
  }),
);

departmentsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
