import { jsonError, jsonOk } from "@/lib/api/validation";
import { runDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = runDemo();
    return jsonOk(result, 201);
  } catch (error) {
    console.error("[POST /api/demo/run]", error);
    return jsonError("Gagal menjalankan skenario demo.", 500);
  }
}
