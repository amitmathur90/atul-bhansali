import { createCategorySchema, StaffRole, updateCategorySchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { department: true },
    });
    res.json({ items: categories });
  }),
);

categoriesRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.parse(req.body);
    const category = await prisma.category.create({ data: input });
    res.status(201).json(category);
  }),
);

categoriesRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateCategorySchema.parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data: input });
    res.json(category);
  }),
);

categoriesRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    // Soft-delete: categories are referenced by existing complaints, so hard-deleting would
    // break history. Deactivating keeps it out of new-complaint pickers instead.
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  }),
);
