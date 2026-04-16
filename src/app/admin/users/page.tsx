"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Booking = {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  status: string;
  hall: { name: string; id: string };
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  photoUrl: string | null;
  createdAt: string;
  bookings: Booking[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [superAdminTotal, setSuperAdminTotal] = useState(0);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("CUSTOMER");
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    const listRes = await fetch("/api/admin/users");
    const d = await listRes.json();
    if (!listRes.ok) throw new Error(d.error || "Failed");
    setUsers(d.users as UserRow[]);
    setSuperAdminTotal(typeof d.superAdminTotal === "number" ? d.superAdminTotal : 0);
  }, []);

  useEffect(() => {
    load().catch(() => setError("Failed to load users"));
  }, [load]);

  function openEdit(u: UserRow) {
    setEditing(u);
    setEditRole(u.role);
  }

  async function saveRole() {
    if (!editing) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      const updated = data.user as UserRow;
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function remove(u: UserRow) {
    setError("");
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Delete failed");
      return;
    }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    setUserToDelete(null);
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80">
            <tr>
              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Photo</th>
              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Name</th>
              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Email</th>
              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Role</th>
              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Joined</th>
              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Bookings</th>
              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2">
                  {u.photoUrl ? (
                    <img
                      src={u.photoUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-600"
                    />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{u.name}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{u.email}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-600">{u.bookings.length}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="text-brand-600 hover:underline dark:text-sky-400"
                    >
                      Change role
                    </button>
                    <button
                      type="button"
                      disabled={u.role === "SUPERADMIN" && superAdminTotal <= 1}
                      onClick={() => setUserToDelete(u)}
                      className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Change role</h2>
            <p className="mt-1 text-xs text-slate-500">Name, email, and photo can only be changed by each user on their profile.</p>
            <div className="mt-4 flex flex-col items-center gap-2">
              {editing.photoUrl ? (
                <img
                  src={editing.photoUrl}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600"
                />
              ) : null}
              <p className="text-center font-medium text-slate-900 dark:text-white">{editing.name}</p>
              <p className="text-center text-sm text-slate-600 dark:text-slate-300">{editing.email}</p>
            </div>
            <label className="mt-6 block text-xs text-slate-500">
              Role
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              >
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
              </select>
            </label>
            <h3 className="mt-6 text-sm font-medium text-slate-700 dark:text-slate-300">Bookings</h3>
            {editing.bookings.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">None</p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-600 dark:text-slate-300">
                {editing.bookings.map((b) => (
                  <li key={b.id}>
                    {b.hall.name} · {b.date} {b.startHour}:00–{b.endHour}:00 · {b.status}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveRole()}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white dark:bg-sky-600"
              >
                Save role
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Delete user"
        message={
          userToDelete
            ? `Remove ${userToDelete.name} (${userToDelete.email})? Their bookings will be removed.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => userToDelete && void remove(userToDelete)}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
