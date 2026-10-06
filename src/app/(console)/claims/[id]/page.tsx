import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarDays,
  Cpu,
  FileText,
  Fingerprint,
  Gauge,
  HelpCircle,
  Info,
  Radio,
  Scale,
  ScrollText,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { CapacityComparisonChart } from "@/components/charts";
import { MachineStatusBadge, PriorityBadge, SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { ScoreMeter } from "@/components/shared/score-meter";
import { DecisionPanel } from "@/components/verification/decision-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORY_LABELS, SERVICE_LABELS } from "@/lib/constants";
import { EVIDENCE_DISCLAIMER } from "@/lib/agents";
import { formatCurrency, formatDateID, formatDateTime, formatNumber } from "@/lib/format";
import { SERVICE_UNITS } from "@/lib/reference-data";
import { getRepository } from "@/lib/repositories";
import { edgeAiSummary } from "@/lib/iot";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repository = getRepository();
  const record = await repository.getClaimRecord(id);
  if (!record) notFound();

  const { claim, hospital, ruleResults, score, case: verificationCase } = record;
  const [evidence, machines] = await Promise.all([
    repository.getEvidence(id),
    repository.getMachineTelemetry(hospital.id, claim.serviceDate),
  ]);

  const triggered = ruleResults.filter((r) => r.triggered);
  const notTriggeredRules = ruleResults.filter((r) => !r.triggered);
  const summarySection = evidence?.sections.find((s) => s.key === "summary");

  const capacityData = ruleResults
    .filter((r) => (r.ruleId === "CAP-001" || r.ruleId === "CAP-002") && r.triggered)
    .map((r) => ({
      label: r.ruleId === "CAP-001" ? "Fisioterapi" : "Hemodialisis",
      kapasitas: Number(r.nilaiBatas),
      klaim: Number(r.nilaiAktual),
    }));

  const anomalousMachines = machines.filter((m) => m.status !== "THERAPY");
  const ai = edgeAiSummary(machines);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/verification">
            <ArrowLeft className="h-3.5 w-3.5" />
            Daftar Periksa
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/evidence?claim=${claim.id}`}>
            <Sparkles className="h-3.5 w-3.5" />
            Lihat Evidence Package
          </Link>
        </Button>
      </div>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand-600" />
                  <Link
                    href={`/hospitals/${hospital.id}`}
                    className="text-lg font-bold tracking-tight text-navy-900 hover:text-brand-600"
                  >
                    {hospital.name}
                  </Link>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {hospital.region} • Kelas {hospital.class} • {hospital.beds} tempat tidur
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge category={score.category} />
                <StatusBadge status={verificationCase?.status ?? "BARU"} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-canvas/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Claim ID
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-navy-900">{claim.id}</p>
              </div>
              <div className="rounded-lg border border-line bg-canvas/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Kasus Verifikasi
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-navy-900">
                  {verificationCase?.id ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-canvas/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Petugas
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-navy-900">
                  {verificationCase?.assignedTo ?? "Belum ditugaskan"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="text-center">
              <ScoreMeter score={score.score} category={score.category} />
              <p className="mt-2 text-[11px] font-medium text-ink-muted">
                {triggered.length} rule terpicu
              </p>
            </div>
          </div>
        </div>

        <Separator />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem icon={<Fingerprint className="h-3.5 w-3.5" />} label="ID Pasien" value={claim.patientRef} mono />
          <DetailItem icon={<Activity className="h-3.5 w-3.5" />} label="Layanan" value={SERVICE_LABELS[claim.serviceType]} />
          <DetailItem icon={<CalendarDays className="h-3.5 w-3.5" />} label="Tanggal Layanan" value={formatDateID(claim.serviceDate)} />
          <DetailItem icon={<Wallet className="h-3.5 w-3.5" />} label="Nilai Klaim" value={formatCurrency(claim.totalValue)} />
        </div>
      </Card>

      {/* Rincian informasi klaim */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-600" />
            Informasi Klaim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="ID Pasien" value={claim.patientRef} mono />
            <InfoRow label="Layanan" value={SERVICE_LABELS[claim.serviceType]} />
            <InfoRow label="Tanggal" value={formatDateID(claim.serviceDate)} />
            <InfoRow
              label="Kuantitas"
              value={`${formatNumber(claim.quantity)} ${SERVICE_UNITS[claim.serviceType]}`}
            />
            <InfoRow label="Harga Satuan" value={formatCurrency(claim.unitPrice)} />
            <InfoRow label="Nilai" value={formatCurrency(claim.totalValue)} />
            <InfoRow label="Baris Agregat Harian" value={claim.aggregateDailyLine ? "Ya" : "Tidak"} />
            <InfoRow label="Status Pembayaran Sebelumnya" value={claim.previouslyPaid ? "Sudah dibayar" : "Belum dibayar"} />
            <InfoRow label="Deskripsi" value={claim.description} />
          </dl>
        </CardContent>
      </Card>

      {/* Mengapa ditandai */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-amber-500" />
            Mengapa Ditandai?
          </CardTitle>
          <p className="text-xs text-ink-muted">
            Daftar aturan deterministik yang terpicu beserta nilai aktual dan nilai batas.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {triggered.length === 0 && (
            <p className="rounded-lg border border-line bg-canvas/50 p-4 text-sm text-ink-muted">
              Tidak ada aturan yang terpicu untuk klaim ini. Klaim tidak ditandai.
            </p>
          )}
          {triggered.map((rule) => (
            <div key={rule.ruleId} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {rule.ruleId}
                  </Badge>
                  <span className="text-sm font-semibold text-navy-900">
                    {CATEGORY_LABELS[rule.category]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={rule.severity} />
                  <Badge variant="dark">+{rule.scoreImpact}</Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{rule.explanation}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <MetricBox label="Nilai Aktual" value={String(rule.nilaiAktual)} unit={rule.satuan} />
                <MetricBox label="Nilai Batas" value={String(rule.nilaiBatas)} unit={rule.satuan} />
                <MetricBox
                  label="Selisih"
                  value={rule.selisih === null ? "—" : String(rule.selisih)}
                  unit={rule.satuan}
                  highlight
                />
              </div>
              <ul className="mt-3 space-y-1">
                {rule.evidence.map((e) => (
                  <li key={`${rule.ruleId}-${e.label}`} className="flex flex-wrap gap-x-2 text-[11px]">
                    <span className="font-medium text-ink-muted">{e.label}:</span>
                    <span className="text-ink-soft">{e.value}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-ink-muted">
                <span className="font-medium">Sumber:</span> {rule.sumber}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Skor breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-brand-600" />
            Perhitungan Skor Prioritas
          </CardTitle>
          <p className="text-xs text-ink-muted">Perhitungan ditampilkan terbuka, tidak disembunyikan.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Bobot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {score.breakdown.map((b) => (
                  <TableRow key={b.ruleId}>
                    <TableCell className="font-mono text-[11px]">{b.ruleId}</TableCell>
                    <TableCell className="text-xs">{b.label}</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-danger">
                      +{b.impact}
                    </TableCell>
                  </TableRow>
                ))}
                {score.breakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-xs text-ink-muted">
                      Tidak ada rule terpicu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-navy-900 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-navy-100">
              PRIORITAS
            </span>
            <span className="text-lg font-bold text-white tabular-nums">
              {score.score} / 100
            </span>
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">{score.notes}</p>
        </CardContent>
      </Card>

      {/* Bukti kapasitas */}
      {capacityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-teal-600" />
              Bukti Kapasitas
            </CardTitle>
            <p className="text-xs text-ink-muted">
              Perbandingan kapasitas harian nyata rumah sakit dengan volume klaim pada tanggal
              layanan.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <CapacityComparisonChart data={capacityData} />
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricBox label="Tempat tidur" value={String(hospital.beds)} unit="TT" />
              <MetricBox label="Fisioterapis" value={String(hospital.physiotherapists)} unit="orang" />
              <MetricBox label="Mesin cuci darah" value={String(hospital.dialysisMachines)} unit="unit" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bukti IoT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-brand-600" />
            Bukti IoT / Sensor
          </CardTitle>
          <p className="text-xs text-ink-muted">
            Simulasi telemetri mesin cuci darah pada {formatDateID(claim.serviceDate)}. Nilai
            simulasi prototype, bukan validasi pada data rumah sakit nyata.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {anomalousMachines.length > 0 ? (
            <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-xs text-amber-900">
              <strong>Potensi ketidaksesuaian antara klaim dan data sensor.</strong> Mesin{" "}
              {anomalousMachines.map((m) => `${m.machineId} (${m.status})`).join(", ")} berada pada
              kondisi tidak aktif ketika terdapat klaim pada periode ini.
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-canvas/50 p-3 text-xs text-ink-soft">
              Tidak ditemukan mesin OFFLINE/STANDBY pada periode klaim ini.
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mesin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Daya</TableHead>
                  <TableHead>Arus</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Tanda Tangan</TableHead>
                  <TableHead>Edge AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((m) => (
                  <TableRow key={m.machineId}>
                    <TableCell className="font-mono text-[11px] font-semibold">{m.machineId}</TableCell>
                    <TableCell>
                      <MachineStatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{formatNumber(m.powerWatts)} W</TableCell>
                    <TableCell className="text-xs tabular-nums">{m.currentAmps.toFixed(2)} A</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px] text-ink-soft">
                      {formatDateTime(m.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.signatureValid ? "success" : "danger"}>
                        {m.signatureValid ? "VALID" : "INVALID"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{m.edgeAiPrediction}</span>
                      <span className="text-ink-muted"> • {m.edgeAiConfidence}%</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas/50 p-3">
            <Cpu className="h-4 w-4 text-teal-600" />
            <p className="text-[11px] text-ink-soft">
              <strong>Simulasi Edge AI</strong> — akurasi simulasi {ai.accuracy}% • rata-rata
              keyakinan {ai.meanConfidence}% • kesesuaian prediksi {ai.agreement}%. {ai.note}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bukti aturan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-brand-600" />
            Bukti Aturan &amp; Referensi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Penjelasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggered.map((rule) => (
                  <TableRow key={`policy-${rule.ruleId}`}>
                    <TableCell className="font-mono text-[11px]">{rule.ruleId}</TableCell>
                    <TableCell className="text-[11px] text-ink-soft">{rule.sumber}</TableCell>
                    <TableCell className="text-xs text-ink-soft">{rule.explanation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {evidence && evidence.policyRefs.length > 0 && (
            <ul className="space-y-2">
              {evidence.policyRefs.map((ref) => (
                <li key={ref.docId} className="rounded-lg border border-line bg-canvas/40 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={ref.available ? "teal" : "muted"}>
                      {ref.available ? "TERSEDIA" : "BELUM TERSEDIA"}
                    </Badge>
                    <span className="text-xs font-semibold text-navy-900">{ref.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-soft">{ref.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Ringkasan evidence + keputusan */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              Ringkasan Evidence
            </CardTitle>
            <p className="text-xs text-ink-muted">
              Disusun oleh EvidenceAgentService (mock deterministik) — {evidence?.agentTrace.length ?? 0} agen.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-lg border border-line bg-canvas/50 p-4 text-sm leading-relaxed text-ink-soft">
              {summarySection?.items[0]?.value ?? "Ringkasan belum tersedia."}
            </p>
            <div className="rounded-lg border border-danger/25 bg-danger-soft p-3">
              <p className="flex items-start gap-2 text-xs font-medium leading-relaxed text-danger">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {EVIDENCE_DISCLAIMER}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-navy-900">Jejak agen (deterministik)</p>
              <ul className="space-y-1.5">
                {(evidence?.agentTrace ?? []).map((trace) => (
                  <li
                    key={trace.agent}
                    className="flex items-start gap-2 rounded-md border border-line bg-white p-2.5"
                  >
                    <Badge variant="outline" className="shrink-0">
                      {trace.agent}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-[11px] leading-snug text-ink-soft">{trace.finding}</p>
                      <p className="text-[10px] text-ink-muted">
                        {trace.role} • {trace.deterministic ? "deterministik" : "non-deterministik"} •{" "}
                        {trace.durationMs} ms
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-navy-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-brand-600" />
                Keputusan Petugas
              </CardTitle>
              <p className="text-xs text-ink-muted">
                Setiap keputusan memerlukan konfirmasi dan dicatat pada audit log.
              </p>
            </CardHeader>
            <CardContent>
              <DecisionPanel claimId={claim.id} disabled={!verificationCase} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-ink-muted" />
                Rule Tidak Terpicu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {notTriggeredRules.map((r) => (
                  <Badge key={r.ruleId} variant="muted" className="font-mono">
                    {r.ruleId}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-ink-muted">
                Rule yang tidak terpicu tetap ditampilkan agar hasil pemeriksaan dapat dijelaskan
                secara utuh.
              </p>
            </CardContent>
          </Card>

          {evidence && (
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Paket Bukti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <p className="text-[11px] text-ink-muted">
                  ID: <span className="font-mono text-ink-soft">{evidence.id}</span>
                </p>
                <p className="text-[11px] text-ink-muted">
                  Dibuat: <span className="text-ink-soft">{formatDateTime(evidence.generatedAt)}</span>
                </p>
                <p className="text-[11px] text-ink-muted">
                  Bagian: <span className="text-ink-soft">{evidence.sections.length}</span>
                </p>
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <Link href={`/evidence?claim=${claim.id}`}>Buka Evidence Center</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className={cn("truncate text-sm font-semibold text-navy-900", mono && "font-mono text-xs")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-dashed border-line pb-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-sm text-navy-900", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function MetricBox({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        highlight ? "border-danger/25 bg-danger-soft" : "border-line bg-canvas/50",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-navy-900">
        {value}
        {unit && <span className="ml-1 text-[11px] font-medium text-ink-muted">{unit}</span>}
      </p>
    </div>
  );
}
