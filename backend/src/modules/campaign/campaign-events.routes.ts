import { createCampaignEventSchema, NotificationType, OwnerType, StaffRole, updateCampaignEventSchema } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.middleware";
import { notifyAllCitizens } from "../notifications/notifications.service";

export const campaignEventsRouter = Router();

async function withInterestInfo(items: { id: string }[], citizenId?: string) {
  const counts = await prisma.campaignEventInterest.groupBy({
    by: ["eventId"],
    _count: { _all: true },
    where: { eventId: { in: items.map((i) => i.id) } },
  });
  const interestedIds = citizenId
    ? new Set(
        (
          await prisma.campaignEventInterest.findMany({
            where: { citizenId, eventId: { in: items.map((i) => i.id) } },
            select: { eventId: true },
          })
        ).map((i) => i.eventId),
      )
    : new Set<string>();

  return items.map((item) => ({
    ...item,
    interestedCount: counts.find((c) => c.eventId === item.id)?._count._all ?? 0,
    interestedByMe: interestedIds.has(item.id),
  }));
}

campaignEventsRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    const items = await prisma.campaignEvent.findMany({
      where: isStaff ? {} : { isActive: true },
      orderBy: { eventDate: "asc" },
    });
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    res.json({ items: await withInterestInfo(items, citizenId) });
  }),
);

campaignEventsRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const item = await prisma.campaignEvent.findUnique({ where: { id: req.params.id } });
    if (!item) throw new AppError(404, "NOT_FOUND", "Campaign event not found");

    const isStaff = req.user?.ownerType === OwnerType.STAFF;
    if (!isStaff && !item.isActive) throw new AppError(404, "NOT_FOUND", "Campaign event not found");
    const citizenId = req.user?.ownerType === OwnerType.CITIZEN ? req.user.sub : undefined;
    const [withInfo] = await withInterestInfo([item], citizenId);
    res.json(withInfo);
  }),
);

campaignEventsRouter.post(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createCampaignEventSchema.parse(req.body);
    const item = await prisma.campaignEvent.create({ data: { ...input, createdById: req.user!.sub } });
    await notifyAllCitizens(
      `नया अभियान कार्यक्रम: ${item.title}`,
      `${item.location} में ${new Date(item.eventDate).toLocaleString("hi-IN")}`,
      NotificationType.CAMPAIGN_EVENT,
      { relatedCampaignEventId: item.id },
    );
    res.status(201).json(item);
  }),
);

campaignEventsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateCampaignEventSchema.parse(req.body);
    const item = await prisma.campaignEvent.update({ where: { id: req.params.id }, data: input });
    res.json(item);
  }),
);

campaignEventsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.campaignEvent.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

campaignEventsRouter.post(
  "/:id/interest",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user!.ownerType !== OwnerType.CITIZEN) {
      throw new AppError(403, "FORBIDDEN", "Only citizens can register interest");
    }
    const eventId = req.params.id;
    const citizenId = req.user!.sub;
    const existing = await prisma.campaignEventInterest.findUnique({
      where: { eventId_citizenId: { eventId, citizenId } },
    });
    if (existing) {
      await prisma.campaignEventInterest.delete({ where: { id: existing.id } });
    } else {
      await prisma.campaignEventInterest.create({ data: { eventId, citizenId } });
    }
    const interestedCount = await prisma.campaignEventInterest.count({ where: { eventId } });
    res.json({ interested: !existing, interestedCount });
  }),
);
