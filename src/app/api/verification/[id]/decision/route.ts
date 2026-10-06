import { decisionSchema, jsonError, jsonOk } from "@/lib/api/validation";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Body JSON tidak valid.", 400);
    }

    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validasi input gagal.", 422, parsed.error.flatten());
    }

    const repository = getRepository();
    const claim = await repository.getClaim(id);
    if (!claim) {
      return jsonError(`Klaim ${id} tidak ditemukan.`, 404);
    }

    const result = await repository.submitDecision(id, parsed.data);
    if (!result) {
      return jsonError(
        `Kasus verifikasi untuk klaim ${id} belum tersedia. Klaim ini belum masuk daftar periksa.`,
        409,
      );
    }

    return jsonOk(
      {
        case: result.case,
        decision: result.decision,
        audit: result.audit,
        humanInTheLoop: true,
        note: "Keputusan dicatat sebagai tindakan petugas manusia, bukan keputusan otomatis sistem.",
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/verification/[id]/decision]", error);
    return jsonError("Gagal menyimpan keputusan.", 500);
  }
}
