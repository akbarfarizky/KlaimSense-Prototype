import { jsonError, jsonOk, parseFilter } from "@/lib/api/validation";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filter = parseFilter(url);
    const repository = getRepository();

    const [claims, records] = await Promise.all([
      repository.getClaims(filter),
      repository.getClaimRecords(filter),
    ]);

    const scoreByClaim = new Map(records.map((r) => [r.claim.id, r.score]));
    const caseByClaim = new Map(records.map((r) => [r.claim.id, r.case]));

    const data = claims.map((claim) => {
      const score = scoreByClaim.get(claim.id);
      const verificationCase = caseByClaim.get(claim.id) ?? null;
      return {
        ...claim,
        score: score?.score ?? 0,
        priority: score?.category ?? "LOW",
        status: verificationCase?.status ?? "BARU",
        triggers: verificationCase?.triggers ?? [],
      };
    });

    return jsonOk({ claims: data, total: data.length, mode: repository.mode });
  } catch (error) {
    console.error("[GET /api/claims]", error);
    return jsonError("Gagal memuat daftar klaim.", 500);
  }
}
