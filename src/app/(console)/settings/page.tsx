import {
  AlertTriangle,
  Bot,
  Brain,
  Cpu,
  Database,
  FileText,
  Gauge,
  Info,
  Layers,
  Lock,
  Scale,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DEMO_BANNER_TEXT,
  PROTOTYPE_LIMITATIONS,
  SERVICE_LABELS,
} from "@/lib/constants";
import {
  DIALYSIS_SHIFTS_PER_DAY,
  MAX_PRIORITY_SCORE,
  PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
  POLICY_DOCUMENTS,
  PRIORITY_BANDS,
  REFERENCE_PRICES,
  REPLACEMENT_PERIOD_YEARS,
  RULE_DEFINITIONS,
  RULE_SCORE_WEIGHTS,
} from "@/lib/reference-data";
import { formatCurrency } from "@/lib/format";
import { getRepository } from "@/lib/repositories";
import type { ServiceType } from "@/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const repository = getRepository();
  const [hospitals, claims] = await Promise.all([
    repository.getHospitals(),
    repository.getClaims(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">Pengaturan</p>
        <h1 className="text-xl font-bold tracking-tight text-navy-900 md:text-2xl">
          Sistem &amp; Keterbatasan Prototype
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">
          Informasi konfigurasi sistem, mode data, dan keterbatasan prototype yang harus
          ditransparansikan kepada pengguna dan juri.
        </p>
      </div>

      <Card className="border-accent-yellow/50 bg-accent-yellow/10">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">{DEMO_BANNER_TEXT}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
              Prototype ini menggunakan data sintetis yang dibangkitkan dengan seed tetap agar dapat
              direproduksi. Tidak ada data pasien, nomor BPJS, atau rumah sakit nyata yang digunakan.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-teal-600" />
              Mode Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-line p-3">
              <span className="text-xs text-ink-soft">Repository aktif</span>
              <Badge variant={repository.mode === "postgres" ? "teal" : "brand"}>
                {repository.mode === "postgres" ? "POSTGRESQL" : "MOCK (IN-MEMORY)"}
              </Badge>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-muted">
              Aplikasi berjalan penuh tanpa PostgreSQL. Bila variabel <code>DATABASE_URL</code> tidak
              tersedia, sistem otomatis menggunakan mock repository in-memory. UI tidak berubah antara
              kedua mode karena keduanya mengimplementasikan antarmuka repository yang sama.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-canvas/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">Rumah sakit</p>
                <p className="text-lg font-bold text-navy-900">{hospitals.length}</p>
              </div>
              <div className="rounded-lg border border-line bg-canvas/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">Klaim sintetis</p>
                <p className="text-lg font-bold text-navy-900">{claims.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-brand-600" />
              Konfigurasi Rule Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ConfigRow label="Total rule aktif" value={`${RULE_DEFINITIONS.length} rule`} />
            <ConfigRow label="Skor maksimum" value={`${MAX_PRIORITY_SCORE} poin`} />
            <ConfigRow
              label="Band prioritas"
              value={PRIORITY_BANDS.map((b) => `${b.category} ${b.min}-${b.max}`).join(" • ")}
            />
            <ConfigRow
              label="Bobot kapasitas"
              value={`+${RULE_SCORE_WEIGHTS.CAP_VIOLATION}`}
            />
            <ConfigRow label="Bobot duplikasi" value={`+${RULE_SCORE_WEIGHTS.DUPLICATE}`} />
            <ConfigRow
              label="Bobot harga di atas acuan"
              value={`+${RULE_SCORE_WEIGHTS.PRICE_ABOVE_REFERENCE}`}
            />
            <ConfigRow
              label="Bobot masa penggantian"
              value={`+${RULE_SCORE_WEIGHTS.REPLACEMENT_VIOLATION}`}
            />
            <ConfigRow label="Bobot anomali peer" value={`+${RULE_SCORE_WEIGHTS.PEER_ANOMALY}`} />
            <ConfigRow label="Bobot ketidaksesuaian IoT" value={`+${RULE_SCORE_WEIGHTS.IOT_MISMATCH}`} />
            <Separator className="my-2" />
            <ConfigRow
              label="Sesi fisioterapi / fisioterapis / hari"
              value={String(PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY)}
            />
            <ConfigRow
              label="Shift cuci darah / hari"
              value={String(DIALYSIS_SHIFTS_PER_DAY)}
            />
            <ConfigRow
              label="Masa penggantian alat bantu dengar"
              value={`${REPLACEMENT_PERIOD_YEARS.ALAT_BANTU_DENGAR} tahun`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-brand-600" />
            Tarif Acuan Sintetis
          </CardTitle>
          <p className="text-xs text-ink-muted">
            Nilai ini BUKAN tarif resmi. Digunakan hanya untuk mendemonstrasikan pemeriksaan
            kewajaran harga.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(REFERENCE_PRICES) as ServiceType[]).map((service) => (
              <div key={service} className="rounded-lg border border-line bg-canvas/40 p-3">
                <p className="text-[11px] font-medium text-ink-muted">{SERVICE_LABELS[service]}</p>
                <p className="mt-0.5 text-sm font-bold text-navy-900">
                  {formatCurrency(REFERENCE_PRICES[service])}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-500" />
            Keterbatasan yang Harus Ditampilkan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {PROTOTYPE_LIMITATIONS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 rounded-lg border border-line p-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="text-xs leading-relaxed text-ink-soft">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-600" />
              Komponen Simulasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <SimulationRow
              icon={<Cpu className="h-3.5 w-3.5" />}
              label="IoT"
              status="Simulasi"
              detail="Telemetri mesin dibangkitkan sintetis, bukan koneksi perangkat nyata."
            />
            <SimulationRow
              icon={<Brain className="h-3.5 w-3.5" />}
              label="Edge AI"
              status="Simulasi"
              detail="Klasifikasi deterministik dari arus/daya, bukan model terlatih tervalidasi."
            />
            <SimulationRow
              icon={<Bot className="h-3.5 w-3.5" />}
              label="Multi-Agent AI"
              status="Simulasi arsitektur"
              detail="EvidenceAgentService dengan implementasi mock, siap diganti API LLM."
            />
            <SimulationRow
              icon={<FileText className="h-3.5 w-3.5" />}
              label="RAG"
              status="Knowledge base lokal"
              detail="Pencarian kata kunci pada korpus prototype, bukan korpus peraturan resmi lengkap."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              Prinsip Human-in-the-Loop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <PrincipleRow
              icon={<UserCheck className="h-3.5 w-3.5" />}
              text="Sistem hanya memberikan indikasi, bukti, dan skor prioritas."
            />
            <PrincipleRow
              icon={<Lock className="h-3.5 w-3.5" />}
              text="Sistem tidak dapat menolak klaim secara otomatis."
            />
            <PrincipleRow
              icon={<Scale className="h-3.5 w-3.5" />}
              text="Sistem tidak memutuskan bahwa rumah sakit melakukan fraud."
            />
            <PrincipleRow
              icon={<UserCheck className="h-3.5 w-3.5" />}
              text="Keputusan akhir tetap dilakukan oleh petugas BPJS."
            />
            <PrincipleRow
              icon={<SettingsIcon className="h-3.5 w-3.5" />}
              text="Semua tindakan tercatat pada audit log dan dapat diaudit."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-600" />
            Dokumen Referensi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {POLICY_DOCUMENTS.map((doc) => (
              <div key={doc.docId} className="flex items-center justify-between rounded-lg border border-line p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-navy-900">{doc.title}</p>
                  <p className="text-[10px] text-ink-muted">
                    {doc.issuer} • {doc.year}
                  </p>
                </div>
                <Badge variant={doc.available ? "teal" : "muted"}>
                  {doc.available ? "TERSEDIA" : "BELUM TERSEDIA"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-line pb-2 last:border-0">
      <span className="text-[11px] text-ink-muted">{label}</span>
      <span className="text-right text-[11px] font-semibold text-navy-900">{value}</span>
    </div>
  );
}

function SimulationRow({
  icon,
  label,
  status,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-navy-900">
          <span className="text-ink-muted">{icon}</span>
          {label}
        </span>
        <Badge variant="warning">{status}</Badge>
      </div>
      <p className="mt-1 text-[11px] text-ink-soft">{detail}</p>
    </div>
  );
}

function PrincipleRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-success-soft/60 p-3">
      <span className="mt-0.5 text-success">{icon}</span>
      <span className="text-[11px] leading-relaxed text-ink-soft">{text}</span>
    </div>
  );
}
