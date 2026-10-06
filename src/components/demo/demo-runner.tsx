"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Cpu,
  FileSearch,
  Gavel,
  Loader2,
  PlayCircle,
  Radio,
  ScanLine,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/shared/badges";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DemoRunResult, DemoStep } from "@/types";

const STEP_ICONS = [FileSearch, Cpu, AlertTriangle, Radio, ScanLine, UserCheck, Gavel];

const INITIAL_STEPS: DemoStep[] = [
  { id: "step-1", order: 1, title: "Klaim masuk", description: "", status: "pending", detail: "" },
  { id: "step-2", order: 2, title: "Rule Engine berjalan", description: "", status: "pending", detail: "" },
  { id: "step-3", order: 3, title: "Anomali terdeteksi", description: "", status: "pending", detail: "" },
  { id: "step-4", order: 4, title: "IoT diperiksa", description: "", status: "pending", detail: "" },
  { id: "step-5", order: 5, title: "Evidence dibuat", description: "", status: "pending", detail: "" },
  { id: "step-6", order: 6, title: "Petugas verifikasi", description: "", status: "pending", detail: "" },
  { id: "step-7", order: 7, title: "Keputusan dicatat", description: "", status: "pending", detail: "" },
];

export function DemoRunner({
  initial,
  narrative,
}: {
  initial: DemoRunResult;
  narrative: {
    hospital: string;
    fisioterapi: { claim: number; capacity: number; over: number };
    hemodialisis: { claim: number; capacity: number; over: number };
    iot: { offline: readonly string[]; standby: readonly string[] };
  };
}) {
  const router = useRouter();
  const [steps, setSteps] = useState<DemoStep[]>(initial.steps);
  const [running, setRunning] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [result, setResult] = useState<DemoRunResult>(initial);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const animate = useCallback((payload: DemoRunResult) => {
    const incoming = payload.steps;
    let index = 0;
    setSteps(
      INITIAL_STEPS.map((s) => ({
        ...s,
        description: incoming.find((i) => i.id === s.id)?.description ?? s.description,
      })),
    );
    setActiveIndex(0);

    const tick = () => {
      index += 1;
      if (index >= incoming.length) {
        setActiveIndex(-1);
        setSteps(incoming);
        setRunning(false);
        setResult(payload);
        router.refresh();
        return;
      }
      setActiveIndex(index);
      setSteps((prev) =>
        prev.map((s, i) => (i < index ? { ...s, ...incoming[i], status: "done" } : s)),
      );
      timerRef.current = setTimeout(tick, 620);
    };

    setSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, ...incoming[0], status: "running" } : s)));
    timerRef.current = setTimeout(tick, 620);
  }, [router]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/demo/run", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Gagal menjalankan demo.");
      }
      animate(json.data as DemoRunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setRunning(false);
      setActiveIndex(-1);
    }
  };

  const displayed = activeIndex >= 0 ? steps : result.steps.length > 0 ? result.steps : steps;
  const finished = displayed.filter((s) => s.status === "done").length;
  const progress = Math.round((finished / displayed.length) * 100);
  const decisionMade = displayed.find((s) => s.id === "step-7")?.status === "done";

  return (
    <Card id="demo" className="scroll-mt-24 overflow-hidden border-navy-200">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b border-line bg-navy-900/[0.03] p-5 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="h-4 w-4 text-brand-600" />
            Demo Scenario
          </CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">
            Skenario utama: {narrative.hospital} — 7 langkah dari klaim masuk hingga keputusan dicatat.
          </p>
        </div>
        <Button variant="brand" onClick={handleRun} disabled={running} data-testid="run-demo">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {running ? "Menjalankan…" : decisionMade ? "Jalankan Ulang Demo" : "Jalankan Demo"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-navy-800">{progress}%</span>
        </div>

        <ol className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {displayed.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? CircleDashed;
            const isActive = activeIndex === index;
            const isDone = step.status === "done";
            return (
              <li
                key={step.id}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  isActive
                    ? "border-brand-400 bg-brand-50/60 shadow-sm"
                    : isDone
                      ? "border-teal-500/30 bg-teal-500/[0.06]"
                      : "border-line bg-white",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                      isActive
                        ? "bg-brand-500 text-white"
                        : isDone
                          ? "bg-teal-500 text-white"
                          : "bg-navy-50 text-navy-500",
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.order}
                  </span>
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      isDone ? "text-teal-600" : isActive ? "text-brand-600" : "text-ink-muted",
                    )}
                  />
                  <span className="truncate text-xs font-semibold text-navy-900">{step.title}</span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-ink-soft">
                  {step.detail || step.description}
                </p>
              </li>
            );
          })}
        </ol>

        {error && (
          <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-line bg-canvas/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Fisioterapi
            </p>
            <p className="mt-1 text-lg font-bold text-navy-900">
              {narrative.fisioterapi.over} sesi/hari
            </p>
            <p className="text-[11px] text-ink-soft">
              Klaim {narrative.fisioterapi.claim} vs kapasitas {narrative.fisioterapi.capacity}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-canvas/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Hemodialisis
            </p>
            <p className="mt-1 text-lg font-bold text-navy-900">
              {narrative.hemodialisis.over} sesi
            </p>
            <p className="text-[11px] text-ink-soft">
              Klaim {narrative.hemodialisis.claim} vs kapasitas {narrative.hemodialisis.capacity}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-canvas/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Simulasi IoT
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {narrative.iot.offline.map((m) => (
                <Badge key={m} variant="danger">
                  {m} OFFLINE
                </Badge>
              ))}
              {narrative.iot.standby.map((m) => (
                <Badge key={m} variant="warning">
                  {m} STANDBY
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {result.score && (
          <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <PriorityBadge category={result.score.category} />
              <div>
                <p className="text-xs font-semibold text-navy-900">
                  Skor prioritas {result.score.score}/100 — {result.primaryClaimId}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {result.score.breakdown.map((b) => `${b.ruleId} +${b.impact}`).join("  •  ") ||
                    "Belum ada rule terpicu"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted">
                Potensi nilai ditinjau: {formatCurrency(0 + (result.score.score > 0 ? 27000000 : 0))}
              </span>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/claims/${result.primaryClaimId}`}>
                  Buka Kasus
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-ink-muted">
          Sistem tidak menolak klaim secara otomatis. Setiap temuan adalah indikasi yang perlu
          diverifikasi petugas. Keputusan pada demo ini dijalankan secara manual oleh petugas melalui
          halaman Detail Klaim.
        </p>
      </CardContent>
    </Card>
  );
}
