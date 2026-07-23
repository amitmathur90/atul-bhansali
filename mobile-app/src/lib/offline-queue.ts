import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "abc.pendingComplaints";

export interface PendingComplaint {
  id: string;
  fields: Record<string, string>;
  images: { uri: string; name: string; type: string }[];
  createdAt: string;
}

export async function getQueue(): Promise<PendingComplaint[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as PendingComplaint[]) : [];
}

async function saveQueue(queue: PendingComplaint[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueuePendingComplaint(
  item: Pick<PendingComplaint, "fields" | "images">,
): Promise<PendingComplaint> {
  const queue = await getQueue();
  const entry: PendingComplaint = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  await saveQueue(queue);
  return entry;
}

async function removeFromQueue(id: string) {
  const queue = await getQueue();
  await saveQueue(queue.filter((q) => q.id !== id));
}

// Submits queued complaints in submission order, stopping at the first failure so we
// don't reorder or lose track of what's still pending if connectivity drops again mid-flush.
export async function flushQueue(submit: (item: PendingComplaint) => Promise<void>): Promise<number> {
  const queue = await getQueue();
  let flushed = 0;
  for (const item of queue) {
    try {
      await submit(item);
      await removeFromQueue(item.id);
      flushed += 1;
    } catch {
      break;
    }
  }
  return flushed;
}
