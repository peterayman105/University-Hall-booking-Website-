"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/admin/halls", label: "Edit halls" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/bookings/pending", label: "Pending requests" },
  { href: "/admin/bookings/confirmed", label: "Confirmed" },
  { href: "/admin/bookings/rejected", label: "Rejected" },
  { href: "/admin/schedule", label: "Weekly schedule" },
  { href: "/admin/reviews", label: "Reviews pending" },
] as const;

type MenuCounts = {
  users: number;
  pendingBookings: number;
  confirmedBookings: number;
  rejectedBookings: number;
  pendingReviews: number;
};

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("Admin");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [counts, setCounts] = useState<MenuCounts | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.user?.name) {
          setDisplayName(data.user.name);
          setPhotoUrl(
            typeof data.user.photoUrl === "string" && data.user.photoUrl.trim()
              ? data.user.photoUrl.trim()
              : null
          );
        }
      })
      .catch(() => undefined);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/admin/menu-counts")
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setCounts(data);
      })
      .catch(() => undefined);
  }, []);

  function badgeFor(href: string): number | null {
    if (!counts) return null;
    if (href === "/admin/users") return counts.users;
    if (href === "/admin/bookings/pending") return counts.pendingBookings;
    if (href === "/admin/bookings/confirmed") return counts.confirmedBookings;
    if (href === "/admin/bookings/rejected") return counts.rejectedBookings;
    if (href === "/admin/reviews") return counts.pendingReviews;
    return null;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
        <Link
          href="/admin/profile"
          className="mr-4 flex items-center gap-2 font-bold text-brand-700 dark:text-sky-400"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-brand-200 dark:ring-sky-800"
            />
          ) : null}
          <span>{displayName} · Admin</span>
        </Link>
        <nav className="flex flex-wrap gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "bg-brand-600 text-white dark:bg-sky-600"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {l.label}
              {badgeFor(l.href) !== null ? (
                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                  {badgeFor(l.href)}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => logout()}
          className="ml-auto text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
