"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  status: string;
  hall: { id: string; name: string; pricePerHour: number };
};

export default function CompletedBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetch("/api/bookings/completed")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []));
  }, []);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Completed bookings</h1>
      <p className="mb-6 text-sm text-slate-500">
        Confirmed bookings whose end time has already passed. You can leave a review for these halls
        once moderation rules are met.
      </p>
      <div className="space-y-4">
        {bookings.length === 0 && (
          <p className="text-slate-500">No completed bookings yet (finished after scheduled end time).</p>
        )}
        {bookings.map((b) => {
          const hours = b.endHour - b.startHour;
          const total = hours * b.hall.pricePerHour;
          return (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <Link
                href={`/halls/${b.hall.id}`}
                className="font-semibold text-brand-700 hover:underline dark:text-sky-400"
              >
                {b.hall.name}
              </Link>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {b.date} · {b.startHour}:00 – {b.endHour}:00 ({hours} h)
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Total paid (estimate): {total.toFixed(0)} EGP ({b.hall.pricePerHour} EGP/h)
              </p>
              <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                Completed
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
