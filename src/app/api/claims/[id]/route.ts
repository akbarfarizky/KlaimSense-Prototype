import { jsonError, jsonOk } from "@/lib/api/validation";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const repository = getRepository();
    const record = await repository.getClaimRecord(id);

    if (!record) {
      return jsonError(`Klaim ${id} tidak ditemukan.`, 404);
    }

    const evidence = await repository.getEvidence(id);

    return jsonOk({
      claim: record.claim,
      hospital: record.hospital,
      ruleResults: record.ruleResults,
      score: record.score,
      case: record.case,
      evidence,
      mode: repository.mode,
    });
  } catch (error) {
    console.error("[GET /api/claims/[id]]", error);
    return jsonError("Gagal memuat detail klaim.", 500);
  }
}
