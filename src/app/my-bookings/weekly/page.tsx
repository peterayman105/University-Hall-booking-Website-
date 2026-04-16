"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  status: string;
  hall: { name: string };
};

export default function MyWeeklyBookingsPage() {
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetch("/api/bookings/weekly")
      .then((r) => r.json())
      .then((d) => {
        setWeekStart(d.weekStart || "");
        setWeekEnd(d.weekEnd || "");
        setBookings(d.bookings || []);
      });
  }, []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">My weekly schedule</h1>
      <p className="mb-6 text-sm text-slate-500">
        {weekStart && weekEnd ? `${weekStart} to ${weekEnd}` : "This week"}
      </p>
      {bookings.length === 0 ? (
        <p className="text-slate-500">No bookings this week.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80">
              <tr>
                <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Date</th>
                <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Time</th>
                <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Hall</th>
                <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 text-slate-900 dark:text-white">{b.date}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {b.startHour}:00 – {b.endHour}:00
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{b.hall.name}</td>
                  <td
                    className={`px-3 py-2 ${
                      b.status === "CONFIRMED"
                        ? "text-green-600"
                        : b.status === "PENDING"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {b.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
