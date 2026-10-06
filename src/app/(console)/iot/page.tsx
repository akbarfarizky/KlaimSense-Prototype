import Link from "next/link";
import { AlertTriangle, Info, Radio } from "lucide-react";
import { IotConsole } from "@/components/iot/iot-console";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { DEMO_HOSPITAL_ID } from "@/lib/constants";
import { edgeAiSummary } from "@/lib/iot";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function IotPage({
  searchParams,
}: {
  searchParams: Promise<{ hospital?: string; period?: string }>;
}) {
  const { hospital: hospitalParam, period: periodParam } = await searchParams;
  const repository = getRepository();

  const hospitals = await repository.getHospitals();
  const hospitalId = hospitalParam ?? DEMO_HOSPITAL_ID;
  const hospital = (await repository.getHospital(hospitalId)) ?? hospitals[0];

  const allEvents = await repository.getSensorEvents(hospital.id);
  const availablePeriods = Array.from(new Set(allEvents.map((e) => e.periodDate))).sort();
  const periodDate = periodParam ?? availablePeriods.at(-1) ?? "";

  const [machines, claims] = await Promise.all([
    repository.getMachineTelemetry(hospital.id, periodDate),
    repository.getClaims({ hospitalId: hospital.id, dateFrom: periodDate, dateTo: periodDate }),
  ]);

  const edgeAi = edgeAiSummary(machines);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monitoring IoT"
        title="Monitoring Mesin & Simulasi Edge AI"
        description="Simulasi telemetri mesin cuci darah: status, konsumsi daya, arus, timestamp, dan status tanda tangan digital. Digunakan untuk membandingkan klaim dengan aktivitas mesin."
        actions={
          <div className="flex items-center gap-2">
            <form action="/iot" method="get" className="flex items-center gap-2">
              <Select
                name="hospital"
                defaultValue={hospital.id}
                className="w-[220px]"
                aria-label="Pilih rumah sakit"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="outline" size="sm">
                Tampilkan
              </Button>
            </form>
          </div>
        }
      />

      <Card className="border-accent-yellow/50 bg-accent-yellow/10">
        <CardContent className="flex flex-wrap items-start gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-900">
            <strong>Simulasi prototype.</strong> Seluruh nilai pada halaman ini dihasilkan secara
            sintetis. IoT masih berupa simulasi dan Edge AI masih berupa simulasi klasifikasi.
            Bukan koneksi perangkat nyata dan bukan validasi klinis.
          </p>
        </CardContent>
      </Card>

      <IotConsole
        hospitalId={hospital.id}
        hospitalName={hospital.name}
        hospitalClass={hospital.class}
        periodDate={periodDate}
        initialMachines={machines}
        availablePeriods={availablePeriods}
        claimsOnPeriod={claims.length}
        edgeAi={edgeAi}
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-2">
            <Radio className="mt-0.5 h-4 w-4 text-brand-600" />
            <p className="text-xs text-ink-soft">
              Mesin OFFLINE/STANDBY pada periode yang memiliki klaim merupakan{" "}
              <strong>potensi ketidaksesuaian</strong> yang perlu diperiksa petugas.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/hospitals/${hospital.id}`}>Profil Rumah Sakit</Link>
            </Button>
            <Button variant="subtle" size="sm" asChild>
              <Link href="/claims?service=HEMODIALISIS">Lihat Klaim Hemodialisis</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-[11px] text-ink-muted">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        Sistem tidak menyatakan klaim ini pasti fraud. Simulasi sensor hanya menyediakan indikasi
        untuk membantu petugas melakukan verifikasi.
      </div>
    </div>
  );
}
