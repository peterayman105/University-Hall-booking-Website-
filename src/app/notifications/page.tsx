"use client";

import { useEffect, useState } from "react";
import {
  type NotificationItem,
  markNotificationsRead,
  unreadNotifications,
} from "@/lib/notifications";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [userId, setUserId] = useState("");
  const [unread, setUnread] = useState(0);
  const [reasonFor, setReasonFor] = useState<NotificationItem | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/auth/me"), fetch("/api/notifications")])
      .then(async ([meRes, notifRes]) => {
        const me = await meRes.json();
        const notif = await notifRes.json();
        if (!active) return;
        const uid = me.user?.id || "";
        const notifications = (notif.notifications || []) as NotificationItem[];
        setUserId(uid);
        setItems(notifications);
        if (uid) {
          setUnread(unreadNotifications(uid, notifications));
          markNotificationsRead(uid, notifications);
          setUnread(0);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-500">Stay updated on your booking and review status.</p>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold dark:bg-slate-700">
          {unread} unread
        </span>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-slate-500">No notifications yet.</p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">{item.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.status === "CONFIRMED" || item.status === "APPROVED"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      : item.status === "PENDING"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                  }`}
                >
                  {item.status}
                </span>
                <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
              {item.status === "REJECTED" ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setReasonFor(item)}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                  >
                    View rejection reason
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
      {userId ? null : <p className="mt-4 text-xs text-slate-400">Sign in to sync notification read state.</p>}

      {reasonFor ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setReasonFor(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Rejection reason</h2>
            <p className="mt-1 text-xs text-slate-500">{new Date(reasonFor.createdAt).toLocaleString()}</p>
            <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-700 dark:bg-indigo-950/30">
              <p className="text-sm leading-relaxed text-indigo-900 dark:text-indigo-100">
                {reasonFor.reason?.trim() || "No rejection reason was provided by admin."}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setReasonFor(null)}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white dark:bg-sky-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
