"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CLOSE_HOUR, OPEN_HOUR } from "@/lib/constants";

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
};

export default function HallsBrowsePage() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [presence, setPresence] = useState<
    Record<string, { customers: number; viewers: number; total: number }>
  >({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [maxAllowedPrice, setMaxAllowedPrice] = useState(2000);
  const [minSeats, setMinSeats] = useState(1);
  const [hasProjector, setHasProjector] = useState(false);
  const [hasAC, setHasAC] = useState(false);
  const [seatingFlat, setSeatingFlat] = useState(false);
  const [seatingEscalated, setSeatingEscalated] = useState(false);
  const [freeOnEnabled, setFreeOnEnabled] = useState(false);
  const [freeDate, setFreeDate] = useState("");
  const [freeStartHour, setFreeStartHour] = useState(OPEN_HOUR);
  const [freeEndHour, setFreeEndHour] = useState(OPEN_HOUR + 1);
  const [loading, setLoading] = useState(true);
  const [maxHallsCapacity, setMaxHallsCapacity] = useState(1);

  const todayYmd = useMemo(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const startHourOptions = useMemo(
    () => Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i),
    []
  );
  const endHourOptions = useMemo(() => {
    const opts: number[] = [];
    for (let e = freeStartHour + 1; e <= CLOSE_HOUR; e++) opts.push(e);
    return opts;
  }, [freeStartHour]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("minPrice", String(minPrice));
    params.set("maxPrice", String(maxPrice));
    params.set("minSeats", String(minSeats));
    if (hasProjector) params.set("hasProjector", "true");
    if (hasAC) params.set("hasAC", "true");
    if (seatingFlat) params.set("seatingFlat", "1");
    if (seatingEscalated) params.set("seatingEscalated", "1");
    if (
      freeOnEnabled &&
      freeDate &&
      freeDate >= todayYmd &&
      freeStartHour >= OPEN_HOUR &&
      freeEndHour <= CLOSE_HOUR &&
      freeEndHour > freeStartHour
    ) {
      params.set("freeDate", freeDate);
      params.set("freeStartHour", String(freeStartHour));
      params.set("freeEndHour", String(freeEndHour));
    }
    const res = await fetch(`/api/halls?${params.toString()}`);
    const d = await res.json();
    if (res.ok) {
      setHalls(d.halls);
      if (typeof d.maxPrice === "number" && Number.isFinite(d.maxPrice)) {
        const apiMaxPrice = Math.max(0, Math.ceil(d.maxPrice));
        setMaxAllowedPrice(Math.max(2000, apiMaxPrice));
        setMaxPrice((prev) => {
          if (prev === 2000 || prev < apiMaxPrice) return Math.max(2000, apiMaxPrice);
          return prev;
        });
      }
      let cap = 1;
      if (typeof d.maxCapacity === "number" && Number.isFinite(d.maxCapacity)) {
        cap = Math.max(1, Math.floor(d.maxCapacity));
      } else if (Array.isArray(d.halls) && d.halls.length > 0) {
        cap = Math.max(...d.halls.map((h: Hall) => h.capacity), 1);
      }
      setMaxHallsCapacity(cap);
      setMinSeats((s) => Math.min(Math.max(1, s), cap));
    }
    setLoading(false);
  }, [
    minPrice,
    maxPrice,
    minSeats,
    hasProjector,
    hasAC,
    seatingFlat,
    seatingEscalated,
    freeOnEnabled,
    freeDate,
    freeStartHour,
    freeEndHour,
    todayYmd,
  ]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (halls.length === 0) return;
    let cancelled = false;
    const hallIds = halls.map((h) => h.id).join(",");
    const readPresence = async () => {
      const res = await fetch(`/api/halls/view-presence?hallIds=${encodeURIComponent(hallIds)}`);
      const data = await res.json();
      if (!cancelled && res.ok) setPresence(data.counts || {});
    };
    void readPresence();
    const timer = setInterval(() => void readPresence(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [halls]);

  return (
    <div className="min-w-0">
      {filtersOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setFiltersOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">Filters</h2>
              <button
                type="button"
                className="text-sm text-brand-600 dark:text-sky-400"
                onClick={() => setFiltersOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500">Price range (EGP / hour)</p>
            <div className="flex gap-2">
              <label className="flex-1 text-xs">
                Min
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                />
              </label>
              <label className="flex-1 text-xs">
                Max
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  value={maxPrice}
                  max={maxAllowedPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
                />
              </label>
            </div>
            <label className="mt-4 block text-xs text-slate-600 dark:text-slate-300">
              Minimum seats: <span className="font-semibold">{minSeats}</span>
              <input
                type="range"
                min={1}
                max={maxHallsCapacity}
                step={1}
                className="mt-2 w-full accent-brand-600 dark:accent-sky-500"
                value={Math.min(minSeats, maxHallsCapacity)}
                onChange={(e) => setMinSeats(Number(e.target.value))}
              />
            </label>
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2 dark:text-slate-200">
                <input type="checkbox" checked={hasProjector} onChange={(e) => setHasProjector(e.target.checked)} />
                Has projector
              </label>
              <label className="flex items-center gap-2 dark:text-slate-200">
                <input type="checkbox" checked={hasAC} onChange={(e) => setHasAC(e.target.checked)} />
                Has AC
              </label>
              <label className="flex items-center gap-2 dark:text-slate-200">
                <input type="checkbox" checked={seatingFlat} onChange={(e) => setSeatingFlat(e.target.checked)} />
                Flat seating
              </label>
              <label className="flex items-center gap-2 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={seatingEscalated}
                  onChange={(e) => setSeatingEscalated(e.target.checked)}
                />
                Escalated (tiered) seating
              </label>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                <input
                  type="checkbox"
                  checked={freeOnEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setFreeOnEnabled(on);
                    if (on && !freeDate) setFreeDate(todayYmd);
                  }}
                />
                Free on (date & time)
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Show halls with no pending or confirmed booking overlapping your slot (hourly, {OPEN_HOUR}–
                {CLOSE_HOUR}).
              </p>
              {freeOnEnabled ? (
                <div className="mt-3 space-y-3 text-sm">
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    Date
                    <input
                      type="date"
                      min={todayYmd}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      value={freeDate}
                      onChange={(e) => setFreeDate(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <label className="flex-1 text-xs text-slate-600 dark:text-slate-300">
                      From (hour)
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        value={freeStartHour}
                        onChange={(e) => {
                          const s = Number(e.target.value);
                          setFreeStartHour(s);
                          setFreeEndHour((prev) => (prev <= s ? s + 1 : prev));
                        }}
                      >
                        {startHourOptions.map((h) => (
                          <option key={h} value={h}>
                            {h}:00
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex-1 text-xs text-slate-600 dark:text-slate-300">
                      To (hour)
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        value={freeEndHour}
                        onChange={(e) => setFreeEndHour(Number(e.target.value))}
                      >
                        {endHourOptions.map((h) => (
                          <option key={h} value={h}>
                            {h}:00
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {(!freeDate || freeDate < todayYmd) && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">Pick today or a future date to apply.</p>
                  )}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Available halls</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every great idea needs the right room - pick your space and make it happen.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600"
          onClick={() => setFiltersOpen(true)}
        >
          Open filters
        </button>
      </div>
      <div className="min-w-0">
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : halls.length === 0 ? (
          <p className="text-slate-500">
            {freeOnEnabled && freeDate && freeDate >= todayYmd && freeEndHour > freeStartHour
              ? "No halls match your filters and are free for that date and time."
              : "No halls match your filters."}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {halls.map((h) => (
              <article
                key={h.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="relative aspect-video bg-slate-200 dark:bg-slate-800">
                  {((h.photos && h.photos[0]) || h.photoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={((h.photos && h.photos[0]) || h.photoUrl) || undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{h.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Up to {h.capacity} seats · {h.pricePerHour} EGP/h
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {h.hasProjector ? "Projector" : "No projector"} · {h.hasAC ? "AC" : "No AC"} ·{" "}
                    {h.seatingType === "ESCALATED" ? "Escalated seating" : "Flat seating"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/halls/${h.id}`}
                      className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white dark:bg-sky-600"
                    >
                      View details
                    </Link>
                    <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      Viewing now: {presence[h.id]?.total ?? 0} (Customers {presence[h.id]?.customers ?? 0}
                      , Viewers {presence[h.id]?.viewers ?? 0})
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
