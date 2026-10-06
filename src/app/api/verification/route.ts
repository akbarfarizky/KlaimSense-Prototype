import { jsonError, jsonOk, parseFilter } from "@/lib/api/validation";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filter = parseFilter(url);
    const repository = getRepository();

    const [cases, records, decisions] = await Promise.all([
      repository.getVerificationCases(filter),
      repository.getClaimRecords(filter),
      repository.getDecisions(),
    ]);

    const recordByClaim = new Map(records.map((r) => [r.claim.id, r]));

    const data = cases.map((verificationCase) => {
      const record = recordByClaim.get(verificationCase.claimId);
      return {
        ...verificationCase,
        hospitalName: record?.hospital.name ?? "-",
        hospitalId: record?.hospital.id ?? verificationCase.hospitalId,
        serviceType: record?.claim.serviceType ?? "-",
        serviceDate: record?.claim.serviceDate ?? "-",
        value: record?.claim.totalValue ?? 0,
        patientRef: record?.claim.patientRef ?? "-",
      };
    });

    return jsonOk({ cases: data, total: data.length, decisions, mode: repository.mode });
  } catch (error) {
    console.error("[GET /api/verification]", error);
    return jsonError("Gagal memuat daftar verifikasi.", 500);
  }
}
