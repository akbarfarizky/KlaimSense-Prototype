import { jsonError, jsonOk } from "@/lib/api/validation";
import { edgeAiSummary } from "@/lib/iot";
import { getStore } from "@/lib/repositories/store";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const hospitalId = url.searchParams.get("hospitalId") ?? "RS-H-001";
    const repository = getRepository();

    const hospital = await repository.getHospital(hospitalId);
    if (!hospital) {
      return jsonError(`Rumah sakit ${hospitalId} tidak ditemukan.`, 404);
    }

    const allEvents = await repository.getSensorEvents(hospitalId);
    const periodDate =
      url.searchParams.get("periodDate") ??
      allEvents.map((e) => e.periodDate).sort().at(-1) ??
      "";

    const [machines, claims] = await Promise.all([
      repository.getMachineTelemetry(hospitalId, periodDate),
      repository.getClaims({ hospitalId, dateFrom: periodDate, dateTo: periodDate }),
    ]);

    const summary = edgeAiSummary(machines);
    const anomalous = machines.filter((m) => m.status !== "THERAPY");
    const claimsOnPeriod = claims.length;

    return jsonOk({
      hospital: { id: hospital.id, name: hospital.name, class: hospital.class },
      periodDate,
      machines,
      edgeAi: summary,
      availablePeriods: Array.from(new Set(allEvents.map((e) => e.periodDate))).sort(),
      claimsOnPeriod,
      inconsistency:
        anomalous.length > 0 && claimsOnPeriod > 0
          ? {
              detected: true,
              message:
                "Potensi ketidaksesuaian klaim dengan data sensor. Perlu pemeriksaan lebih lanjut, bukan kesimpulan fraud.",
              machines: anomalous.map((m) => ({ machineId: m.machineId, status: m.status })),
            }
          : {
              detected: false,
              message: "Tidak ditemukan ketidaksesuaian klaim dengan data sensor pada periode ini.",
              machines: [],
            },
      mode: repository.mode,
      limitation: "IoT masih berupa simulasi. Nilai simulasi prototype, bukan validasi data nyata.",
      policies: getStore().policies.length,
    });
  } catch (error) {
    console.error("[GET /api/iot]", error);
    return jsonError("Gagal memuat data IoT.", 500);
  }
}
