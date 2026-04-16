"use client";

import { PASSWORD_RULES_TEXT, validatePassword } from "@/lib/password-validation";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signupPhotoUrl, setSignupPhotoUrl] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "SUPERADMIN">("CUSTOMER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function readPhotoFile(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read photo"));
      reader.readAsDataURL(file);
    });
    setSignupPhotoUrl(dataUrl);
  }

  async function parseAuthJson(res: Response) {
    const text = await res.text();
    const trimmed = text.trim();
    if (!trimmed || trimmed[0] !== "{") {
      throw new Error(
        res.ok
          ? "Server returned a non-JSON response. If you just changed the database schema, run: npx prisma migrate dev"
          : `Request failed (${res.status}). Check the terminal running the dev server.`
      );
    }
    try {
      return JSON.parse(trimmed) as { error?: string; user?: { role: string } };
    } catch {
      throw new Error("Server returned invalid JSON. Check the terminal running the dev server.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "signup") {
      const pwErr = validatePassword(password);
      if (pwErr) {
        setError(pwErr);
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await parseAuthJson(res);
        if (!res.ok) throw new Error(data.error || "Login failed");
        if (data.user.role === "SUPERADMIN") router.push("/admin/halls");
        else router.push("/halls");
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name,
            role,
            photoUrl: signupPhotoUrl.trim() ? signupPhotoUrl.trim() : null,
          }),
        });
        const data = await parseAuthJson(res);
        if (!res.ok) throw new Error(data.error || "Signup failed");
        if (data.user.role === "SUPERADMIN") router.push("/admin/halls");
        else router.push("/halls");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function continueAsViewer() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/viewer", { method: "POST" });
      const data = await parseAuthJson(res);
      if (!res.ok) throw new Error(data.error || "Viewer login failed");
      router.push("/halls");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 lg:flex-row lg:items-center lg:gap-16">
        <div className="mb-12 lg:mb-0 lg:max-w-md">
          <p className="text-sm font-medium uppercase tracking-widest text-sky-300/90">
            Helwan National University 
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Find Your Spot</h1>
          <p className="mt-4 text-lg text-slate-300">
            AUTOMATED HOURLY COLLEGE HALLS BOOKING. 
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 flex rounded-xl bg-slate-800/80 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                mode === "signin" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                mode === "signup" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-400">Full name</label>
                  <input
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400">Account type</label>
                  <div className="mt-2 flex gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        checked={role === "CUSTOMER"}
                        onChange={() => setRole("CUSTOMER")}
                      />
                      Customer
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        checked={role === "SUPERADMIN"}
                        onChange={() => setRole("SUPERADMIN")}
                      />
                      Super admin
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Only the first super admin can self-register; use seeded admin for demos.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400">
                    Profile photo URL <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={signupPhotoUrl}
                    onChange={(e) => setSignupPhotoUrl(e.target.value)}
                    placeholder="https://…"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-2 block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border file:border-white/15 file:bg-slate-800/70 file:px-3 file:py-1.5 file:text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void readPhotoFile(file).catch(() => setError("Could not read selected image."));
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-400">Email</label>
              <input
                required
                type="email"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">Password</label>
              <input
                required
                type="password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {mode === "signup" && (
                <p className="mt-1 text-xs text-slate-500">{PASSWORD_RULES_TEXT}</p>
              )}
            </div>
            {error && (
              <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => void continueAsViewer()}
                disabled={loading}
                className="w-full rounded-xl border border-slate-500/70 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-300 disabled:opacity-50"
              >
                Continue as Viewer
              </button>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
