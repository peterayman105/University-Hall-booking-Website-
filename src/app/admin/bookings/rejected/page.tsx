"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  rejectReason?: string | null;
  user: { name: string; email: string };
  hall: { name: string };
};

export default function RejectedBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetch("/api/admin/bookings?status=REJECTED")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Rejected bookings</h1>
      <div className="space-y-3">
        {bookings.length === 0 && <p className="text-slate-500">No rejected bookings.</p>}
        {bookings.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="font-medium text-slate-900 dark:text-white">{b.hall.name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {b.user.name} · {b.date} · {b.startHour}:00–{b.endHour}:00
            </p>
            <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-800 dark:bg-indigo-950/30">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                Rejection reason
              </p>
              <p className="mt-1 text-sm text-indigo-900 dark:text-indigo-100">
                {b.rejectReason?.trim() || "No reason provided."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
