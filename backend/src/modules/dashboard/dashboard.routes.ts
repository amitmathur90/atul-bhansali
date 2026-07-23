import { StaffRole } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { getReportDateRange } from "../../lib/dateRanges";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/admin",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (_req, res) => {
    const today = getReportDateRange("daily");

    const [todayComplaints, pendingComplaints, resolvedComplaints, activeUsers, wardGroups, categoryGroups, staffGroups] =
      await Promise.all([
        prisma.complaint.count({ where: { createdAt: { gte: today.start, lte: today.end } } }),
        prisma.complaint.count({ where: { status: { in: ["RECEIVED", "ASSIGNED", "IN_PROGRESS"] } } }),
        prisma.complaint.count({ where: { status: "COMPLETED" } }),
        prisma.citizen.count({ where: { isBlocked: false } }),
        prisma.complaint.groupBy({ by: ["wardId"], _count: { _all: true } }),
        prisma.complaint.groupBy({ by: ["categoryId"], _count: { _all: true } }),
        prisma.complaint.groupBy({
          by: ["assignedStaffId"],
          _count: { _all: true },
          where: { assignedStaffId: { not: null } },
        }),
      ]);

    const wards = await prisma.ward.findMany({ where: { id: { in: wardGroups.map((w) => w.wardId) } } });
    const wardAnalytics = wardGroups
      .map((g) => ({
        ward: wards.find((w) => w.id === g.wardId),
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryGroups.map((c) => c.categoryId) } },
    });
    const categoryAnalytics = categoryGroups
      .map((g) => ({
        category: categories.find((c) => c.id === g.categoryId),
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const staffIds = staffGroups.map((s) => s.assignedStaffId).filter((id): id is string => !!id);
    const staffMembers = await prisma.staffMember.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, name: true, username: true, role: true, designation: true, phone: true },
    });
    const staffPerformance = staffGroups
      .map((g) => ({
        staff: staffMembers.find((s) => s.id === g.assignedStaffId),
        assignedCount: g._count._all,
      }))
      .sort((a, b) => b.assignedCount - a.assignedCount)
      .slice(0, 10);

    res.json({
      todayComplaints,
      pendingComplaints,
      resolvedComplaints,
      activeUsers,
      wardAnalytics,
      categoryAnalytics,
      staffPerformance,
    });
  }),
);
