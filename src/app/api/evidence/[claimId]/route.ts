import { jsonError, jsonOk } from "@/lib/api/validation";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  try {
    const { claimId } = await params;
    const repository = getRepository();

    const record = await repository.getClaimRecord(claimId);
    if (!record) {
      return jsonError(`Klaim ${claimId} tidak ditemukan.`, 404);
    }

    const evidence = await repository.getEvidence(claimId);
    if (!evidence) {
      return jsonError(`Paket bukti untuk klaim ${claimId} belum tersedia.`, 404);
    }

    return jsonOk({
      evidence,
      claim: record.claim,
      hospital: record.hospital,
      score: record.score,
      case: record.case,
      mode: repository.mode,
    });
  } catch (error) {
    console.error("[GET /api/evidence/[claimId]]", error);
    return jsonError("Gagal memuat paket bukti.", 500);
  }
}
