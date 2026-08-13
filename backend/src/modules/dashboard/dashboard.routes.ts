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
  asyncHandler(async (req, res) => {
    const today = getReportDateRange("daily");
    const trendDays = Math.min(Math.max(Number(req.query.trendDays) || 14, 1), 90);
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - (trendDays - 1));
    trendStart.setHours(0, 0, 0, 0);

    const [
      totalComplaints,
      todayComplaints,
      pendingComplaints,
      resolvedComplaints,
      rejectedComplaints,
      activeUsers,
      wardGroups,
      categoryGroups,
      staffGroups,
      staffCompletedGroups,
      recentComplaints,
      trendComplaints,
    ] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { createdAt: { gte: today.start, lte: today.end } } }),
      prisma.complaint.count({ where: { status: { in: ["RECEIVED", "ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.complaint.count({ where: { status: "COMPLETED" } }),
      prisma.complaint.count({ where: { status: "REJECTED" } }),
      prisma.citizen.count({ where: { isBlocked: false } }),
      prisma.complaint.groupBy({ by: ["wardId"], _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ["categoryId"], _count: { _all: true } }),
      prisma.complaint.groupBy({
        by: ["assignedStaffId"],
        _count: { _all: true },
        where: { assignedStaffId: { not: null } },
      }),
      prisma.complaint.groupBy({
        by: ["assignedStaffId"],
        _count: { _all: true },
        where: { assignedStaffId: { not: null }, status: "COMPLETED" },
      }),
      prisma.complaint.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true } }, ward: { select: { name: true, wardNumber: true } } },
      }),
      prisma.complaint.findMany({
        where: { createdAt: { gte: trendStart } },
        select: { createdAt: true },
      }),
    ]);

    const trendBuckets = new Map<string, number>();
    for (let i = 0; i < trendDays; i++) {
      const d = new Date(trendStart);
      d.setDate(d.getDate() + i);
      trendBuckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const c of trendComplaints) {
      const key = c.createdAt.toISOString().slice(0, 10);
      if (trendBuckets.has(key)) trendBuckets.set(key, (trendBuckets.get(key) ?? 0) + 1);
    }
    const trend = Array.from(trendBuckets.entries()).map(([date, count]) => ({ date, count }));

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
      .map((g) => {
        const completedCount =
          staffCompletedGroups.find((c) => c.assignedStaffId === g.assignedStaffId)?._count._all ?? 0;
        return {
          staff: staffMembers.find((s) => s.id === g.assignedStaffId),
          assignedCount: g._count._all,
          completedCount,
          progressPercent: g._count._all > 0 ? Math.round((completedCount / g._count._all) * 100) : 0,
        };
      })
      .sort((a, b) => b.assignedCount - a.assignedCount)
      .slice(0, 10);

    const recentComplaintsOut = recentComplaints.map((c) => ({
      id: c.id,
      complaintNumber: c.complaintNumber,
      category: c.category.name,
      ward: c.ward ? `वार्ड ${c.ward.wardNumber}` : "—",
      status: c.status,
      createdAt: c.createdAt,
    }));

    res.json({
      totalComplaints,
      todayComplaints,
      pendingComplaints,
      resolvedComplaints,
      rejectedComplaints,
      activeUsers,
      wardAnalytics,
      categoryAnalytics,
      staffPerformance,
      recentComplaints: recentComplaintsOut,
      trend,
    });
  }),
);
