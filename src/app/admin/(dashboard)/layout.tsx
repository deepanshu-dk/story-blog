import type { ReactNode } from "react";
import { AdminNav } from "./AdminNav";

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AdminNav />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
