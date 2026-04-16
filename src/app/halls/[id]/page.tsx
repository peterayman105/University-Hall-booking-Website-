"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Hall = {
  id: string;
  name: string;
  capacity: number;
  hasProjector: boolean;
  hasAC: boolean;
  seatingType: string;
  pricePerHour: number;
  photoUrl: string | null;
  photos?: string[];
  extras?: string | null;
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: { name: string };
};

type TimeRange = { startHour: number; endHour: number };

export default function HallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [hall, setHall] = useState<Hall | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [date, setDate] = useState("");
  const [ranges, setRanges] = useState<TimeRange[]>([]);
  const [hourlyRanges, setHourlyRanges] = useState<TimeRange[]>([]);
  const [apiPricePerHour, setApiPricePerHour] = useState<number | null>(null);
  const [startHour, setStartHour] = useState<number | "">("");
  const [endHour, setEndHour] = useState<number | "">("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [role, setRole] = useState<string>("CUSTOMER");
  const [presence, setPresence] = useState({ customers: 0, viewers: 0, total: 0 });

  const [rRating, setRRating] = useState(5);
  const [rComment, setRComment] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/halls/${id}`);
    const d = await res.json();
    if (!res.ok) {
      router.push("/halls");
      return;
    }
    setHall(d.hall);
    setReviews(d.reviews);
    setCanReview(d.canReview);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role) setRole(d.user.role);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let mounted = true;
    const pulse = async (action: "enter" | "heartbeat" | "leave") => {
      const res = await fetch(`/api/halls/${id}/view-presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        keepalive: action === "leave",
      });
      const data = await res.json();
      if (mounted && res.ok) setPresence(data);
    };

    void pulse("enter");
    const timer = setInterval(() => void pulse("heartbeat"), 10_000);
    const beforeUnload = () => void pulse("leave");
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener("beforeunload", beforeUnload);
      void pulse("leave");
    };
  }, [id]);

  async function fetchRanges() {
    if (!date) return;
    setLoadingSlots(true);
    setRanges([]);
    setHourlyRanges([]);
    setStartHour("");
    setEndHour("");
    const res = await fetch(`/api/halls/${id}/availability?date=${encodeURIComponent(date)}`);
    const d = await res.json();
    setLoadingSlots(false);
    if (res.ok) {
      setRanges(d.ranges || []);
      setHourlyRanges(d.hourlyRanges || []);
      setApiPricePerHour(d.pricePerHour ?? null);
    }
  }

  useEffect(() => {
    if (date) void fetchRanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, id]);

  const pricePerHour = apiPricePerHour ?? hall?.pricePerHour ?? 0;

  const uniqueStarts = useMemo(() => {
    const s = new Set<number>();
    ranges.forEach((r) => s.add(r.startHour));
    return Array.from(s).sort((a, b) => a - b);
  }, [ranges]);

  const endOptions = useMemo(() => {
    if (startHour === "") return [];
    return ranges
      .filter((r) => r.startHour === startHour)
      .map((r) => r.endHour)
      .sort((a, b) => a - b);
  }, [ranges, startHour]);

  const hoursSelected =
    startHour !== "" && endHour !== "" && endHour > startHour ? endHour - startHour : 0;
  const totalPrice = hoursSelected * pricePerHour;

  async function confirmBooking() {
    if (date === "" || startHour === "" || endHour === "") {
      setMsg("Choose date, start time, and end time.");
      return;
    }
    setMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hallId: id,
          date,
          startHour,
          endHour,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error || "Booking failed");
        return;
      }
      setMsg("Request submitted — pending admin approval. The slot is held until then.");
      setBookOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hallId: id, rating: rRating, comment: rComment }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMsg(d.error || "Could not submit review");
      return;
    }
    setRComment("");
    setMsg("Review submitted for moderation.");
  }

  if (!hall) return <p className="text-slate-500">Loading…</p>;

  const today = new Date().toISOString().slice(0, 10);
  const photos = Array.isArray(hall.photos) && hall.photos.length > 0 ? hall.photos : hall.photoUrl ? [hall.photoUrl] : [];
  const safeIndex = photos.length === 0 ? 0 : Math.min(photoIndex, photos.length - 1);
  const primaryPhoto = photos.length > 0 ? photos[safeIndex] : null;

  function prevPhoto() {
    if (photos.length === 0) return;
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function nextPhoto() {
    if (photos.length === 0) return;
    setPhotoIndex((i) => (i + 1) % photos.length);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    setTouchEndX(null);
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    setTouchEndX(e.touches[0].clientX);
  }

  function handleTouchEnd() {
    if (touchStartX === null || touchEndX === null) return;
    const delta = touchStartX - touchEndX;
    const threshold = 40; // px
    if (delta > threshold) {
      nextPhoto();
    } else if (delta < -threshold) {
      prevPhoto();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  }

  return (
    <div>
      <Link href="/halls" className="text-sm text-brand-600 hover:underline dark:text-sky-400">
        ← All halls
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div
            className="relative aspect-video bg-slate-200 dark:bg-slate-800"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {primaryPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
            ) : null}
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                  aria-label="Next photo"
                >
                  ›
                </button>
                <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {photos.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${i === safeIndex ? "bg-white" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{hall.name}</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Capacity {hall.capacity} · {hall.pricePerHour} EGP per hour
            </p>
            <ul className="mt-4 list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
              <li>{hall.hasProjector ? "Projector available" : "No projector"}</li>
              <li>{hall.hasAC ? "Air conditioned" : "No AC"}</li>
              <li>{hall.seatingType === "ESCALATED" ? "Escalated seating" : "Flat seating"}</li>
            </ul>
            {hall.extras ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                <p className="font-semibold text-slate-900 dark:text-white">Extras</p>
                <p className="mt-1">{hall.extras}</p>
              </div>
            ) : null}
            {photos.length > 1 ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-slate-500">More photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(1).map((photo, idx) => (
                    <a
                      key={`${photo}-${idx}`}
                      href={photo}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <img src={photo} alt="" className="h-16 w-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {role === "CUSTOMER" ? (
              <button
                type="button"
                onClick={() => {
                  setBookOpen(true);
                  setDate("");
                  setRanges([]);
                  setStartHour("");
                  setEndHour("");
                  setMsg("");
                }}
                className="mt-6 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white dark:bg-sky-600 lg:w-auto lg:px-8"
              >
                Book hall
              </button>
            ) : null}
            <p className="mt-4 text-xs text-slate-500">
              Viewing now: {presence.total} (Customers {presence.customers}, Viewers {presence.viewers})
            </p>
          </div>
        </div>

        <div>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live availability</h2>
            <p className="mt-1 text-xs text-slate-500">Check free ranges without creating a booking.</p>
            <label className="mt-3 block text-sm text-slate-600 dark:text-slate-300">
              Date
              <input
                type="date"
                min={today}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartHour("");
                  setEndHour("");
                }}
              />
            </label>
            {date && (
              <button
                type="button"
                onClick={() => void fetchRanges()}
                className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600"
              >
                Refresh availability
              </button>
            )}
            {loadingSlots ? (
              <p className="mt-3 text-sm text-slate-500">Loading hourly slots…</p>
            ) : date ? (
              hourlyRanges.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2 text-sm text-slate-700 dark:text-slate-200">
                  {hourlyRanges.map((r) => (
                    <li
                      key={`${r.startHour}-${r.endHour}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-600 dark:bg-slate-800/80"
                    >
                      {r.startHour}:00 – {r.endHour}:00
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No free hourly slots on this date.</p>
              )
            ) : null}
          </div>

          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No approved reviews yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="text-amber-600">{"★".repeat(r.rating)}</p>
                  <p className="mt-1 text-slate-700 dark:text-slate-200">{r.comment}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {r.user.name} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {canReview ? (
            <form onSubmit={submitReview} className="mt-6 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Leave a review</p>
              <label className="block text-xs text-slate-500">
                Rating
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  value={rRating}
                  onChange={(e) => setRRating(Number(e.target.value))}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} stars
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                rows={3}
                placeholder="Your experience…"
                value={rComment}
                onChange={(e) => setRComment(e.target.value)}
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white dark:bg-slate-200 dark:text-slate-900"
              >
                Submit for approval
              </button>
            </form>
          ) : null}
          {msg && <p className="mt-4 text-sm text-green-700 dark:text-green-400">{msg}</p>}
        </div>
      </div>

      {role === "CUSTOMER" && bookOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Book hall"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Book {hall.name}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Pick the date, then start and end hour. Confirm only when the total looks right. Pending
              requests still block overlaps.
            </p>
            <label className="mt-4 block text-sm text-slate-600 dark:text-slate-300">
              Date
              <input
                type="date"
                min={today}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartHour("");
                  setEndHour("");
                }}
              />
            </label>

            {!date ? (
              <p className="mt-4 text-sm text-slate-500">Choose a date to see available times.</p>
            ) : loadingSlots ? (
              <p className="mt-4 text-sm text-slate-500">Loading available ranges…</p>
            ) : ranges.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No free time ranges for this day.</p>
            ) : (
              <>
                <label className="mt-4 block text-sm text-slate-600 dark:text-slate-300">
                  Start time
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    value={startHour === "" ? "" : String(startHour)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartHour(v === "" ? "" : Number(v));
                      setEndHour("");
                    }}
                  >
                    <option value="">Select start</option>
                    {uniqueStarts.map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-4 block text-sm text-slate-600 dark:text-slate-300">
                  End time
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    value={endHour === "" ? "" : String(endHour)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEndHour(v === "" ? "" : Number(v));
                    }}
                    disabled={startHour === ""}
                  >
                    <option value="">Select end</option>
                    {endOptions.map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </label>

                {hoursSelected > 0 && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/60">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      Duration: <strong>{hoursSelected}</strong> hour{hoursSelected !== 1 ? "s" : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                      Rate: {pricePerHour} EGP/h
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      Estimated total: {totalPrice.toFixed(0)} EGP
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={submitting || startHour === "" || endHour === ""}
                  onClick={() => void confirmBooking()}
                  className="mt-6 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-sky-600"
                >
                  {submitting ? "Submitting…" : "Confirm booking request"}
                </button>
              </>
            )}

            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-slate-300 py-2 text-sm dark:border-slate-600"
              onClick={() => setBookOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
