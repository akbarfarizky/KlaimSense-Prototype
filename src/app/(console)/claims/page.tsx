import { FileText, FileWarning, Wallet } from "lucide-react";
import { ClaimsTable, type ClaimRow } from "@/components/claims/claims-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCompactCurrency, formatNumber } from "@/lib/format";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const repository = getRepository();
  const [records, hospitals] = await Promise.all([
    repository.getClaimRecords(),
    repository.getHospitals(),
  ]);

  const rows: ClaimRow[] = records.map((r) => ({
    id: r.claim.id,
    hospitalId: r.hospital.id,
    hospitalName: r.hospital.name,
    patientRef: r.claim.patientRef,
    serviceType: r.claim.serviceType,
    serviceDate: r.claim.serviceDate,
    quantity: r.claim.quantity,
    totalValue: r.claim.totalValue,
    triggers: r.ruleResults.filter((x) => x.triggered).map((x) => x.ruleId),
    score: r.score.score,
    category: r.score.category,
    status: r.case?.status ?? "BARU",
  }));

  const suspicious = rows.filter((r) => r.score >= 30);
  const totalValue = rows.reduce((sum, r) => sum + r.totalValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Klaim"
        title="Semua Klaim"
        description="Katalog klaim sintetis dengan pencarian dan filter berdasarkan rumah sakit, layanan, tanggal, status, dan prioritas. Klik klaim untuk membuka detail verifikasi."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Klaim"
          value={formatNumber(rows.length)}
          hint="Seluruh rumah sakit (sintetis)"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Klaim Mencurigakan"
          value={formatNumber(suspicious.length)}
          hint="Skor prioritas ≥ 30"
          icon={<FileWarning className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Total Nilai Klaim"
          value={formatCompactCurrency(totalValue)}
          hint="Data sintetis, bukan nilai riil"
          icon={<Wallet className="h-4 w-4" />}
          tone="teal"
        />
      </div>

      <ClaimsTable rows={rows} hospitals={hospitals.map((h) => ({ id: h.id, name: h.name }))} />
    </div>
  );
}
