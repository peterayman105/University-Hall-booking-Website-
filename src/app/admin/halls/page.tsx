"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Hall = {
  id: string;
  name: string;
  capacity: number;
  hasProjector: boolean;
  hasAC: boolean;
  seatingType: string;
  pricePerHour: number;
  photoUrl: string | null;
  photos: string[];
  extras?: string | null;
};

const empty: Hall = {
  id: "",
  name: "",
  capacity: 30,
  hasProjector: true,
  hasAC: true,
  seatingType: "FLAT",
  pricePerHour: 0,
  photoUrl: "",
  photos: [],
  extras: null,
};

export default function AdminHallsPage() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [editing, setEditing] = useState<Hall | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hallToDelete, setHallToDelete] = useState<string | null>(null);
  const [photoInput, setPhotoInput] = useState("");

  const normalizeHall = useCallback((raw: unknown): Hall => {
    const h = raw as Partial<Hall>;
    const photos =
      Array.isArray(h.photos) && h.photos.length > 0
        ? h.photos.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        : h.photoUrl
          ? [h.photoUrl]
          : [];
    return {
      id: String(h.id || ""),
      name: String(h.name || ""),
      capacity: Number(h.capacity || 0),
      hasProjector: Boolean(h.hasProjector),
      hasAC: Boolean(h.hasAC),
      seatingType: String(h.seatingType || "FLAT"),
      pricePerHour: Number(h.pricePerHour || 0),
      photoUrl: photos[0] || null,
      photos,
      extras: typeof h.extras === "string" ? h.extras : null,
    };
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/halls");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setHalls((data.halls || []).map((x: unknown) => normalizeHall(x)));
  }, [normalizeHall]);

  useEffect(() => {
    load()
      .catch(() => setError("Failed to load halls"))
      .finally(() => setLoading(false));
  }, [load]);

  async function save(h: Hall) {
    setError("");
    try {
      if (h.id) {
        const res = await fetch(`/api/halls/${h.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: h.name,
            capacity: h.capacity,
            hasProjector: h.hasProjector,
            hasAC: h.hasAC,
            seatingType: h.seatingType,
            pricePerHour: Number(h.pricePerHour || 0),
            photos: h.photos,
            extras: h.extras || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
      } else {
        const res = await fetch("/api/halls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: h.name,
            capacity: h.capacity,
            hasProjector: h.hasProjector,
            hasAC: h.hasAC,
            seatingType: h.seatingType,
            pricePerHour: Number(h.pricePerHour || 0),
            photos: h.photos,
            extras: h.extras || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
      }
      setEditing(null);
      setCreating(false);
      setPhotoInput("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function remove(id: string) {
    setError("");
    const res = await fetch(`/api/halls/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Delete failed");
      return;
    }
    await load();
  }

  const form = (h: Hall, onChange: (x: Hall) => void) => (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
      <input
        className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        placeholder="Hall name"
        value={h.name}
        onChange={(e) => onChange({ ...h, name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500">
          Capacity
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            value={h.capacity}
            onChange={(e) => onChange({ ...h, capacity: Number(e.target.value) })}
          />
        </label>
        <label className="text-xs text-slate-500">
          Price / hour (EGP, optional; can be 0)
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            value={h.pricePerHour}
            onChange={(e) => onChange({ ...h, pricePerHour: Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="text-xs text-slate-500">
        Notes / extras (optional)
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          rows={2}
          value={h.extras || ""}
          onChange={(e) => onChange({ ...h, extras: e.target.value })}
          placeholder="Any extra features or notes for customers"
        />
      </label>
      <label className="flex items-center gap-2 text-sm dark:text-slate-200">
        <input
          type="checkbox"
          checked={h.hasProjector}
          onChange={(e) => onChange({ ...h, hasProjector: e.target.checked })}
        />
        Projector
      </label>
      <label className="flex items-center gap-2 text-sm dark:text-slate-200">
        <input
          type="checkbox"
          checked={h.hasAC}
          onChange={(e) => onChange({ ...h, hasAC: e.target.checked })}
        />
        Air conditioning
      </label>
      <label className="text-xs text-slate-500">
        Seating
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          value={h.seatingType}
          onChange={(e) => onChange({ ...h, seatingType: e.target.value })}
        >
          <option value="FLAT">Flat</option>
          <option value="ESCALATED">Escalated (tiered)</option>
        </select>
      </label>
      <div className="space-y-2">
        <label className="text-xs text-slate-500">
          Add photo URL
          <div className="mt-1 flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              value={photoInput}
              onChange={(e) => setPhotoInput(e.target.value)}
              placeholder="https://…"
            />
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600"
              onClick={() => {
                const next = photoInput.trim();
                if (!next) return;
                if (!h.photos.includes(next)) {
                  const merged = [...h.photos, next];
                  onChange({ ...h, photos: merged, photoUrl: merged[0] || null });
                }
                setPhotoInput("");
              }}
            >
              Add
            </button>
          </div>
        </label>
        <label className="text-xs text-slate-500">
          Or upload local photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:px-3 file:py-1.5 file:text-xs dark:text-slate-300 dark:file:border-slate-600 dark:file:bg-slate-800"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;
              Promise.all(
                files.map(
                  (file) =>
                    new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result || ""));
                      reader.onerror = () => reject(new Error("Could not read file"));
                      reader.readAsDataURL(file);
                    })
                )
              )
                .then((urls) => {
                  const merged = [...h.photos];
                  urls.forEach((url) => {
                    if (url && !merged.includes(url)) merged.push(url);
                  });
                  onChange({ ...h, photos: merged, photoUrl: merged[0] || null });
                })
                .catch(() => setError("Could not read one of the selected files."));
              e.currentTarget.value = "";
            }}
          />
        </label>
        {h.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {h.photos.map((p, i) => (
              <div
                key={`${p}-${i}`}
                className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <img src={p} alt="" className="h-20 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    const nextPhotos = h.photos.filter((_, idx) => idx !== i);
                    onChange({ ...h, photos: nextPhotos, photoUrl: nextPhotos[0] || null });
                  }}
                  className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No photos added yet.</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save(h)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white dark:bg-sky-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setCreating(false);
            setPhotoInput("");
          }}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm dark:border-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit halls</h1>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing({ ...empty, id: "" });
            setPhotoInput("");
          }}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white dark:bg-sky-600"
        >
          Add hall
        </button>
      </div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-200">
          {error}
        </p>
      )}
      {creating && editing && form(editing, setEditing)}
      <ConfirmDialog
        open={Boolean(hallToDelete)}
        title="Delete hall"
        message="Delete this hall? This is only allowed when there are no pending or confirmed bookings."
        confirmLabel="Delete"
        danger
        onCancel={() => setHallToDelete(null)}
        onConfirm={async () => {
          if (!hallToDelete) return;
          await remove(hallToDelete);
          setHallToDelete(null);
        }}
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {halls.map((hall) => (
          <div
            key={hall.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="relative aspect-video bg-slate-200 dark:bg-slate-800">
              {hall.photos[0] || hall.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hall.photos[0] || hall.photoUrl || ""} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="font-semibold text-slate-900 dark:text-white">{hall.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {hall.capacity} seats · {hall.pricePerHour} EGP/h ·{" "}
                {hall.hasProjector ? "Projector" : "No projector"} · {hall.hasAC ? "AC" : "No AC"} ·{" "}
                {hall.seatingType === "ESCALATED" ? "Escalated" : "Flat"}
              </p>
              {hall.extras ? <p className="mt-1 text-xs text-slate-500">Extras: {hall.extras}</p> : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setEditing({ ...hall });
                    setPhotoInput("");
                  }}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setHallToDelete(hall.id)}
                  className="rounded-lg text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
              {editing?.id === hall.id && !creating && form(editing, setEditing)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
