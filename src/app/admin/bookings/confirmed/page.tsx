"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  user: { name: string; email: string };
  hall: { name: string };
};

export default function ConfirmedBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetch("/api/admin/bookings?status=CONFIRMED")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []));
  }, []);

  const byDate = [...bookings].sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Confirmed schedule</h1>
      <p className="mb-6 text-sm text-slate-500">Approved bookings in chronological order.</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Hall</th>
              <th className="px-4 py-3 font-medium">User</th>
            </tr>
          </thead>
          <tbody>
            {byDate.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No confirmed bookings.
                </td>
              </tr>
            )}
            {byDate.map((b) => (
              <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">{b.date}</td>
                <td className="px-4 py-3">
                  {b.startHour}:00 – {b.endHour}:00
                </td>
                <td className="px-4 py-3 font-medium">{b.hall.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {b.user.name}
                  <br />
                  <span className="text-xs text-slate-400">{b.user.email}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
