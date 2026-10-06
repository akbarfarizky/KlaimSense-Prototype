import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BedDouble,
  Building2,
  Cpu,
  Gauge,
  Radio,
  Stethoscope,
  Users,
} from "lucide-react";
import { CapacityComparisonChart, ClaimTrendChart } from "@/components/charts";
import { MachineStatusBadge, PriorityBadge } from "@/components/shared/badges";
import { PageHeader, SectionTitle } from "@/components/shared/page-header";
import { ScoreBar, ScoreMeter } from "@/components/shared/score-meter";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SERVICE_SHORT } from "@/lib/constants";
import { formatCompactCurrency, formatDateShort, formatNumber } from "@/lib/format";
import { buildHospitalDetail } from "@/lib/queries";
import { getRepository } from "@/lib/repositories";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repository = getRepository();
  const hospital = await repository.getHospital(id);
  if (!hospital) notFound();

  const [records, hospitals] = await Promise.all([
    repository.getClaimRecords(),
    repository.getHospitals(),
  ]);
  const detail = buildHospitalDetail(hospital, records, hospitals);
  const { summary } = detail;

  const capacityChartData = detail.capacity
    .filter((c) => c.claimed30d > 0 || c.capacity > 0)
    .slice(0, 2)
    .map((c) => ({ label: c.service, kapasitas: c.capacity, klaim: c.claimed30d }));

  const anomalousMachines = detail.machines.filter((m) => m.status !== "THERAPY");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hospitals">
            <ArrowLeft className="h-3.5 w-3.5" />
            Daftar Rumah Sakit
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/claims?hospital=${hospital.id}`}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            Lihat Klaim
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={`${hospital.region} • Kelas ${hospital.class} • ${hospital.ownership}`}
        title={hospital.name}
        description={`Profil kapasitas, tren klaim, pelanggaran aturan, status IoT, dan perbandingan peer untuk ${hospital.id}.`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={summary.status === "NORMAL" ? "success" : "warning"}>
              {summary.status}
            </Badge>
            <PriorityBadge category={summary.priorityCategory} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tempat Tidur"
          value={formatNumber(hospital.beds)}
          hint="Kapasitas terkonfigurasi"
          icon={<BedDouble className="h-4 w-4" />}
        />
        <StatCard
          label="Dokter"
          value={formatNumber(hospital.doctors)}
          hint="Tenaga medis (sintetis)"
          icon={<Stethoscope className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Klaim"
          value={formatNumber(summary.claimCount)}
          hint={`${summary.suspiciousCount} mencurigakan`}
          icon={<Building2 className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Skor Prioritas"
          value={`${summary.priorityScore}/100`}
          hint="Rata-rata klaim rumah sakit"
          icon={<Gauge className="h-4 w-4" />}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <SectionTitle description="Kapasitas 30 hari vs volume klaim terdaftar">
              Kapasitas vs Klaim
            </SectionTitle>
          </CardHeader>
          <CardContent>
            <CapacityComparisonChart data={capacityChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle>Skor Prioritas Rumah Sakit</SectionTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ScoreMeter
              score={summary.priorityScore}
              category={summary.priorityCategory}
              size={150}
              label="RATA-RATA KLaim"
            />
            <div className="w-full space-y-2">
              <CapacityLine
                icon={<Users className="h-3.5 w-3.5" />}
                label="Fisioterapis"
                value={`${hospital.physiotherapists} orang`}
              />
              <CapacityLine
                icon={<Activity className="h-3.5 w-3.5" />}
                label="Mesin cuci darah"
                value={`${hospital.dialysisMachines} unit`}
              />
              <CapacityLine
                icon={<Gauge className="h-3.5 w-3.5" />}
                label="Kapasitas fisioterapi"
                value={`${hospital.dailyCapacity.fisioterapi} sesi/hari`}
              />
              <CapacityLine
                icon={<Gauge className="h-3.5 w-3.5" />}
                label="Kapasitas hemodialisis"
                value={`${hospital.dailyCapacity.hemodialisis} sesi/hari`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle description="14 hari terakhir">Tren Klaim</SectionTitle>
          </CardHeader>
          <CardContent>
            <ClaimTrendChart data={detail.claimTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle description="Utilisasi terhadap kapasitas 30 hari">
              Utilisasi Kapasitas
            </SectionTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.capacity.map((c) => (
              <div key={c.service} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-navy-900">{c.service}</span>
                  <span className={cn("tabular-nums", c.utilisation > 100 ? "font-semibold text-danger" : "text-ink-muted")}>
                    {formatNumber(c.claimed30d)} / {formatNumber(c.capacity)} {c.unit} ({c.utilisation}%)
                  </span>
                </div>
                <Progress
                  value={Math.min(100, c.utilisation)}
                  indicatorClassName={c.utilisation > 100 ? "bg-danger" : c.utilisation > 70 ? "bg-warning" : "bg-teal-500"}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle description="Perbandingan hanya dengan rumah sakit kelas dan layanan sejenis">
              Perbandingan Peer
            </SectionTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Peer Group</TableHead>
                  <TableHead className="text-right">Intensitas RS</TableHead>
                  <TableHead className="text-right">Median Peer</TableHead>
                  <TableHead className="text-right">Jumlah Peer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.peerComparison.map((p) => {
                  const above = p.peerMedian > 0 && p.hospitalValue > p.peerMedian * 1.5;
                  return (
                    <TableRow key={p.metric}>
                      <TableCell className="text-xs font-medium">{p.metric}</TableCell>
                      <TableCell className="text-[11px] text-ink-muted">{p.peerGroup}</TableCell>
                      <TableCell className={cn("text-right text-xs tabular-nums", above && "font-semibold text-danger")}>
                        {p.hospitalValue.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-ink-muted">
                        {p.peerMedian.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-ink-muted">
                        {p.peerCount}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle description="Simulasi telemetri mesin cuci darah periode terakhir">
              Status IoT
            </SectionTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalousMachines.length > 0 && (
              <p className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-[11px] text-amber-900">
                Potensi ketidaksesuaian: {anomalousMachines.length} mesin tidak aktif pada periode
                dengan klaim.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {detail.machines.map((m) => (
                <div key={m.machineId} className="rounded-lg border border-line p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold">{m.machineId}</span>
                    <Cpu className="h-3 w-3 text-ink-muted" />
                  </div>
                  <div className="mt-1.5">
                    <MachineStatusBadge status={m.status} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-ink-muted tabular-nums">
                    {formatNumber(m.powerWatts)} W • {m.currentAmps.toFixed(2)} A
                  </p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/iot?hospital=${hospital.id}`}>
                <Radio className="h-3.5 w-3.5" />
                Buka Monitoring IoT
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <SectionTitle description="Klaim dengan skor prioritas tertinggi di rumah sakit ini">
            Klaim Mencurigakan
          </SectionTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Pemicu</TableHead>
                <TableHead>Skor</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.suspiciousClaims.map((r) => (
                <TableRow key={r.claim.id}>
                  <TableCell className="font-mono text-[11px]">{r.claim.id}</TableCell>
                  <TableCell className="text-xs">{SERVICE_SHORT[r.claim.serviceType]}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-ink-soft">
                    {formatDateShort(r.claim.serviceDate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums">
                    {formatCompactCurrency(r.claim.totalValue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.ruleResults
                        .filter((x) => x.triggered)
                        .slice(0, 3)
                        .map((x) => (
                          <Badge key={x.ruleId} variant="outline" className="font-mono">
                            {x.ruleId}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ScoreBar score={r.score.score} category={r.score.category} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="subtle" asChild>
                      <Link href={`/claims/${r.claim.id}`}>Periksa</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {detail.suspiciousClaims.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-ink-muted">
                    Tidak ada klaim mencurigakan di rumah sakit ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CapacityLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-canvas/40 px-3 py-2">
      <span className="flex items-center gap-2 text-[11px] text-ink-muted">
        {icon}
        {label}
      </span>
      <span className="text-xs font-semibold text-navy-900">{value}</span>
    </div>
  );
}
