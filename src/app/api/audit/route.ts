import { jsonError, jsonOk } from "@/lib/api/validation";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repository = getRepository();
    const audit = await repository.getAuditLog();
    return jsonOk({ audit, total: audit.length, mode: repository.mode });
  } catch (error) {
    console.error("[GET /api/audit]", error);
    return jsonError("Gagal memuat audit log.", 500);
  }
}
