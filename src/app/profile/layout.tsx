import { CustomerNav } from "@/components/CustomerNav";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <CustomerNav />
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
