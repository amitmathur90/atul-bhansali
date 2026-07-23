import { Prisma } from "@prisma/client";
import {
  COMPLAINT_STATUS_TRANSITIONS,
  type ComplaintFiltersInput,
  type CreateComplaintInput,
  OwnerType,
  StaffRole,
  type UpdateComplaintStatusInput,
} from "@abc/shared";
import { AppError } from "../../lib/errors";
import type { AccessTokenPayload } from "../../lib/jwt";
import { prisma } from "../../lib/prisma";
import { notifyOwner } from "../notifications/notifications.service";

const COMPLAINT_INCLUDE = {
  citizen: true,
  category: true,
  ward: true,
  // select (not `true`) — StaffMember also carries passwordHash, which must never reach the API response.
  assignedStaff: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      phone: true,
      designation: true,
      isActive: true,
    },
  },
  images: true,
} satisfies Prisma.ComplaintInclude;

async function generateComplaintNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.complaint.count({
    where: { complaintNumber: { startsWith: `CC-${year}-` } },
  });
  return `CC-${year}-${String(count + 1).padStart(6, "0")}`;
}

function assertCanAccessComplaint(
  user: AccessTokenPayload,
  complaint: { citizenId: string; assignedStaffId: string | null },
) {
  if (user.ownerType === OwnerType.CITIZEN && complaint.citizenId !== user.sub) {
    throw new AppError(403, "FORBIDDEN", "Not your complaint");
  }
  if (
    user.ownerType === OwnerType.STAFF &&
    user.role === StaffRole.STAFF &&
    complaint.assignedStaffId !== user.sub
  ) {
    throw new AppError(403, "FORBIDDEN", "This complaint is not assigned to you");
  }
}

export async function createComplaint(
  citizenId: string,
  input: CreateComplaintInput,
  imageUrls: string[],
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const complaintNumber = await generateComplaintNumber();
    try {
      return await prisma.$transaction(async (tx) => {
        const created = await tx.complaint.create({
          data: {
            complaintNumber,
            citizenId,
            title: input.title,
            description: input.description,
            categoryId: input.categoryId,
            wardId: input.wardId,
            address: input.address,
            latitude: input.latitude,
            longitude: input.longitude,
            priority: input.priority,
            contactNumber: input.contactNumber,
          },
        });

        await tx.complaintStatusHistory.create({
          data: {
            complaintId: created.id,
            toStatus: "RECEIVED",
            changedByType: OwnerType.CITIZEN,
            changedById: citizenId,
          },
        });

        if (imageUrls.length > 0) {
          await tx.complaintImage.createMany({
            data: imageUrls.map((url) => ({
              complaintId: created.id,
              url,
              type: "CITIZEN_UPLOAD",
              uploadedByType: OwnerType.CITIZEN,
              uploadedById: citizenId,
            })),
          });
        }

        // Re-fetch with the include so the response reflects the images just inserted above —
        // the `created` object from .create() was captured before those rows existed.
        return tx.complaint.findUniqueOrThrow({ where: { id: created.id }, include: COMPLAINT_INCLUDE });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue; // complaintNumber collision under concurrent writes — retry with a fresh number
      }
      throw err;
    }
  }
  throw new AppError(
    500,
    "COMPLAINT_NUMBER_GENERATION_FAILED",
    "Could not generate a unique complaint number, please retry",
  );
}

