"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  photoUrl: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.user || d.user.role !== "CUSTOMER") {
          router.replace("/halls");
          return;
        }
        const u = d.user as MeUser;
        setUser(u);
        setName(u.name);
        setEmail(u.email);
        setPhotoUrl(u.photoUrl || "");
      })
      .catch(() => router.replace("/halls"))
      .finally(() => setLoading(false));
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          photoUrl: photoUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      const u = data.user as MeUser;
      setUser(u);
      setName(u.name);
      setEmail(u.email);
      setPhotoUrl(u.photoUrl || "");
      setSaved("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Your profile</h1>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        {user.photoUrl ? (
          <div className="flex justify-center">
            <img
              src={user.photoUrl}
              alt=""
              className="h-24 w-24 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600"
            />
          </div>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-slate-500">Name</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Email</label>
          <input
            required
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Profile photo URL (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {saved ? <p className="text-sm text-green-600">{saved}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
