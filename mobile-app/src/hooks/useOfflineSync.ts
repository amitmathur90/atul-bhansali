import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { apiClient } from "../lib/api-client";
import { flushQueue, type PendingComplaint } from "../lib/offline-queue";

async function submitPendingComplaint(item: PendingComplaint) {
  const form = new FormData();
  Object.entries(item.fields).forEach(([key, value]) => form.append(key, value));
  item.images.forEach((img) => form.append("images", img as unknown as Blob));
  await apiClient.post("/complaints", form);
}

// Flushes any complaints queued while offline as soon as connectivity comes back.
export function useOfflineSync() {
  const queryClient = useQueryClient();
  const flushing = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected || flushing.current) return;
      flushing.current = true;
      flushQueue(submitPendingComplaint)
        .then((count) => {
          if (count > 0) {
            queryClient.invalidateQueries({ queryKey: ["my-complaints"] });
            queryClient.invalidateQueries({ queryKey: ["citizen-dashboard"] });
          }
        })
        .finally(() => {
          flushing.current = false;
        });
    });
    return unsubscribe;
  }, [queryClient]);
}
