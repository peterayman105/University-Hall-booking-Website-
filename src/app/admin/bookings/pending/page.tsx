"use client";

import { useCallback, useEffect, useState } from "react";

type Booking = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  status: string;
  user: { name: string; email: string };
  hall: { name: string };
};

export default function PendingBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/bookings?status=PENDING");
    const d = await res.json();
    if (res.ok) setBookings(d.bookings);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "confirm" | "reject", rejectReason?: string) {
    setError("");
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: rejectReason }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Action failed");
      return false;
    }
    await load();
    return true;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Pending booking requests</h1>
      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <div className="space-y-4">
        {bookings.length === 0 && <p className="text-slate-500">No pending requests.</p>}
        {bookings.map((b) => (
          <div
            key={b.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900"
          >
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{b.hall.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {b.user.name} · {b.user.email}
              </p>
              <p className="text-sm text-slate-500">
                {b.date} · {b.startHour}:00 – {b.endHour}:00 ({b.endHour - b.startHour}h)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => act(b.id, "confirm")}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectingId((prev) => (prev === b.id ? null : b.id));
                  setReason("");
                }}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Reject
              </button>
            </div>
            {rejectingId === b.id ? (
              <div className="w-full rounded-xl border border-red-200 bg-red-50/70 p-3 dark:border-red-900 dark:bg-red-950/20">
                <label className="block text-xs font-medium text-red-800 dark:text-red-300">
                  Rejection reason (shown only to this customer)
                </label>
                <textarea
                  className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none ring-brand-300 focus:ring-2 dark:border-red-800 dark:bg-slate-900 dark:text-white"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this booking was rejected..."
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(null);
                      setReason("");
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await act(b.id, "reject", reason);
                      if (ok) {
                        setRejectingId(null);
                        setReason("");
                      }
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                  >
                    Send reject reason
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
