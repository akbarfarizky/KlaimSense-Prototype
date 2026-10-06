import { jsonError, jsonOk } from "@/lib/api/validation";
import { buildHospitalDetail } from "@/lib/queries";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const repository = getRepository();
    const hospital = await repository.getHospital(id);

    if (!hospital) {
      return jsonError(`Rumah sakit ${id} tidak ditemukan.`, 404);
    }

    const [records, hospitals] = await Promise.all([
      repository.getClaimRecords(),
      repository.getHospitals(),
    ]);

    const detail = buildHospitalDetail(hospital, records, hospitals);
    return jsonOk({ ...detail, mode: repository.mode });
  } catch (error) {
    console.error("[GET /api/hospitals/[id]]", error);
    return jsonError("Gagal memuat detail rumah sakit.", 500);
  }
}
