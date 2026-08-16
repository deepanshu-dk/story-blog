"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/actions/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/stories", label: "Stories", icon: "📝" },
  { href: "/admin/categories", label: "Categories", icon: "🏷️" },
  { href: "/admin/requests", label: "Story Requests", icon: "💬" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.push("/admin/login");
      router.refresh();
    });
  }

  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col justify-between border-r border-neutral-200 bg-white">
      <div>
        <div className="border-b border-neutral-200 px-5 py-5">
          <p className="text-lg font-bold text-neutral-900">House of Stories</p>
          <p className="text-xs text-neutral-500">Admin</p>
        </div>
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, "exact" in item && item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-amber-100 text-amber-900"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-neutral-200 p-3">
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          <span aria-hidden="true">🚪</span>
          {isPending ? "Logging out..." : "Logout"}
        </button>
      </div>
    </aside>
  );
}
