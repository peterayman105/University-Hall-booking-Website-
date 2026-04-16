type PresenceRole = "CUSTOMER" | "VIEWER";

type PresenceEntry = {
  role: PresenceRole;
  lastSeenMs: number;
};

const STALE_AFTER_MS = 35_000;
const hallsPresence = new Map<string, Map<string, PresenceEntry>>();

function cleanupHall(hallId: string, now: number) {
  const room = hallsPresence.get(hallId);
  if (!room) return;
  room.forEach((entry, sessionKey) => {
    if (now - entry.lastSeenMs > STALE_AFTER_MS) room.delete(sessionKey);
  });
  if (room.size === 0) hallsPresence.delete(hallId);
}

export function upsertViewer(hallId: string, sessionKey: string, role: PresenceRole) {
  const now = Date.now();
  const room = hallsPresence.get(hallId) ?? new Map<string, PresenceEntry>();
  room.set(sessionKey, { role, lastSeenMs: now });
  hallsPresence.set(hallId, room);
  cleanupHall(hallId, now);
}

export function removeViewer(hallId: string, sessionKey: string) {
  const room = hallsPresence.get(hallId);
  if (!room) return;
  room.delete(sessionKey);
  if (room.size === 0) hallsPresence.delete(hallId);
}

export function hallPresenceCounts(hallId: string) {
  const now = Date.now();
  cleanupHall(hallId, now);
  const room = hallsPresence.get(hallId);
  let customers = 0;
  let viewers = 0;
  if (room) {
    room.forEach((entry) => {
      if (entry.role === "CUSTOMER") customers += 1;
      else viewers += 1;
    });
  }
  return { customers, viewers, total: customers + viewers };
}

export function manyHallPresenceCounts(hallIds: string[]) {
  const out: Record<string, { customers: number; viewers: number; total: number }> = {};
  for (const hallId of hallIds) {
    out[hallId] = hallPresenceCounts(hallId);
  }
  return out;
}
