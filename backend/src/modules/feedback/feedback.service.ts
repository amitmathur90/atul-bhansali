import type { CreateFeedbackInput } from "@abc/shared";
import { OwnerType } from "@abc/shared";
import { AppError } from "../../lib/errors";
import type { AccessTokenPayload } from "../../lib/jwt";
import { prisma } from "../../lib/prisma";

export async function createFeedback(
  actor: AccessTokenPayload,
  complaintId: string,
  input: CreateFeedbackInput,
) {
  if (actor.ownerType !== OwnerType.CITIZEN) {
    throw new AppError(403, "FORBIDDEN", "Only citizens can leave feedback");
  }

  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new AppError(404, "NOT_FOUND", "Complaint not found");
  if (complaint.citizenId !== actor.sub) {
    throw new AppError(403, "FORBIDDEN", "Not your complaint");
  }
  if (complaint.status !== "COMPLETED") {
    throw new AppError(400, "INVALID_STATE", "Feedback can only be left on a completed complaint");
  }

  const existing = await prisma.feedback.findUnique({ where: { complaintId } });
  if (existing) {
    throw new AppError(409, "ALREADY_EXISTS", "Feedback has already been submitted for this complaint");
  }

  return prisma.feedback.create({
    data: {
      complaintId,
      citizenId: actor.sub,
      rating: input.rating,
      comment: input.comment,
      satisfied: input.satisfied,
    },
  });
}

export async function getFeedbackForComplaint(actor: AccessTokenPayload, complaintId: string) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new AppError(404, "NOT_FOUND", "Complaint not found");
  if (actor.ownerType === OwnerType.CITIZEN && complaint.citizenId !== actor.sub) {
    throw new AppError(403, "FORBIDDEN", "Not your complaint");
  }
  return prisma.feedback.findUnique({ where: { complaintId } });
}

export async function listFeedback(filters: { satisfied?: boolean; page: number; pageSize: number }) {
  const where = filters.satisfied === undefined ? {} : { satisfied: filters.satisfied };
  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: { citizen: true, complaint: { select: { complaintNumber: true, title: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.feedback.count({ where }),
  ]);
  return { items, total, page: filters.page, pageSize: filters.pageSize };
}
