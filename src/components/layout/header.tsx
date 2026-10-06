"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, PlayCircle, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/lib/constants";

export function Header({ repositoryMode }: { repositoryMode: "mock" | "postgres" }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(
    (i) => pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href)),
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="flex flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-navy-700 lg:hidden xl:flex">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-navy-900">KlaimSense</h2>
              <Badge variant="dark" className="hidden sm:inline-flex">
                DEMO / DATA SINTETIS
              </Badge>
            </div>
            <p className="text-[11px] text-ink-muted">
              BPJS Kesehatan Verification Intelligence
              {current ? <span className="text-ink-soft"> • {current.label}</span> : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1">
            <Database className="h-3 w-3 text-teal-600" />
            {repositoryMode === "postgres" ? "PostgreSQL" : "Mock Repository"}
          </Badge>
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/claims">
              <Search className="h-3.5 w-3.5" />
              Cari Klaim
            </Link>
          </Button>
          <Button variant="brand" size="sm" asChild>
            <Link href="/dashboard#demo">
              <PlayCircle className="h-3.5 w-3.5" />
              Jalankan Demo
            </Link>
          </Button>
        </div>
      </div>
      <div className="border-t border-accent-yellow/40 bg-accent-yellow/20 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-amber-800 md:px-6">
        MODE DEMO — DATA SINTETIS • Sistem memberikan indikasi, bukan keputusan fraud
      </div>
    </header>
  );
}
