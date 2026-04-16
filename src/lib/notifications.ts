export type NotificationItem = {
  id: string;
  kind: "BOOKING" | "REVIEW";
  createdAt: string;
  title: string;
  message: string;
  status: string;
  reason?: string;
};

function readStorage(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function unreadNotifications(userId: string, items: NotificationItem[]): number {
  const key = `notif-read:${userId}`;
  const seen = new Set(readStorage(key));
  return items.reduce((acc, n) => (seen.has(n.id) ? acc : acc + 1), 0);
}

export function markNotificationsRead(userId: string, items: NotificationItem[]) {
  if (typeof window === "undefined") return;
  const key = `notif-read:${userId}`;
  const merged = Array.from(new Set([...readStorage(key), ...items.map((n) => n.id)]));
  localStorage.setItem(key, JSON.stringify(merged));
}
