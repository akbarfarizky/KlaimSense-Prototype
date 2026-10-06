"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  ClipboardCheck,
  FileText,
  FolderSearch,
  LayoutDashboard,
  Menu,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FileText,
  Building2,
  Scale,
  Activity,
  FolderSearch,
  ClipboardCheck,
  ScrollText,
  Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return { ...item, Icon, active };
      }),
    [pathname],
  );

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
      {items.map(({ href, label, Icon, active }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "bg-brand-500/15 text-white"
              : "text-navy-100/75 hover:bg-white/5 hover:text-white",
          )}
        >
          <Icon className={cn("h-4 w-4", active ? "text-brand-300" : "text-navy-200/70")} />
          <span className="truncate">{label}</span>
          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" />}
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 shadow-sm">
        <ShieldCheck className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-tight text-white">KlaimSense</p>
        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-navy-200/80">
          Verification Intelligence
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-navy-900 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">KlaimSense</span>
        </div>
        <button
          type="button"
          aria-label="Buka menu navigasi"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-1.5 text-navy-100 hover:bg-white/10"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-navy-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-navy-900 shadow-xl">
            {brand}
            {nav}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy-900 lg:flex">
        {brand}
        {nav}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-yellow">
              Mode Demo
            </p>
            <p className="mt-1 text-[11px] leading-snug text-navy-100/70">
              Data sintetis. Sistem hanya memberi indikasi, keputusan tetap pada petugas.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
