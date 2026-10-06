import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Building2,
  ClipboardList,
  FileCheck2,
  Gavel,
  Layers,
  Scale,
  Sparkles,
} from "lucide-react";
import { EvidenceToolbar } from "@/components/evidence/evidence-toolbar";
import { PriorityBadge, SeverityBadge, StatusBadge } from "@/components/shared/badges";
import { ScoreMeter } from "@/components/shared/score-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PRIMARY_DEMO_CLAIM_ID, SERVICE_LABELS } from "@/lib/constants";
import { EVIDENCE_DISCLAIMER } from "@/lib/agents";
import { formatCurrency, formatDateID, formatDateTime } from "@/lib/format";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const { claim: claimParam } = await searchParams;
  const repository = getRepository();
  const records = await repository.getClaimRecords();

  const cases = records.filter((r) => r.case !== null);
  if (cases.length === 0) notFound();

  const claimId = claimParam ?? PRIMARY_DEMO_CLAIM_ID;
  const record = await repository.getClaimRecord(claimId);

  if (!record) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-ink-soft">
              Klaim <span className="font-mono">{claimId}</span> tidak ditemukan.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/evidence">Kembali ke kasus utama</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const evidence = await repository.getEvidence(claimId);
  if (!evidence) notFound();

  const { claim, hospital, score, case: verificationCase } = record;
  const decisions = (await repository.getDecisions()).filter((d) => d.claimId === claimId);
  const audit = (await repository.getAuditLog()).filter((a) => a.object === claimId);

  const options = cases.map((r) => ({
    id: r.claim.id,
    label: `${r.claim.id} — ${r.hospital.name} (${r.score.score}/100)`,
  }));

  const sections = evidence.sections;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/claims/${claimId}`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Detail Klaim
          </Link>
        </Button>
      </div>

      {/* Report header */}
      <Card>
        <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700">
                <FileCheck2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-navy-900">
                  Evidence Package
                </h1>
                <p className="text-[11px] text-ink-muted">
                  KlaimSense — BPJS Kesehatan Verification Intelligence
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <MetaRow label="Evidence ID" value={evidence.id} mono />
              <MetaRow label="Claim ID" value={claim.id} mono />
              <MetaRow label="Kasus Verifikasi" value={verificationCase?.id ?? "—"} mono />
              <MetaRow label="Dibuat" value={formatDateTime(evidence.generatedAt)} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge category={score.category} />
              <StatusBadge status={verificationCase?.status ?? "BARU"} />
              <Badge variant="muted">MODE DEMO — DATA SINTETIS</Badge>
            </div>

            <div className="no-print">
              <EvidenceToolbar claimId={claimId} options={options} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <ScoreMeter score={score.score} category={score.category} size={150} />
            <div className="text-center">
              <p className="text-[11px] text-ink-muted">Rumah Sakit</p>
              <Link
                href={`/hospitals/${hospital.id}`}
                className="text-sm font-semibold text-navy-900 hover:text-brand-600"
              >
                {hospital.name}
              </Link>
              <p className="text-[11px] text-ink-muted">
                {hospital.region} • Kelas {hospital.class}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-navy-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            Ringkasan Eksekutif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-ink-soft">{evidence.summary}</p>
          <div className="rounded-lg border border-danger/25 bg-danger-soft p-3">
            <p className="text-xs font-medium leading-relaxed text-danger">{evidence.disclaimer}</p>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.key} className={section.key === "summary" ? "lg:col-span-2" : undefined}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <p className="text-xs text-ink-muted">{section.summary}</p>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {section.items.map((item, index) => (
                  <div
                    key={`${section.key}-${item.label}-${index}`}
                    className="grid gap-1 border-b border-dashed border-line pb-2 last:border-0 last:pb-0 sm:grid-cols-[190px_1fr]"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {item.label}
                    </dt>
                    <dd className="text-xs leading-relaxed text-ink-soft">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent trace */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-brand-600" />
            Multi-Agent Trace (Simulasi Arsitektur)
          </CardTitle>
          <p className="text-xs text-ink-muted">
            Arsitektur EvidenceAgentService dengan implementasi mock deterministik. Dirancang agar
            mudah diganti dengan API LLM tanpa mengubah pemanggil.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-line">
            {evidence.agentTrace.map((trace) => (
              <div key={trace.agent} className="flex flex-wrap items-start gap-3 p-4">
                <Badge variant="brand" className="shrink-0">
                  {trace.agent}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-soft">{trace.finding}</p>
                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    {trace.role} • {trace.deterministic ? "deterministik" : "non-deterministik"} •{" "}
                    {trace.durationMs} ms
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policy references */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-brand-600" />
            Referensi Aturan (RAG Lokal)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {evidence.policyRefs.map((ref) => (
            <div key={ref.docId} className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-navy-900">{ref.title}</span>
                <Badge variant={ref.available ? "teal" : "muted"}>
                  {ref.available ? "TERSEDIA" : "BELUM TERSEDIA"}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-ink-soft">{ref.excerpt}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Decisions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-brand-600" />
              Riwayat Keputusan
            </CardTitle>
            <p className="text-xs text-ink-muted">Human-in-the-loop — keputusan petugas.</p>
          </CardHeader>
          <CardContent>
            {decisions.length === 0 ? (
              <p className="rounded-lg border border-line bg-canvas/50 p-3 text-xs text-ink-muted">
                Belum ada keputusan dicatat. Petugas dapat mencatat keputusan melalui halaman Detail
                Klaim atau Daftar Periksa.
              </p>
            ) : (
              <ul className="space-y-2">
                {decisions.map((d) => (
                  <li key={d.id} className="rounded-lg border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant={
                          d.action === "DISETUJUI"
                            ? "success"
                            : d.action === "RUJUK_AUDIT"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {d.action}
                      </Badge>
                      <span className="text-[10px] text-ink-muted">{formatDateTime(d.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-ink-soft">{d.note}</p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">
                      {d.actor} • human-in-the-loop
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-brand-600" />
              Jejak Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {audit.length === 0 ? (
              <p className="text-xs text-ink-muted">Belum ada aktivitas audit untuk klaim ini.</p>
            ) : (
              <ol className="relative space-y-3 border-l border-line pl-4">
                {audit.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brand-500" />
                    <p className="text-[11px] font-medium text-navy-900">{entry.action}</p>
                    <p className="text-[10px] text-ink-muted">
                      {formatDateTime(entry.timestamp)} • {entry.actor}
                    </p>
                    <p className="text-[10px] text-ink-soft">
                      {entry.previousState} → {entry.newState}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Claim details table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600" />
            Rincian Klaim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="ID Pasien" value={claim.patientRef} />
            <DetailItem label="Layanan" value={SERVICE_LABELS[claim.serviceType]} />
            <DetailItem label="Tanggal" value={formatDateID(claim.serviceDate)} />
            <DetailItem label="Nilai" value={formatCurrency(claim.totalValue)} />
          </dl>
          <Separator className="my-4" />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy-900">Rule yang terpicu</p>
            <div className="grid gap-2 md:grid-cols-2">
              {record.ruleResults
                .filter((r) => r.triggered)
                .map((r) => (
                  <div key={r.ruleId} className="rounded-lg border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono">
                        {r.ruleId}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <SeverityBadge severity={r.severity} />
                        <Badge variant="dark">+{r.scoreImpact}</Badge>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-soft">{r.explanation}</p>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-4 text-[11px] leading-relaxed text-ink-muted">
        <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
        <p>
          Paket bukti ini dihasilkan oleh prototype dengan data sintetis. Sistem tidak menyatakan
          adanya fraud dan tidak menolak klaim secara otomatis. Keputusan akhir tetap berada pada
          petugas verifikasi manusia. {EVIDENCE_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-canvas/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className={mono ? "font-mono text-[11px] font-semibold text-navy-900" : "text-[11px] font-semibold text-navy-900"}>
        {value}
      </p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-navy-900">{value}</dd>
    </div>
  );
}
