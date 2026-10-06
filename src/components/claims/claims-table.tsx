"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Filter, Search, X } from "lucide-react";
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
import { SERVICE_LABELS, SERVICE_SHORT, STATUS_LABELS } from "@/lib/constants";
import { formatCompactCurrency, formatDateShort } from "@/lib/format";
import type { PriorityCategory, ServiceType, VerificationStatus } from "@/types";

export interface ClaimRow {
  id: string;
  hospitalId: string;
  hospitalName: string;
  patientRef: string;
  serviceType: ServiceType;
  serviceDate: string;
  quantity: number;
  totalValue: number;
  triggers: string[];
  score: number;
  category: PriorityCategory;
  status: VerificationStatus;
}

export function ClaimsTable({
  rows,
  hospitals,
}: {
  rows: ClaimRow[];
  hospitals: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [hospitalId, setHospitalId] = useState("ALL");
  const [service, setService] = useState<ServiceType | "ALL">("ALL");
  const [status, setStatus] = useState<VerificationStatus | "ALL">("ALL");
  const [priority, setPriority] = useState<PriorityCategory | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlySuspicious, setOnlySuspicious] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (hospitalId !== "ALL" && row.hospitalId !== hospitalId) return false;
      if (service !== "ALL" && row.serviceType !== service) return false;
      if (status !== "ALL" && row.status !== status) return false;
      if (priority !== "ALL" && row.category !== priority) return false;
      if (dateFrom && row.serviceDate < dateFrom) return false;
      if (dateTo && row.serviceDate > dateTo) return false;
      if (onlySuspicious && row.score < 30) return false;
      if (q) {
        const haystack = `${row.id} ${row.hospitalName} ${row.patientRef}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, hospitalId, service, status, priority, dateFrom, dateTo, onlySuspicious]);

  const totalValue = filtered.reduce((sum, r) => sum + r.totalValue, 0);

  const reset = () => {
    setSearch("");
    setHospitalId("ALL");
    setService("ALL");
    setStatus("ALL");
    setPriority("ALL");
    setDateFrom("");
    setDateTo("");
    setOnlySuspicious(false);
  };

  const exportCsv = () => {
    const header = [
      "claim_id",
      "hospital",
      "patient_ref",
      "service",
      "date",
      "quantity",
      "value",
      "score",
      "priority",
      "status",
      "triggers",
    ];
    const lines = filtered.map((r) =>
      [
        r.id,
        `"${r.hospitalName}"`,
        r.patientRef,
        r.serviceType,
        r.serviceDate,
        r.quantity,
        r.totalValue,
        r.score,
        r.category,
        r.status,
        `"${r.triggers.join(" ")}"`,
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "klaimsense-claims.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari klaim / pasien…"
              className="pl-9"
              aria-label="Cari klaim"
            />
          </div>
          <div className="lg:col-span-2">
            <Label className="sr-only">Rumah sakit</Label>
            <Select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} aria-label="Filter rumah sakit">
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
          <div className="lg:col-span-2">
            <Label className="sr-only">Status</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as VerificationStatus | "ALL")}
              aria-label="Filter status"
            >
              <option value="ALL">Semua status</option>
              {(Object.keys(STATUS_LABELS) as VerificationStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-1">
            <Label className="sr-only">Prioritas</Label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityCategory | "ALL")}
              aria-label="Filter prioritas"
            >
              <option value="ALL">Prioritas</option>
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as PriorityCategory[]).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-1">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Tanggal mulai"
            />
          </div>
          <div className="lg:col-span-1">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Tanggal akhir"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              <strong className="text-navy-800">{filtered.length}</strong> klaim
            </span>
            <span>
              Total nilai: <strong className="text-navy-800">{formatCompactCurrency(totalValue)}</strong>
            </span>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={onlySuspicious}
                onChange={(e) => setOnlySuspicious(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-line accent-brand-500"
              />
              Hanya mencurigakan (skor ≥ 30)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>

      <div className="border-t border-line">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim ID</TableHead>
              <TableHead>Rumah Sakit</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Layanan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Nilai</TableHead>
              <TableHead>Pemicu</TableHead>
              <TableHead>Skor</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 150).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-[11px] text-ink-soft">{row.id}</TableCell>
                <TableCell className="max-w-[180px] truncate text-xs font-medium text-navy-900">
                  {row.hospitalName}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-ink-soft">{row.patientRef}</TableCell>
                <TableCell className="text-xs">{SERVICE_SHORT[row.serviceType]}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-ink-soft">
                  {formatDateShort(row.serviceDate)}
                </TableCell>
                <TableCell className="text-xs tabular-nums">{row.quantity}</TableCell>
                <TableCell className="whitespace-nowrap text-xs font-medium tabular-nums">
                  {formatCompactCurrency(row.totalValue)}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[130px] flex-wrap gap-1">
                    {row.triggers.slice(0, 2).map((t) => (
                      <Badge key={t} variant="outline" className="font-mono">
                        {t}
                      </Badge>
                    ))}
                    {row.triggers.length > 2 && <Badge variant="muted">+{row.triggers.length - 2}</Badge>}
                    {row.triggers.length === 0 && <span className="text-[11px] text-ink-muted">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <ScoreBar score={row.score} category={row.category} />
                </TableCell>
                <TableCell>
                  <PriorityBadge category={row.category} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="subtle" asChild>
                    <Link href={`/claims/${row.id}`}>Periksa</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-sm text-ink-muted">
                  Tidak ada klaim yang cocok dengan filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filtered.length > 150 && (
          <p className="border-t border-line px-5 py-3 text-[11px] text-ink-muted">
            Menampilkan 150 klaim pertama dari {filtered.length}. Persempit filter atau export CSV
            untuk data lengkap.
          </p>
        )}
      </div>
    </Card>
  );
}
