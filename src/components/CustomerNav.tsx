"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type NotificationItem, unreadNotifications } from "@/lib/notifications";

export function CustomerNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("Welcome");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        const data = await res.json();
        if (!(res.ok && data.user?.name && data.user?.id)) return;
        setDisplayName(data.user.name);
        setPhotoUrl(
          typeof data.user.photoUrl === "string" && data.user.photoUrl.trim()
            ? data.user.photoUrl.trim()
            : null
        );
        setRole(data.user.role || "CUSTOMER");
        const userId = data.user.id as string;
        if (data.user.role === "VIEWER") return;

        fetch("/api/notifications")
          .then(async (nRes) => {
            const nData = await nRes.json();
            if (!nRes.ok) return;
            const notifications = (nData.notifications || []) as NotificationItem[];
            setUnreadCount(unreadNotifications(userId, notifications));
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link
          href={role === "CUSTOMER" ? "/profile" : "/halls"}
          className="flex items-center gap-2 font-bold text-brand-700 dark:text-sky-400"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-brand-200 dark:ring-sky-800"
            />
          ) : null}
          <span>{displayName}</span>
        </Link>
        <nav className="flex gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/halls" className="hover:text-brand-600 dark:hover:text-sky-400">
            Halls
          </Link>
          {role === "CUSTOMER" ? (
            <>
              <Link href="/my-bookings" className="hover:text-brand-600 dark:hover:text-sky-400">
                My bookings
              </Link>
              <Link href="/my-bookings/weekly" className="hover:text-brand-600 dark:hover:text-sky-400">
                Weekly schedule
              </Link>
              <Link href="/completed-bookings" className="hover:text-brand-600 dark:hover:text-sky-400">
                Completed bookings
              </Link>
              <Link href="/notifications" className="hover:text-brand-600 dark:hover:text-sky-400">
                Notifications
                {unreadCount > 0 ? (
                  <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
            </>
          ) : null}
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
