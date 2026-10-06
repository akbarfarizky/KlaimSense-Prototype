"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Filter, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry } from "@/types";

export function AuditTable({ entries }: { entries: AuditLogEntry[] }) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<"ALL" | AuditLogEntry["severity"]>("ALL");
  const [actor, setActor] = useState("ALL");

  const actors = useMemo(
    () => Array.from(new Set(entries.map((e) => e.actor))).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (severity !== "ALL" && entry.severity !== severity) return false;
      if (actor !== "ALL" && entry.actor !== actor) return false;
      if (q) {
        const haystack = `${entry.action} ${entry.object} ${entry.actor} ${entry.newState}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, search, severity, actor]);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aksi, objek, atau status…"
              className="pl-9"
              aria-label="Cari audit log"
            />
          </div>
          <div className="lg:col-span-3">
            <Label className="sr-only">Severity</Label>
            <Select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
              aria-label="Filter severity"
            >
              <option value="ALL">Semua tingkat</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div className="lg:col-span-4">
            <Label className="sr-only">Aktor</Label>
            <Select value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Filter aktor">
              <option value="ALL">Semua aktor</option>
              {actors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <strong className="text-navy-800">{filtered.length}</strong> dari {entries.length} entri
          </span>
          {(search || severity !== "ALL" || actor !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSeverity("ALL");
                setActor("ALL");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </CardContent>

      <div className="border-t border-line">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Objek</TableHead>
              <TableHead>Status Sebelum</TableHead>
              <TableHead>Status Sesudah</TableHead>
              <TableHead>Tingkat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 200).map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap font-mono text-[11px] text-ink-soft">
                  {formatDateTime(entry.timestamp)}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-xs text-ink-soft">
                  {entry.actor}
                </TableCell>
                <TableCell className="text-xs font-medium text-navy-900">{entry.action}</TableCell>
                <TableCell className="text-[11px]">
                  {entry.object.startsWith("CLM-") ? (
                    <Link
                      href={`/claims/${entry.object}`}
                      className="font-mono text-brand-600 hover:underline"
                    >
                      {entry.object}
                    </Link>
                  ) : (
                    <span className="font-mono text-ink-muted">{entry.object}</span>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-ink-muted">{entry.previousState}</TableCell>
                <TableCell className="text-[11px] font-medium text-ink-soft">{entry.newState}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      entry.severity === "critical"
                        ? "critical"
                        : entry.severity === "warning"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {entry.severity}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-ink-muted">
                  Tidak ada entri audit yang cocok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filtered.length > 200 && (
          <p className="border-t border-line px-5 py-3 text-[11px] text-ink-muted">
            Menampilkan 200 entri terbaru dari {filtered.length}.
          </p>
        )}
      </div>
    </Card>
  );
}

export function AuditIcon() {
  return <Activity className="h-4 w-4" />;
}
