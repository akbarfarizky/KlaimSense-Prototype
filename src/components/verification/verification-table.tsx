"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search, X } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/shared/badges";
import { ScoreBar } from "@/components/shared/score-meter";
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
import { SERVICE_SHORT, SERVICE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { formatCompactCurrency, formatDateShort } from "@/lib/format";
import { DECISION_OPTIONS, DecisionButton } from "@/components/verification/decision-button";
import type { PriorityCategory, ServiceType, VerificationStatus } from "@/types";

export interface VerificationRow {
  claimId: string;
  hospitalId: string;
  hospitalName: string;
  patientRef: string;
  serviceType: ServiceType;
  serviceDate: string;
  value: number;
  triggers: string[];
  score: number;
  category: PriorityCategory;
  status: VerificationStatus;
}

const PRIORITY_OPTIONS: (PriorityCategory | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUS_OPTIONS: (VerificationStatus | "ALL")[] = [
  "ALL",
  "BARU",
  "DALAM_PEMERIKSAAN",
  "MEMBUTUHKAN_KLARIFIKASI",
  "RUJUK_AUDIT",
  "DISETUJUI",
  "DITOLAK",
];

export function VerificationTable({
  rows,
  hospitals,
}: {
  rows: VerificationRow[];
  hospitals: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<PriorityCategory | "ALL">("ALL");
  const [status, setStatus] = useState<VerificationStatus | "ALL">("ALL");
  const [hospitalId, setHospitalId] = useState<string>("ALL");
  const [service, setService] = useState<ServiceType | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (priority !== "ALL" && row.category !== priority) return false;
      if (status !== "ALL" && row.status !== status) return false;
      if (hospitalId !== "ALL" && row.hospitalId !== hospitalId) return false;
      if (service !== "ALL" && row.serviceType !== service) return false;
      if (q) {
        const haystack = `${row.claimId} ${row.hospitalName} ${row.patientRef} ${row.triggers.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, priority, status, hospitalId, service]);

  const hasFilter =
    search !== "" || priority !== "ALL" || status !== "ALL" || hospitalId !== "ALL" || service !== "ALL";

  const reset = () => {
    setSearch("");
    setPriority("ALL");
    setStatus("ALL");
    setHospitalId("ALL");
    setService("ALL");
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari claim ID, rumah sakit, atau pasien…"
              className="pl-9"
              aria-label="Cari klaim"
            />
          </div>
          <div className="lg:col-span-2">
            <Label className="sr-only">Prioritas</Label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityCategory | "ALL")}
              aria-label="Filter prioritas"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p === "ALL" ? "Semua prioritas" : p}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label className="sr-only">Status</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as VerificationStatus | "ALL")}
              aria-label="Filter status"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "Semua status" : STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label className="sr-only">Rumah sakit</Label>
            <Select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              aria-label="Filter rumah sakit"
            >
              <option value="ALL">Semua rumah sakit</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label className="sr-only">Layanan</Label>
            <Select
              value={service}
              onChange={(e) => setService(e.target.value as ServiceType | "ALL")}
              aria-label="Filter layanan"
            >
              <option value="ALL">Semua layanan</option>
              {(Object.keys(SERVICE_LABELS) as ServiceType[]).map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Filter className="h-3.5 w-3.5" />
            Menampilkan <strong className="text-navy-800">{filtered.length}</strong> dari {rows.length}{" "}
            kasus
          </div>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-3.5 w-3.5" />
              Reset filter
            </Button>
          )}
        </div>
      </CardContent>

      <div className="border-t border-line">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prioritas</TableHead>
              <TableHead>Rumah Sakit</TableHead>
              <TableHead>Claim ID</TableHead>
              <TableHead>Layanan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Nilai</TableHead>
              <TableHead>Pemicu</TableHead>
              <TableHead>Skor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.claimId}>
                <TableCell>
                  <PriorityBadge category={row.category} />
                </TableCell>
                <TableCell className="max-w-[190px]">
                  <Link
                    href={`/hospitals/${row.hospitalId}`}
                    className="block truncate text-xs font-medium text-navy-900 hover:text-brand-600"
                  >
                    {row.hospitalName}
                  </Link>
                  <span className="font-mono text-[10px] text-ink-muted">{row.patientRef}</span>
                </TableCell>
                <TableCell className="font-mono text-[11px] text-ink-soft">{row.claimId}</TableCell>
                <TableCell className="text-xs">{SERVICE_SHORT[row.serviceType]}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-ink-soft">
                  {formatDateShort(row.serviceDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs font-medium tabular-nums">
                  {formatCompactCurrency(row.value)}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[160px] flex-wrap gap-1">
                    {row.triggers.slice(0, 3).map((t) => (
                      <Badge key={t} variant="outline" className="font-mono">
                        {t}
                      </Badge>
                    ))}
                    {row.triggers.length > 3 && (
                      <Badge variant="muted">+{row.triggers.length - 3}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <ScoreBar score={row.score} category={row.category} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button size="sm" variant="subtle" asChild>
                      <Link href={`/claims/${row.claimId}`}>Periksa</Link>
                    </Button>
                    {DECISION_OPTIONS.map((option) => (
                      <DecisionButton key={option.action} claimId={row.claimId} option={option} />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-ink-muted">
                  Tidak ada kasus yang cocok dengan filter saat ini.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
