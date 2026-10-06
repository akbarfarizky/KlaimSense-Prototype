import { CATEGORY_LABELS, SERVICE_SHORT } from "@/lib/constants";
import { RULE_DEFINITIONS } from "@/lib/reference-data";
import { getStore, SUSPICIOUS_SCORE_THRESHOLD } from "@/lib/repositories/store";
import type {
  ClaimRecord,
  DashboardData,
  KpiSummary,
  PriorityCategory,
  RuleResult,
  ServiceType,
} from "@/types";

function lastNDates(n: number): string[] {
  const dates: string[] = [];
  const base = new Date("2026-10-05T00:00:00.000Z");
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function buildDashboardData(records: ClaimRecord[]): DashboardData {
  const store = getStore();
  const dates = lastNDates(14);
  const suspiciousThreshold = SUSPICIOUS_SCORE_THRESHOLD;

  const suspicious = records.filter((r) => r.score.score >= suspiciousThreshold);
  const highPriority = records.filter((r) => r.score.score >= 60);
  const awaiting = records.filter(
    (r) =>
      r.case &&
      (r.case.status === "BARU" ||
        r.case.status === "DALAM_PEMERIKSAAN" ||
        r.case.status === "MEMBUTUHKAN_KLARIFIKASI"),
  );
  const potentialValue = suspicious.reduce((sum, r) => sum + r.claim.totalValue, 0);
  const detectionRate = records.length > 0 ? (suspicious.length / records.length) * 100 : 0;

  const kpi: KpiSummary = {
    totalClaims: records.length,
    suspiciousClaims: suspicious.length,
    highPriorityClaims: highPriority.length,
    awaitingVerification: awaiting.length,
    potentialValueUnderReview: potentialValue,
    detectionRate: Number(detectionRate.toFixed(1)),
  };

  const claimTrend = dates.map((date) => {
    const dayClaims = records.filter((r) => r.claim.serviceDate === date);
    return {
      date,
      claims: dayClaims.length,
      suspicious: dayClaims.filter((r) => r.score.score >= suspiciousThreshold).length,
    };
  });

  const serviceTypes: ServiceType[] = [
    "FISIOTERAPI",
    "HEMODIALISIS",
    "ALAT_BANTU_DENGAR",
    "OBAT_KRONIS",
  ];
  const categoryDistribution = serviceTypes.map((service) => ({
    category: SERVICE_SHORT[service],
    value: records.filter((r) => r.claim.serviceType === service).length,
  }));

  const priorityOrder: PriorityCategory[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const priorityDistribution = priorityOrder.map((priority) => ({
    priority,
    value: records.filter((r) => r.score.category === priority).length,
  }));

  const suspiciousPerDay = dates.map((date) => ({
    date,
    value: records.filter(
      (r) => r.claim.serviceDate === date && r.score.score >= suspiciousThreshold,
    ).length,
  }));

  const counts = new Map<string, number>();
  for (const results of store.engine.resultsByClaim.values()) {
    for (const r of results as RuleResult[]) {
      if (!r.triggered) continue;
      counts.set(r.ruleId, (counts.get(r.ruleId) ?? 0) + 1);
    }
  }
  const topRules = Array.from(counts.entries())
    .map(([ruleId, count]) => ({
      ruleId,
      name: RULE_DEFINITIONS.find((d) => d.ruleId === ruleId)?.name ?? ruleId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return { kpi, claimTrend, categoryDistribution, priorityDistribution, suspiciousPerDay, topRules };
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
