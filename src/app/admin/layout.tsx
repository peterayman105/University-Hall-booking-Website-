import { AdminNav } from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
