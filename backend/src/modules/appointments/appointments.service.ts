import { Prisma } from "@prisma/client";
import {
  APPOINTMENT_STATUS_TRANSITIONS,
  type AppointmentFiltersInput,
  type CreateAppointmentInput,
  OwnerType,
  type UpdateAppointmentStatusInput,
} from "@abc/shared";
import { AppError } from "../../lib/errors";
import type { AccessTokenPayload } from "../../lib/jwt";
import { prisma } from "../../lib/prisma";
import { notifyOwner } from "../notifications/notifications.service";

function assertCanAccessAppointment(
  user: AccessTokenPayload,
  appointment: { citizenId: string },
) {
  if (user.ownerType === OwnerType.CITIZEN && appointment.citizenId !== user.sub) {
    throw new AppError(403, "FORBIDDEN", "Not your appointment");
  }
}

export async function createAppointment(citizenId: string, input: CreateAppointmentInput) {
  return prisma.appointment.create({
    data: {
      citizenId,
      purpose: input.purpose,
      preferredDate: input.preferredDate,
      contactNumber: input.contactNumber,
    },
  });
}

export async function listAppointments(user: AccessTokenPayload, filters: AppointmentFiltersInput) {
  const where: Prisma.AppointmentWhereInput = {};
  if (user.ownerType === OwnerType.CITIZEN) where.citizenId = user.sub;
  if (filters.status) where.status = filters.status;

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { citizen: true },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getAppointmentById(user: AccessTokenPayload, id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { citizen: true },
  });
  if (!appointment) throw new AppError(404, "NOT_FOUND", "Appointment not found");
  assertCanAccessAppointment(user, appointment);
  return appointment;
}

export async function updateAppointmentStatus(
  actor: AccessTokenPayload,
  appointmentId: string,
  input: UpdateAppointmentStatusInput,
) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new AppError(404, "NOT_FOUND", "Appointment not found");
  assertCanAccessAppointment(actor, appointment);

  // Citizens may only cancel their own pending/scheduled request — every other
  // transition (approve/reject/schedule/complete) is staff-only.
  if (actor.ownerType === OwnerType.CITIZEN && input.status !== "CANCELLED") {
    throw new AppError(403, "FORBIDDEN", "Citizens may only cancel an appointment");
  }

  const allowedNext = APPOINTMENT_STATUS_TRANSITIONS[appointment.status];
  if (!allowedNext.includes(input.status)) {
    throw new AppError(
      400,
      "INVALID_STATUS_TRANSITION",
      `Cannot move an appointment from ${appointment.status} to ${input.status}`,
    );
  }
  if (input.status === "SCHEDULED" && !input.scheduledAt) {
    throw new AppError(400, "SCHEDULED_AT_REQUIRED", "scheduledAt is required when scheduling");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: input.status,
      scheduledAt: input.status === "SCHEDULED" ? input.scheduledAt : appointment.scheduledAt,
      remarks: input.remarks ?? appointment.remarks,
    },
    include: { citizen: true },
  });

  await notifyOwner(
    "CITIZEN",
    appointment.citizenId,
    "Appointment Update",
    `Your appointment request is now ${input.status.replace("_", " ")}.`,
    "MEETING",
    { relatedAppointmentId: appointmentId },
  );

  return updated;
}