function buildComplaintWhere(
  user: AccessTokenPayload,
  filters: Pick<ComplaintFiltersInput, "status" | "categoryId" | "wardId" | "priority" | "search">,
): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = {};

  if (user.ownerType === OwnerType.CITIZEN) {
    where.citizenId = user.sub;
  } else if (user.role === StaffRole.STAFF) {
    where.assignedStaffId = user.sub;
  }
  // MLA / SUPER_ADMIN see all complaints (subject to the filters below).

  if (filters.status) where.status = filters.status;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.wardId) where.wardId = filters.wardId;
  if (filters.priority) where.priority = filters.priority;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { complaintNumber: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listComplaints(user: AccessTokenPayload, filters: ComplaintFiltersInput) {
  const where = buildComplaintWhere(user, filters);

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: COMPLAINT_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function listComplaintsForExport(
  user: AccessTokenPayload,
  filters: Pick<ComplaintFiltersInput, "status" | "categoryId" | "wardId" | "priority" | "search">,
) {
  const where = buildComplaintWhere(user, filters);
  return prisma.complaint.findMany({
    where,
    include: COMPLAINT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
}

export async function getComplaintById(user: AccessTokenPayload, id: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      ...COMPLAINT_INCLUDE,
      statusHistory: { orderBy: { createdAt: "asc" } },
      feedback: true,
    },
  });
  if (!complaint) throw new AppError(404, "NOT_FOUND", "Complaint not found");

  assertCanAccessComplaint(user, complaint);
  return complaint;
}

export async function assignComplaint(actor: AccessTokenPayload, complaintId: string, staffId: string) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new AppError(404, "NOT_FOUND", "Complaint not found");
  if (complaint.status === "COMPLETED" || complaint.status === "REJECTED") {
    throw new AppError(400, "INVALID_STATUS_TRANSITION", "Cannot reassign a closed complaint");
  }

  const staff = await prisma.staffMember.findUnique({ where: { id: staffId } });
  if (!staff || !staff.isActive) {
    throw new AppError(400, "INVALID_STAFF", "Staff member not found or inactive");
  }

  const fromStatus = complaint.status;
  const toStatus = fromStatus === "RECEIVED" ? "ASSIGNED" : fromStatus;

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.complaint.update({
      where: { id: complaintId },
      data: { assignedStaffId: staffId, assignedAt: new Date(), status: toStatus },
      include: COMPLAINT_INCLUDE,
    });
    await tx.complaintStatusHistory.create({
      data: {
        complaintId,
        fromStatus,
        toStatus,
        remarks: `Assigned to ${staff.name}`,
        changedByType: OwnerType.STAFF,
        changedById: actor.sub,
      },
    });
    return u;
  });

  await notifyOwner(
    "CITIZEN",
    complaint.citizenId,
    "Complaint Assigned",
    `Your complaint ${complaint.complaintNumber} has been assigned to ${staff.name}.`,
    "STATUS_CHANGE",
    { relatedComplaintId: complaintId },
  );
  await notifyOwner(
    "STAFF",
    staffId,
    "New Complaint Assigned",
    `Complaint ${complaint.complaintNumber} has been assigned to you.`,
    "STATUS_CHANGE",
    { relatedComplaintId: complaintId },
  );

  return updated;
}

export async function updateComplaintStatus(
  actor: AccessTokenPayload,
  complaintId: string,
  input: UpdateComplaintStatusInput,
) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new AppError(404, "NOT_FOUND", "Complaint not found");

  assertCanAccessComplaint(actor, complaint);

  const allowedNext = COMPLAINT_STATUS_TRANSITIONS[complaint.status];
  if (!allowedNext.includes(input.status)) {
    throw new AppError(
      400,
      "INVALID_STATUS_TRANSITION",
      `Cannot move a complaint from ${complaint.status} to ${input.status}`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.complaint.update({
      where: { id: complaintId },
      data: {
        status: input.status,
        resolvedAt: input.status === "COMPLETED" ? new Date() : complaint.resolvedAt,
      },
      include: COMPLAINT_INCLUDE,
    });
    await tx.complaintStatusHistory.create({
      data: {
        complaintId,
        fromStatus: complaint.status,
        toStatus: input.status,
        remarks: input.remarks,
        changedByType: actor.ownerType,
        changedById: actor.sub,
      },
    });
    return u;
  });

  await notifyOwner(
    "CITIZEN",
    complaint.citizenId,
    "Complaint Status Updated",
    `Your complaint ${complaint.complaintNumber} is now ${input.status.replace("_", " ")}.`,
    "STATUS_CHANGE",
    { relatedComplaintId: complaintId },
  );

  return updated;
}

export async function addComplaintImages(
  actor: AccessTokenPayload,
  complaintId: string,
  imageUrls: string[],
) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new AppError(404, "NOT_FOUND", "Complaint not found");
  assertCanAccessComplaint(actor, complaint);

  const type = actor.ownerType === OwnerType.STAFF ? "STAFF_WORK_PHOTO" : "CITIZEN_UPLOAD";
  await prisma.complaintImage.createMany({
    data: imageUrls.map((url) => ({
      complaintId,
      url,
      type,
      uploadedByType: actor.ownerType,
      uploadedById: actor.sub,
    })),
  });

  return prisma.complaintImage.findMany({ where: { complaintId }, orderBy: { createdAt: "asc" } });
}

export async function getCitizenDashboardSummary(citizenId: string) {
  const [total, pending, inProgress, resolved] = await Promise.all([
    prisma.complaint.count({ where: { citizenId } }),
    prisma.complaint.count({ where: { citizenId, status: { in: ["RECEIVED", "ASSIGNED"] } } }),
    prisma.complaint.count({ where: { citizenId, status: "IN_PROGRESS" } }),
    prisma.complaint.count({ where: { citizenId, status: "COMPLETED" } }),
  ]);
  return { total, pending, inProgress, resolved };
}
