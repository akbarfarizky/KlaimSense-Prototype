import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  FileWarning,
  Percent,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  CategoryDistributionChart,
  ClaimTrendChart,
  PriorityDistributionChart,
  SuspiciousPerDayChart,
  TopRulesChart,
} from "@/components/charts";
import { DemoRunner } from "@/components/demo/demo-runner";
import { PriorityBadge, StatusBadge } from "@/components/shared/badges";
import { PageHeader, SectionTitle } from "@/components/shared/page-header";
import { ScoreBar } from "@/components/shared/score-meter";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_NARRATIVE, getDemoStatus } from "@/lib/demo";
import { formatCompactCurrency, formatDateShort, formatNumber } from "@/lib/format";
import { getRepository } from "@/lib/repositories";
import { SERVICE_SHORT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const repository = getRepository();
  const [records, dashboard] = await Promise.all([
    repository.getClaimRecords(),
    repository.getDashboard(),
  ]);

  const { kpi } = dashboard;
  const topQueue = records
    .filter((r) => r.score.score >= 30)
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 6);

  const demoStatus = getDemoStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard Verifikasi Klaim"
        description="Ringkasan indikasi ketidaksesuaian klaim berdasarkan kapasitas nyata, kewajaran harga, duplikasi, dan pola rumah sakit sejenis. Semua angka bersumber dari data sintetis."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/verification">
                <ClipboardList className="h-3.5 w-3.5" />
                Daftar Periksa
              </Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/evidence">
                Evidence Center
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Total Klaim"
          value={formatNumber(kpi.totalClaims)}
          hint="Periode 30 hari terakhir"
          icon={<ClipboardList className="h-4 w-4" />}
          tone="navy"
        />
        <StatCard
          label="Klaim Mencurigakan"
          value={formatNumber(kpi.suspiciousClaims)}
          hint={`Skor ≥ 30 dari 100`}
          icon={<FileWarning className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Prioritas Tinggi"
          value={formatNumber(kpi.highPriorityClaims)}
          hint="HIGH & CRITICAL"
          icon={<ShieldAlert className="h-4 w-4" />}
          tone="danger"
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={formatNumber(kpi.awaitingVerification)}
          hint="Baru / dalam pemeriksaan"
          icon={<Activity className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Potensi Nilai Ditinjau"
          value={formatCompactCurrency(kpi.potentialValueUnderReview)}
          hint="Nilai klaim mencurigakan"
          icon={<Wallet className="h-4 w-4" />}
          tone="teal"
        />
        <StatCard
          label="Tingkat Deteksi"
          value={`${kpi.detectionRate}%`}
          hint="Proporsi klaim ditandai"
          icon={<Percent className="h-4 w-4" />}
          tone="warning"
        />
      </section>

      <DemoRunner
        initial={demoStatus}
        narrative={{
          hospital: DEMO_NARRATIVE.hospital,
          fisioterapi: DEMO_NARRATIVE.fisioterapi,
          hemodialisis: DEMO_NARRATIVE.hemodialisis,
          iot: DEMO_NARRATIVE.iot,
        }}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle description="14 hari terakhir — total vs klaim mencurigakan">
              Tren Klaim
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <ClaimTrendChart data={dashboard.claimTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle description="Distribusi klaim per jenis layanan">
              Klaim Berdasarkan Kategori Layanan
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <CategoryDistributionChart data={dashboard.categoryDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle description="Jumlah klaim per band prioritas rumah sakit">
              Distribusi Prioritas Rumah Sakit
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <PriorityDistributionChart data={dashboard.priorityDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle description="Klaim mencurigakan per hari">
              Klaim Mencurigakan per Hari
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <SuspiciousPerDayChart data={dashboard.suspiciousPerDay} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionTitle description="Aturan yang paling sering terpicu pada seluruh klaim">
              Rule yang Paling Sering Terpicu
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <TopRulesChart data={dashboard.topRules} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <SectionTitle description="Klaim dengan skor prioritas tertinggi untuk diperiksa petugas">
            Antrean Prioritas Tertinggi
          </SectionTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/verification">
              Lihat semua
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
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
              {topQueue.map((record) => (
                <TableRow key={record.claim.id}>
                  <TableCell>
                    <PriorityBadge category={record.score.category} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs font-medium text-navy-900">
                    {record.hospital.name}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-ink-soft">
                    {record.claim.id}
                  </TableCell>
                  <TableCell className="text-xs">
                    {SERVICE_SHORT[record.claim.serviceType]}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-ink-soft">
                    {formatDateShort(record.claim.serviceDate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs font-medium tabular-nums">
                    {formatCompactCurrency(record.claim.totalValue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {record.score.breakdown.slice(0, 3).map((b) => (
                        <Badge key={b.ruleId} variant="outline" className="font-mono">
                          {b.ruleId}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ScoreBar score={record.score.score} category={record.score.category} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.case?.status ?? "BARU"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="subtle" asChild>
                      <Link href={`/claims/${record.claim.id}`}>Periksa</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {topQueue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-sm text-ink-muted">
                    Belum ada klaim dengan skor prioritas di atas ambang.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Separator />
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-[11px] text-ink-muted">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Skor prioritas bersifat indikatif untuk triase petugas, bukan penilaian fraud. Keputusan
          akhir berada pada petugas verifikasi manusia.
        </div>
      </Card>
    </div>
  );
}
