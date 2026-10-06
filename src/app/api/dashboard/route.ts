import { jsonError, jsonOk } from "@/lib/api/validation";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repository = getRepository();
    const dashboard = await repository.getDashboard();
    return jsonOk({ ...dashboard, mode: repository.mode });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return jsonError("Gagal memuat data dashboard.", 500);
  }
}
