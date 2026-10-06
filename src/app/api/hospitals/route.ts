import { jsonError, jsonOk } from "@/lib/api/validation";
import { SUSPICIOUS_SCORE_THRESHOLD } from "@/lib/repositories/store";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repository = getRepository();
    const [hospitals, records] = await Promise.all([
      repository.getHospitals(),
      repository.getClaimRecords(),
    ]);

    const data = hospitals.map((hospital) => {
      const hospitalRecords = records.filter((r) => r.claim.hospitalId === hospital.id);
      const suspicious = hospitalRecords.filter(
        (r) => r.score.score >= SUSPICIOUS_SCORE_THRESHOLD,
      );
      const score =
        hospitalRecords.length > 0
          ? Math.round(
              hospitalRecords.reduce((sum, r) => sum + r.score.score, 0) / hospitalRecords.length,
            )
          : 0;
      const category =
        score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

      return {
        ...hospital,
        claimCount: hospitalRecords.length,
        suspiciousCount: suspicious.length,
        priorityScore: score,
        priorityCategory: category,
        status: suspicious.length > 0 ? "PERLU DITINJAU" : "NORMAL",
      };
    });

    return jsonOk({ hospitals: data, total: data.length, mode: repository.mode });
  } catch (error) {
    console.error("[GET /api/hospitals]", error);
    return jsonError("Gagal memuat daftar rumah sakit.", 500);
  }
}
