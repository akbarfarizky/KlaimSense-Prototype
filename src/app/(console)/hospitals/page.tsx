import Link from "next/link";
import { Building2, Hospital as HospitalIcon, MapPin } from "lucide-react";
import { PriorityBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { ScoreBar } from "@/components/shared/score-meter";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { buildHospitalList } from "@/lib/queries";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function HospitalsPage() {
  const repository = getRepository();
  const [records, hospitals] = await Promise.all([
    repository.getClaimRecords(),
    repository.getHospitals(),
  ]);

  const list = buildHospitalList(records, hospitals).sort(
    (a, b) => b.priorityScore - a.priorityScore,
  );

  const perluDitinjau = list.filter((h) => h.status === "PERLU DITINJAU").length;
  const totalBeds = list.reduce((sum, h) => sum + h.beds, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rumah Sakit"
        title="Daftar Rumah Sakit"
        description="30 rumah sakit sintetis dengan kapasitas nyata, volume klaim, dan skor prioritas rata-rata. Perbandingan peer hanya dilakukan antar rumah sakit sejenis."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Rumah Sakit"
          value={formatNumber(list.length)}
          hint="Data sintetis"
          icon={<HospitalIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Perlu Ditinjau"
          value={formatNumber(perluDitinjau)}
          hint="Memiliki klaim mencurigakan"
          icon={<Building2 className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Total Tempat Tidur"
          value={formatNumber(totalBeds)}
          hint="Kapasitas terkonfigurasi"
          icon={<MapPin className="h-4 w-4" />}
          tone="teal"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rumah Sakit</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Kepemilikan</TableHead>
                <TableHead className="text-right">TT</TableHead>
                <TableHead className="text-right">Klaim</TableHead>
                <TableHead className="text-right">Mencurigakan</TableHead>
                <TableHead>Skor Prioritas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((hospital) => (
                <TableRow key={hospital.id}>
                  <TableCell>
                    <Link
                      href={`/hospitals/${hospital.id}`}
                      className="text-xs font-semibold text-navy-900 hover:text-brand-600"
                    >
                      {hospital.name}
                    </Link>
                    <p className="font-mono text-[10px] text-ink-muted">{hospital.id}</p>
                  </TableCell>
                  <TableCell className="text-xs text-ink-soft">{hospital.region}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Kelas {hospital.class}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-ink-soft">{hospital.ownership}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{formatNumber(hospital.beds)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatNumber(hospital.claimCount)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-danger">
                    {formatNumber(hospital.suspiciousCount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ScoreBar score={hospital.priorityScore} category={hospital.priorityCategory} />
                      <PriorityBadge category={hospital.priorityCategory} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={hospital.status === "NORMAL" ? "success" : "warning"}>
                      {hospital.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="subtle" asChild>
                      <Link href={`/hospitals/${hospital.id}`}>Detail</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
