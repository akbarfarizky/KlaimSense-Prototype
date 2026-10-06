import { AlertTriangle, ClipboardCheck, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { VerificationTable, type VerificationRow } from "@/components/verification/verification-table";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const repository = getRepository();
  const [records, hospitals] = await Promise.all([
    repository.getClaimRecords(),
    repository.getHospitals(),
  ]);

  const rows: VerificationRow[] = records
    .filter((r) => r.case !== null)
    .map((r) => ({
      claimId: r.claim.id,
      hospitalId: r.hospital.id,
      hospitalName: r.hospital.name,
      patientRef: r.claim.patientRef,
      serviceType: r.claim.serviceType,
      serviceDate: r.claim.serviceDate,
      value: r.claim.totalValue,
      triggers: r.case?.triggers ?? [],
      score: r.score.score,
      category: r.score.category,
      status: r.case?.status ?? "BARU",
    }))
    .sort((a, b) => b.score - a.score);

  const baru = rows.filter((r) => r.status === "BARU").length;
  const dalamPemeriksaan = rows.filter((r) => r.status === "DALAM_PEMERIKSAAN").length;
  const klarifikasi = rows.filter((r) => r.status === "MEMBUTUHKAN_KLARIFIKASI").length;
  const rujukAudit = rows.filter((r) => r.status === "RUJUK_AUDIT").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daftar Periksa"
        title="Daftar Periksa Petugas"
        description="Antrean klaim yang perlu diperiksa manusia. Sistem hanya menandai indikasi dan menyediakan bukti; keputusan tetap dilakukan oleh petugas BPJS."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Kasus Baru"
          value={formatNumber(baru)}
          hint="Belum ditindaklanjuti"
          icon={<ClipboardCheck className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Dalam Pemeriksaan"
          value={formatNumber(dalamPemeriksaan)}
          hint="Sedang ditinjau petugas"
          icon={<Info className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Butuh Klarifikasi"
          value={formatNumber(klarifikasi)}
          hint="Menunggu respons faskes"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Rujuk Audit"
          value={formatNumber(rujukAudit)}
          hint="Diteruskan ke tim audit"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="danger"
        />
      </div>

      <Card className="border-accent-yellow/50 bg-accent-yellow/10">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-900">
            <strong>Human-in-the-loop.</strong> Sistem tidak boleh dan tidak dapat menolak klaim
            secara otomatis. Tombol keputusan di bawah hanya mencatat tindakan petugas manusia, dan
            setiap keputusan tercatat pada audit log.
          </p>
        </CardContent>
      </Card>

      <VerificationTable
        rows={rows}
        hospitals={hospitals.map((h) => ({ id: h.id, name: h.name }))}
      />
    </div>
  );
}
