import { jsonError, jsonOk, simulateSchema } from "@/lib/api/validation";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Body JSON tidak valid.", 400);
    }

    const parsed = simulateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validasi input simulasi gagal.", 422, parsed.error.flatten());
    }

    const { hospitalId, periodDate, machineId, action } = parsed.data;
    const repository = getRepository();

    const updated = await repository.simulateMachine(hospitalId, periodDate, machineId, action);
    if (!updated) {
      return jsonError(`Mesin ${machineId} tidak ditemukan pada periode ${periodDate}.`, 404);
    }

    return jsonOk({
      machine: updated,
      note: "Simulasi telemetri prototype. Bukan data perangkat nyata.",
    });
  } catch (error) {
    console.error("[POST /api/iot/simulate]", error);
    return jsonError("Gagal menjalankan simulasi IoT.", 500);
  }
}
