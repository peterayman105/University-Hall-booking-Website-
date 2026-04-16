"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type MeUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  photoUrl: string | null;
};

export default function AdminProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<MeUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function readPhotoFile(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read photo"));
      reader.readAsDataURL(file);
    });
    setPhotoUrl(dataUrl);
  }

  useEffect(() => {
    setLoading(true);
    fetch("/api/auth/me")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.user || d.user.role !== "SUPERADMIN") {
          router.replace("/admin/halls");
          return;
        }
        const u = d.user as MeUser;
        setUser(u);
        setName(u.name);
        setEmail(u.email);
        setPhotoUrl(u.photoUrl || "");
      })
      .catch(() => router.replace("/admin/halls"))
      .finally(() => setLoading(false));
  }, [router, pathname]);

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
      <form
        onSubmit={save}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
      >
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
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:px-3 file:py-1.5 file:text-xs dark:text-slate-300 dark:file:border-slate-600 dark:file:bg-slate-800"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void readPhotoFile(file).catch(() => setError("Could not read selected image."));
              e.currentTarget.value = "";
            }}
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
