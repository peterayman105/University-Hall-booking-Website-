"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  status: string;
  hall: { id: string; name: string };
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetch("/api/bookings/mine")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">My bookings</h1>
      <div className="space-y-4">
        {bookings.length === 0 && <p className="text-slate-500">No bookings yet.</p>}
        {bookings.map((b) => (
          <div
            key={b.id}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900"
          >
            <div>
              <Link
                href={`/halls/${b.hall.id}`}
                className="font-semibold text-brand-700 hover:underline dark:text-sky-400"
              >
                {b.hall.name}
              </Link>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {b.date} · {b.startHour}:00 – {b.endHour}:00
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                b.status === "CONFIRMED"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  : b.status === "PENDING"
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              }`}
            >
              {b.status === "PENDING"
                ? "Pending approval"
                : b.status === "CONFIRMED"
                  ? "Confirmed"
                  : "Rejected"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
