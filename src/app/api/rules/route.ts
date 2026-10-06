import { jsonOk } from "@/lib/api/validation";
import { POLICY_DOCUMENTS, RULE_DEFINITIONS } from "@/lib/reference-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk({
    rules: RULE_DEFINITIONS,
    policies: POLICY_DOCUMENTS,
    total: RULE_DEFINITIONS.length,
  });
}
