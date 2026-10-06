import { AlertTriangle, Info, ScrollText, ShieldAlert } from "lucide-react";
import { AuditTable } from "@/components/audit/audit-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const repository = getRepository();
  const entries = await repository.getAuditLog();

  const info = entries.filter((e) => e.severity === "info").length;
  const warning = entries.filter((e) => e.severity === "warning").length;
  const critical = entries.filter((e) => e.severity === "critical").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit Log"
        title="Jejak Audit Sistem"
        description="Seluruh tindakan sistem dan petugas tercatat: deteksi rule, pembuatan skor, penyusunan bukti, pembukaan klaim, permintaan klarifikasi, dan keputusan."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Entri"
          value={formatNumber(entries.length)}
          hint="Seluruh aktivitas tercatat"
          icon={<ScrollText className="h-4 w-4" />}
        />
        <StatCard
          label="Info"
          value={formatNumber(info)}
          hint="Aktivitas normal"
          icon={<Info className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Warning"
          value={formatNumber(warning)}
          hint="Rule terpicu / tindak lanjut"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Critical"
          value={formatNumber(critical)}
          hint="Perlu perhatian segera"
          icon={<ShieldAlert className="h-4 w-4" />}
          tone="danger"
        />
      </div>

      <Card className="border-navy-200">
        <CardContent className="p-4 text-xs leading-relaxed text-ink-soft">
          <strong className="text-navy-900">Field audit:</strong> timestamp, actor, action, object,
          previousState, newState. Setiap keputusan petugas tercatat dengan status sebelum dan
          sesudah, sehingga proses verifikasi dapat diaudit sepenuhnya.
        </CardContent>
      </Card>

      <AuditTable entries={entries} />
    </div>
  );
}
