import { OwnerType } from "@abc/shared";
import { prisma } from "./prisma";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  MLA: "MLA",
  STAFF: "Staff",
};

// Feed data (posts, likes, comments, follows, poll votes) is modeled entirely around
// Citizen — staff have no identity there. Rather than forking the whole feed schema to
// support a second actor type, each staff member gets a lazily-created "shadow" Citizen
// row the first time they touch the feed, pre-verified and labeled with their role, and
// every feed action they take (post/react/comment/follow/vote) is attributed to it.
export async function getOrCreateLinkedCitizenId(staffId: string): Promise<string> {
  const staff = await prisma.staffMember.findUnique({ where: { id: staffId } });
  if (!staff) throw new Error("Staff member not found");
  if (staff.linkedCitizenId) return staff.linkedCitizenId;

  const citizen = await prisma.citizen.create({
    data: {
      name: staff.name,
      phone: `staff:${staff.id}`,
      isVerified: true,
      verifiedLabel: staff.designation || ROLE_LABELS[staff.role] || "Official",
    },
  });
  await prisma.staffMember.update({ where: { id: staff.id }, data: { linkedCitizenId: citizen.id } });
  return citizen.id;
}

export async function resolveActingCitizenId(
  user?: { sub: string; ownerType: string },
): Promise<string | undefined> {
  if (!user) return undefined;
  if (user.ownerType === OwnerType.CITIZEN) return user.sub;
  if (user.ownerType === OwnerType.STAFF) return getOrCreateLinkedCitizenId(user.sub);
  return undefined;
}
