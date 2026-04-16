"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  status: string;
  hall: { name: string };
  user: { name: string; email: string };
};

export default function AdminWeeklySchedulePage() {
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetch("/api/admin/bookings/weekly")
      .then((r) => r.json())
      .then((d) => {
        setWeekStart(d.weekStart || "");
        setWeekEnd(d.weekEnd || "");
        setBookings(d.bookings || []);
      });
  }, []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Weekly booking schedule</h1>
      <p className="mb-6 text-sm text-slate-500">
        System-wide weekly plan from {weekStart || "..."} to {weekEnd || "..."}.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Hall</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No bookings in this week.
                </td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">{b.date}</td>
                <td className="px-4 py-3">
                  {b.startHour}:00 - {b.endHour}:00
                </td>
                <td className="px-4 py-3">{b.hall.name}</td>
                <td className="px-4 py-3">
                  {b.user.name}
                  <br />
                  <span className="text-xs text-slate-400">{b.user.email}</span>
                </td>
                <td className="px-4 py-3">{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
