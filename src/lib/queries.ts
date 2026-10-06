import { buildDashboardData } from "@/lib/analytics";
import { SERVICE_SHORT } from "@/lib/constants";
import { getMachineTelemetry, getStore, SUSPICIOUS_SCORE_THRESHOLD } from "@/lib/repositories/store";
import type {
  ClaimRecord,
  DashboardData,
  Hospital,
  MachineTelemetry,
  PriorityCategory,
  RuleResult,
  ServiceType,
} from "@/types";

export interface HospitalListItem extends Hospital {
  claimCount: number;
  suspiciousCount: number;
  priorityScore: number;
  priorityCategory: PriorityCategory;
  status: string;
}

export function toPriorityCategory(score: number): PriorityCategory {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

export function buildHospitalList(records: ClaimRecord[], hospitals: Hospital[]): HospitalListItem[] {
  return hospitals.map((hospital) => {
    const hospitalRecords = records.filter((r) => r.claim.hospitalId === hospital.id);
    const suspicious = hospitalRecords.filter((r) => r.score.score >= SUSPICIOUS_SCORE_THRESHOLD);
    const avg =
      hospitalRecords.length > 0
        ? Math.round(
            hospitalRecords.reduce((sum, r) => sum + r.score.score, 0) / hospitalRecords.length,
          )
        : 0;
    return {
      ...hospital,
      claimCount: hospitalRecords.length,
      suspiciousCount: suspicious.length,
      priorityScore: avg,
      priorityCategory: toPriorityCategory(avg),
      status: suspicious.length > 0 ? "PERLU DITINJAU" : "NORMAL",
    };
  });
}

export interface HospitalDetail {
  hospital: Hospital;
  summary: HospitalListItem;
  capacity: {
    service: string;
    capacity: number;
    claimed30d: number;
    utilisation: number;
    unit: string;
  }[];
  claimTrend: { date: string; claims: number; suspicious: number }[];
  suspiciousClaims: ClaimRecord[];
  topRules: { ruleId: string; name: string; count: number }[];
  machines: MachineTelemetry[];
  peerComparison: {
    peerGroup: string;
    metric: string;
    hospitalValue: number;
    peerMedian: number;
    peerCount: number;
  }[];
}

function lastNDates(n: number, end: string): string[] {
  const dates: string[] = [];
  const base = new Date(`${end}T00:00:00.000Z`);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function buildHospitalDetail(
  hospital: Hospital,
  records: ClaimRecord[],
  hospitals: Hospital[],
): HospitalDetail {
  const store = getStore();
  const hospitalRecords = records.filter((r) => r.claim.hospitalId === hospital.id);
  const listItem = buildHospitalList(records, hospitals).find((h) => h.id === hospital.id)!;

  const services: ServiceType[] = [
    "FISIOTERAPI",
    "HEMODIALISIS",
    "ALAT_BANTU_DENGAR",
    "OBAT_KRONIS",
  ];

  const capacity = services.map((service) => {
    const claimed = hospitalRecords
      .filter((r) => r.claim.serviceType === service)
      .reduce((sum, r) => sum + r.claim.quantity, 0);
    const capPerDay =
      service === "FISIOTERAPI"
        ? hospital.dailyCapacity.fisioterapi
        : service === "HEMODIALISIS"
          ? hospital.dailyCapacity.hemodialisis
          : service === "ALAT_BANTU_DENGAR"
            ? Math.max(1, Math.round(hospital.doctors * 0.25))
            : Math.max(1, Math.round(hospital.doctors * 0.6));
    const capacity30d = capPerDay * 30;
    return {
      service: SERVICE_SHORT[service],
      capacity: capacity30d,
      claimed30d: claimed,
      utilisation: capacity30d > 0 ? Number(((claimed / capacity30d) * 100).toFixed(1)) : 0,
      unit: service === "OBAT_KRONIS" ? "bulan" : service === "ALAT_BANTU_DENGAR" ? "unit" : "sesi",
    };
  });

  const end = hospitalRecords.map((r) => r.claim.serviceDate).sort().at(-1) ?? "2026-10-05";
  const dates = lastNDates(14, end);
  const claimTrend = dates.map((date) => {
    const day = hospitalRecords.filter((r) => r.claim.serviceDate === date);
    return {
      date,
      claims: day.length,
      suspicious: day.filter((r) => r.score.score >= SUSPICIOUS_SCORE_THRESHOLD).length,
    };
  });

  const suspiciousClaims = hospitalRecords
    .filter((r) => r.score.score >= SUSPICIOUS_SCORE_THRESHOLD)
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 10);

  const counts = new Map<string, number>();
  for (const record of hospitalRecords) {
    for (const result of record.ruleResults as RuleResult[]) {
      if (!result.triggered) continue;
      counts.set(result.ruleId, (counts.get(result.ruleId) ?? 0) + 1);
    }
  }
  const topRules = Array.from(counts.entries())
    .map(([ruleId, count]) => ({ ruleId, name: ruleId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const machines = getMachineTelemetry(hospital.id, end);

  const peerComparison = services.map((service) => {
    const values = (store.engine.context.peerRatios.get(`${hospital.class}|${service}`) ?? []).filter(
      (v) => v > 0,
    );
    const hospitalVolume = hospitalRecords
      .filter((r) => r.claim.serviceType === service)
      .reduce((sum, r) => sum + r.claim.quantity, 0);
    const capPerDay =
      service === "FISIOTERAPI"
        ? hospital.dailyCapacity.fisioterapi
        : service === "HEMODIALISIS"
          ? hospital.dailyCapacity.hemodialisis
          : 1;
    const hospitalValue = hospitalVolume / Math.max(1, capPerDay * 30);
    return {
      peerGroup: `Kelas ${hospital.class}`,
      metric: SERVICE_SHORT[service],
      hospitalValue: Number(hospitalValue.toFixed(4)),
      peerMedian: Number(median(values).toFixed(4)),
      peerCount: values.length,
    };
  });

  return {
    hospital,
    summary: listItem,
    capacity,
    claimTrend,
    suspiciousClaims,
    topRules,
    machines,
    peerComparison,
  };
}

export function dashboardFromRecords(records: ClaimRecord[]): DashboardData {
  return buildDashboardData(records);
}
