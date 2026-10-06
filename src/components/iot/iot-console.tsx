"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Loader2,
  Power,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Waves,
  Zap,
} from "lucide-react";
import { MachineStatusBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { formatDateTime, formatNumber } from "@/lib/format";
import { EDGE_AI_SIMULATED_ACCURACY, SIMULATION_ACTIONS, type SimulationAction } from "@/lib/iot";
import { cn } from "@/lib/utils";
import type { MachineTelemetry } from "@/types";

const ACTION_ICONS: Record<SimulationAction, typeof Power> = {
  START_THERAPY: Waves,
  POWER_OFF: Power,
  STANDBY: Activity,
  SENSOR_MISMATCH: AlertTriangle,
};

export function IotConsole({
  hospitalId,
  hospitalName,
  hospitalClass,
  periodDate,
  initialMachines,
  availablePeriods,
  claimsOnPeriod,
  edgeAi,
}: {
  hospitalId: string;
  hospitalName: string;
  hospitalClass: string;
  periodDate: string;
  initialMachines: MachineTelemetry[];
  availablePeriods: string[];
  claimsOnPeriod: number;
  edgeAi: { accuracy: number; meanConfidence: number; agreement: number; note: string };
}) {
  const router = useRouter();
  const [machines, setMachines] = useState(initialMachines);
  const [selectedPeriod, setSelectedPeriod] = useState(periodDate);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [action, setAction] = useState<SimulationAction>("SENSOR_MISMATCH");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ time: string; text: string; tone: "info" | "warn" }[]>([]);

  const stats = useMemo(() => {
    const therapy = machines.filter((m) => m.status === "THERAPY").length;
    const standby = machines.filter((m) => m.status === "STANDBY").length;
    const offline = machines.filter((m) => m.status === "OFFLINE").length;
    const totalPower = machines.reduce((sum, m) => sum + m.powerWatts, 0);
    const invalidSignatures = machines.filter((m) => !m.signatureValid).length;
    return { therapy, standby, offline, totalPower, invalidSignatures };
  }, [machines]);

  const inconsistency = stats.offline + stats.standby > 0 && claimsOnPeriod > 0;

  // Mesin yang benar-benar dipakai untuk simulasi: pilihan pengguna, atau mesin
  // pertama sebagai default. Mencegah simulasi tanpa target saat state masih null.
  const effectiveMachine = selectedMachine ?? machines[0]?.machineId ?? "";

  const loadPeriod = async (period: string) => {
    setSelectedPeriod(period);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/iot?hospitalId=${hospitalId}&periodDate=${period}`);
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Gagal memuat periode.");
      setMachines(json.data.machines as MachineTelemetry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const runSimulation = async () => {
    if (!effectiveMachine) {
      setError("Tidak ada mesin yang tersedia untuk disimulasikan pada periode ini.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/iot/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId,
          periodDate: selectedPeriod,
          machineId: effectiveMachine,
          action,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Gagal menjalankan simulasi.");

      const updated = json.data.machine as MachineTelemetry;
      setMachines((prev) => prev.map((m) => (m.machineId === updated.machineId ? updated : m)));
      setLog((prev) =>
        [
          {
            time: new Date().toISOString(),
            text: `Simulasi ${action} pada ${updated.machineId} → ${updated.status}`,
            tone: updated.status === "OFFLINE" ? ("warn" as const) : ("info" as const),
          },
          ...prev,
        ].slice(0, 8),
      );
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Command center header */}
      <Card className="overflow-hidden border-navy-800 bg-navy-900">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
              <Cpu className="h-5 w-5 text-brand-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Command Center — {hospitalName}
              </p>
              <p className="text-[11px] text-navy-200/80">
                Kelas {hospitalClass} • Periode {selectedPeriod} • {machines.length} mesin dipantau
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedPeriod}
              onChange={(e) => loadPeriod(e.target.value)}
              className="border-navy-700 bg-navy-800 text-white"
              aria-label="Pilih periode"
            >
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Button variant="brand" onClick={() => setDialogOpen(true)} data-testid="simulate-event">
              <Zap className="h-3.5 w-3.5" />
              Simulasikan Kejadian
            </Button>
          </div>
        </CardContent>
        <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-5">
          <ConsoleStat label="THERAPY" value={stats.therapy} tone="success" />
          <ConsoleStat label="STANDBY" value={stats.standby} tone="warning" />
          <ConsoleStat label="OFFLINE" value={stats.offline} tone="danger" />
          <ConsoleStat label="Total Daya" value={`${formatNumber(stats.totalPower)} W`} tone="brand" />
          <ConsoleStat
            label="Tanda Tangan Invalid"
            value={stats.invalidSignatures}
            tone={stats.invalidSignatures > 0 ? "danger" : "success"}
          />
        </div>
      </Card>

      {inconsistency && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Potensi ketidaksesuaian klaim dengan data sensor.
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Terdapat {claimsOnPeriod} klaim pada periode ini, sementara {stats.offline + stats.standby}{" "}
              mesin berada pada status OFFLINE/STANDBY. Ini merupakan indikasi yang perlu diverifikasi,
              bukan kesimpulan fraud.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {machines.map((machine) => (
            <MachineCard
              key={machine.machineId}
              machine={machine}
              onSelect={() => {
                setSelectedMachine(machine.machineId);
                setDialogOpen(true);
              }}
            />
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-teal-600" />
                Simulasi Edge AI
              </CardTitle>
              <p className="text-xs text-ink-muted">
                Klasifikasi status dari pola arus, daya, dan waktu.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-teal-500/30 bg-teal-500/[0.06] p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">
                  Akurasi Simulasi
                </p>
                <p className="text-3xl font-bold text-teal-700">
                  {EDGE_AI_SIMULATED_ACCURACY.toFixed(1)}%
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line p-2.5 text-center">
                  <p className="text-[10px] text-ink-muted">Rata-rata keyakinan</p>
                  <p className="text-sm font-bold text-navy-900">{edgeAi.meanConfidence}%</p>
                </div>
                <div className="rounded-lg border border-line p-2.5 text-center">
                  <p className="text-[10px] text-ink-muted">Kesesuaian prediksi</p>
                  <p className="text-sm font-bold text-navy-900">{edgeAi.agreement}%</p>
                </div>
              </div>
              <p className="rounded-lg border border-danger/25 bg-danger-soft p-2.5 text-[11px] leading-relaxed text-danger">
                {edgeAi.note} Nilai ini bukan hasil validasi klinis dan bukan klaim akurasi model
                produksi.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-brand-600" />
                Log Simulasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {log.length === 0 ? (
                <p className="text-[11px] text-ink-muted">
                  Belum ada simulasi dijalankan pada sesi ini.
                </p>
              ) : (
                <ul className="space-y-2">
                  {log.map((entry) => (
                    <li key={`${entry.time}-${entry.text}`} className="flex gap-2 text-[11px]">
                      <span className="font-mono text-ink-muted">{entry.time.slice(11, 19)}</span>
                      <span className={entry.tone === "warn" ? "text-amber-700" : "text-ink-soft"}>
                        {entry.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Simulasikan Kejadian IoT</DialogTitle>
            <DialogDescription>
              Pilih mesin dan kejadian untuk dijalankan pada periode {selectedPeriod}. Simulasi ini
              hanya mengubah data prototype, bukan perangkat nyata.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-soft" htmlFor="machine-select">
                Mesin
              </label>
              <Select
                id="machine-select"
                value={effectiveMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
              >
                {machines.map((m) => (
                  <option key={m.machineId} value={m.machineId}>
                    {m.machineId} — {m.status}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-ink-soft">Kejadian</span>
              <div className="grid gap-2">
                {SIMULATION_ACTIONS.map((item) => {
                  const Icon = ACTION_ICONS[item.action];
                  const active = action === item.action;
                  return (
                    <button
                      key={item.action}
                      type="button"
                      onClick={() => setAction(item.action)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
                        active
                          ? "border-brand-500 bg-brand-50"
                          : "border-line hover:border-navy-200 hover:bg-navy-50/50",
                      )}
                    >
                      <Icon
                        className={cn("mt-0.5 h-4 w-4", active ? "text-brand-600" : "text-ink-muted")}
                      />
                      <span>
                        <span className="block text-xs font-semibold text-navy-900">
                          {item.label}
                        </span>
                        <span className="block text-[11px] text-ink-muted">{item.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button variant="brand" onClick={runSimulation} disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Jalankan Simulasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsoleStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "success" | "warning" | "danger" | "brand";
}) {
  const color = {
    success: "text-teal-300",
    warning: "text-amber-300",
    danger: "text-red-300",
    brand: "text-brand-300",
  }[tone];

  return (
    <div className="bg-navy-900 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-200/70">{label}</p>
      <p className={cn("mt-0.5 text-lg font-bold tabular-nums", color)}>{value}</p>
    </div>
  );
}

function MachineCard({
  machine,
  onSelect,
}: {
  machine: MachineTelemetry;
  onSelect: () => void;
}) {
  const borderTone =
    machine.status === "THERAPY"
      ? "border-teal-500/40"
      : machine.status === "STANDBY"
        ? "border-warning/40"
        : "border-danger/40";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-xl border bg-surface p-4 text-left shadow-sm transition-all hover:shadow-md",
        borderTone,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-navy-900">{machine.machineId}</span>
        <MachineStatusBadge status={machine.status} />
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">{machine.label}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-canvas/70 px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Daya</p>
          <p className="text-xs font-semibold tabular-nums text-navy-900">
            {formatNumber(machine.powerWatts)} W
          </p>
        </div>
        <div className="rounded-md bg-canvas/70 px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Arus</p>
          <p className="text-xs font-semibold tabular-nums text-navy-900">
            {machine.currentAmps.toFixed(2)} A
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px]">
          {machine.signatureValid ? (
            <>
              <ShieldCheck className="h-3 w-3 text-teal-600" />
              <span className="text-teal-700">Tanda tangan valid</span>
            </>
          ) : (
            <>
              <ShieldX className="h-3 w-3 text-danger" />
              <span className="text-danger">Tanda tangan tidak valid</span>
            </>
          )}
        </span>
        <Badge variant="outline" className="font-mono">
          AI {machine.edgeAiPrediction} {machine.edgeAiConfidence}%
        </Badge>
      </div>

      <p className="mt-2 text-[10px] text-ink-muted">{formatDateTime(machine.timestamp)}</p>
    </button>
  );
}
