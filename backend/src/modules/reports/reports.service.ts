import { getReportDateRange, type ReportPeriod } from "../../lib/dateRanges";
import { prisma } from "../../lib/prisma";

export async function getPeriodSummary(period: ReportPeriod, anchorDate?: string) {
  const { start, end } = getReportDateRange(period, anchorDate ? new Date(anchorDate) : new Date());

  const where = { createdAt: { gte: start, lte: end } };
  const [total, received, assigned, inProgress, completed, rejected] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.count({ where: { ...where, status: "RECEIVED" } }),
    prisma.complaint.count({ where: { ...where, status: "ASSIGNED" } }),
    prisma.complaint.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.complaint.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.complaint.count({ where: { ...where, status: "REJECTED" } }),
  ]);

  return { period, start, end, total, received, assigned, inProgress, completed, rejected };
}

export async function getWardWiseReport() {
  const wards = await prisma.ward.findMany({ orderBy: { wardNumber: "asc" } });
  const rows = await Promise.all(
    wards.map(async (ward) => {
      const [total, completed, pending] = await Promise.all([
        prisma.complaint.count({ where: { wardId: ward.id } }),
        prisma.complaint.count({ where: { wardId: ward.id, status: "COMPLETED" } }),
        prisma.complaint.count({
          where: { wardId: ward.id, status: { in: ["RECEIVED", "ASSIGNED", "IN_PROGRESS"] } },
        }),
      ]);
      return { ward, total, completed, pending };
    }),
  );
  return rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
}

export async function getCategoryWiseReport() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const rows = await Promise.all(
    categories.map(async (category) => {
      const [total, completed, pending] = await Promise.all([
        prisma.complaint.count({ where: { categoryId: category.id } }),
        prisma.complaint.count({ where: { categoryId: category.id, status: "COMPLETED" } }),
        prisma.complaint.count({
          where: { categoryId: category.id, status: { in: ["RECEIVED", "ASSIGNED", "IN_PROGRESS"] } },
        }),
      ]);
      return { category, total, completed, pending };
    }),
  );
  return rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
}

export async function getOfficerWiseReport() {
  const staff = await prisma.staffMember.findMany({
    where: { role: "STAFF" },
    select: { id: true, name: true, username: true, role: true, designation: true, phone: true },
    orderBy: { name: "asc" },
  });
  const rows = await Promise.all(
    staff.map(async (member) => {
      const [assigned, completed, pending, completedComplaints] = await Promise.all([
        prisma.complaint.count({ where: { assignedStaffId: member.id } }),
        prisma.complaint.count({ where: { assignedStaffId: member.id, status: "COMPLETED" } }),
        prisma.complaint.count({
          where: { assignedStaffId: member.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
        }),
        prisma.complaint.findMany({
          where: { assignedStaffId: member.id, status: "COMPLETED", resolvedAt: { not: null } },
          select: { assignedAt: true, resolvedAt: true },
        }),
      ]);

      const resolutionTimesMs = completedComplaints
        .filter((c) => c.assignedAt && c.resolvedAt)
        .map((c) => c.resolvedAt!.getTime() - c.assignedAt!.getTime());
      const avgResolutionHours =
        resolutionTimesMs.length > 0
          ? resolutionTimesMs.reduce((a, b) => a + b, 0) / resolutionTimesMs.length / 3_600_000
          : null;

      return { staff: member, assigned, completed, pending, avgResolutionHours };
    }),
  );
  return rows.filter((r) => r.assigned > 0).sort((a, b) => b.assigned - a.assigned);
}
