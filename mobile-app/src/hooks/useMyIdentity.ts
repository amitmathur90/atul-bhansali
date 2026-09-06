import { useAuthStore } from "../store/authStore";

// Feed actions (post/react/comment/follow/vote) are always attributed to a Citizen id.
// A citizen session uses their own id directly; a staff session acts through their
// auto-provisioned linked citizen profile (see backend lib/actingCitizen.ts).
export function useMyIdentity() {
  const citizen = useAuthStore((s) => s.citizen);
  const staff = useAuthStore((s) => s.staff);
  return {
    id: citizen?.id ?? staff?.linkedCitizenId ?? null,
    city: citizen?.city ?? null,
    // Reporting content to moderators makes no sense for staff — they already have
    // direct pin/hide/delete/warn powers, so that action is hidden for their sessions.
    isStaff: !citizen && !!staff,
  };
}
