import { buildDashboardData } from "@/lib/analytics";
import type {
  AuditLogEntry,
  Claim,
  ClaimRecord,
  DashboardData,
  Decision,
  EvidencePackage,
  Hospital,
  MachineTelemetry,
  PolicyDocument,
  PriorityScore,
  RuleResult,
  SensorEvent,
  VerificationCase,
} from "@/types";
import type { SimulationAction } from "@/lib/iot";
import {
  buildEvidence,
  getAuditLog,
  getCase,
  getClaimById,
  getClaimRecord,
  getHospitalById,
  getMachineTelemetry,
  getRuleResults,
  getScore,
  getSensorEvents,
  getStore,
  listClaimRecords,
  listDecisions,
  listHospitals,
  listPolicies,
  simulateMachine,
  submitDecision,
  type DecisionInput,
} from "./store";

export interface ClaimFilter {
  hospitalId?: string;
  serviceType?: string;
  status?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  minScore?: number;
}

export interface KlaimSenseRepository {
  readonly mode: "mock" | "postgres";
  getHospitals(): Promise<Hospital[]>;
  getHospital(id: string): Promise<Hospital | null>;
  getClaims(filter?: ClaimFilter): Promise<Claim[]>;
  getClaim(id: string): Promise<Claim | null>;
  getClaimRecords(filter?: ClaimFilter): Promise<ClaimRecord[]>;
  getClaimRecord(id: string): Promise<ClaimRecord | null>;
  getRuleResults(claimId: string): Promise<RuleResult[]>;
  getScore(claimId: string): Promise<PriorityScore | null>;
  getVerificationCases(filter?: ClaimFilter): Promise<VerificationCase[]>;
  getVerificationCase(claimId: string): Promise<VerificationCase | null>;
  submitDecision(
    claimId: string,
    input: DecisionInput,
  ): Promise<{ case: VerificationCase; decision: Decision; audit: AuditLogEntry[] } | null>;
  getDecisions(): Promise<Decision[]>;
  getAuditLog(): Promise<AuditLogEntry[]>;
  getSensorEvents(hospitalId: string, periodDate?: string): Promise<SensorEvent[]>;
  getMachineTelemetry(hospitalId: string, periodDate: string): Promise<MachineTelemetry[]>;
  simulateMachine(
    hospitalId: string,
    periodDate: string,
    machineId: string,
    action: SimulationAction,
  ): Promise<MachineTelemetry | null>;
  getEvidence(claimId: string): Promise<EvidencePackage | null>;
  getDashboard(): Promise<DashboardData>;
  getPolicies(): Promise<PolicyDocument[]>;
}

function matchesFilter(record: ClaimRecord, filter?: ClaimFilter): boolean {
  if (!filter) return true;
  const { claim, score, case: verificationCase } = record;

  if (filter.hospitalId && claim.hospitalId !== filter.hospitalId) return false;
  if (filter.serviceType && claim.serviceType !== filter.serviceType) return false;
  if (filter.status && (verificationCase?.status ?? "BARU") !== filter.status) return false;
  if (filter.priority && score.category !== filter.priority) return false;
  if (filter.dateFrom && claim.serviceDate < filter.dateFrom) return false;
  if (filter.dateTo && claim.serviceDate > filter.dateTo) return false;
  if (typeof filter.minScore === "number" && score.score < filter.minScore) return false;

  if (filter.search) {
    const q = filter.search.toLowerCase();
    const haystack = [
      claim.id,
      claim.patientRef,
      record.hospital.name,
      claim.description,
      claim.serviceType,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export class MockKlaimSenseRepository implements KlaimSenseRepository {
  readonly mode = "mock" as const;

  async getHospitals(): Promise<Hospital[]> {
    return listHospitals();
  }

  async getHospital(id: string): Promise<Hospital | null> {
    return getHospitalById(id);
  }

  async getClaims(filter?: ClaimFilter): Promise<Claim[]> {
    return listClaimRecords()
      .filter((r) => matchesFilter(r, filter))
      .map((r) => r.claim);
  }

  async getClaim(id: string): Promise<Claim | null> {
    return getClaimById(id);
  }

  async getClaimRecords(filter?: ClaimFilter): Promise<ClaimRecord[]> {
    return listClaimRecords().filter((r) => matchesFilter(r, filter));
  }

  async getClaimRecord(id: string): Promise<ClaimRecord | null> {
    return getClaimRecord(id);
  }

  async getRuleResults(claimId: string): Promise<RuleResult[]> {
    return getRuleResults(claimId);
  }

  async getScore(claimId: string): Promise<PriorityScore | null> {
    return getScore(claimId);
  }

  async getVerificationCases(filter?: ClaimFilter): Promise<VerificationCase[]> {
    return listClaimRecords()
      .filter((r) => matchesFilter(r, filter))
      .map((r) => r.case)
      .filter((c): c is VerificationCase => c !== null)
      .sort((a, b) => b.score - a.score);
  }

  async getVerificationCase(claimId: string): Promise<VerificationCase | null> {
    return getCase(claimId);
  }

  async submitDecision(claimId: string, input: DecisionInput) {
    return submitDecision(claimId, input);
  }

  async getDecisions(): Promise<Decision[]> {
    return listDecisions();
  }

  async getAuditLog(): Promise<AuditLogEntry[]> {
    return getAuditLog();
  }

  async getSensorEvents(hospitalId: string, periodDate?: string): Promise<SensorEvent[]> {
    return getSensorEvents(hospitalId, periodDate);
  }

  async getMachineTelemetry(hospitalId: string, periodDate: string): Promise<MachineTelemetry[]> {
    return getMachineTelemetry(hospitalId, periodDate);
  }

  async simulateMachine(
    hospitalId: string,
    periodDate: string,
    machineId: string,
    action: SimulationAction,
  ): Promise<MachineTelemetry | null> {
    return simulateMachine(hospitalId, periodDate, machineId, action);
  }

  async getEvidence(claimId: string): Promise<EvidencePackage | null> {
    return buildEvidence(claimId);
  }

  async getDashboard(): Promise<DashboardData> {
    return buildDashboardData(listClaimRecords());
  }

  async getPolicies(): Promise<PolicyDocument[]> {
    return listPolicies();
  }
}

/**
 * Repositori PostgreSQL berbasis Prisma.
 * Hanya digunakan bila DATABASE_URL tersedia dan Prisma Client sudah di-generate.
 * UI tidak berubah antara mode mock dan mode PostgreSQL karena keduanya
 * mengimplementasikan antarmuka KlaimSenseRepository yang sama.
 */
export class PrismaKlaimSenseRepository implements KlaimSenseRepository {
  readonly mode = "postgres" as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly prisma: any) {}

  async getHospitals(): Promise<Hospital[]> {
    const rows = await this.prisma.hospital.findMany({ include: { capacity: true } });
    return rows.map(mapHospital);
  }

  async getHospital(id: string): Promise<Hospital | null> {
    const row = await this.prisma.hospital.findUnique({
      where: { id },
      include: { capacity: true },
    });
    return row ? mapHospital(row) : null;
  }

  async getClaims(filter?: ClaimFilter): Promise<Claim[]> {
    const rows = await this.prisma.claim.findMany({
      where: buildPrismaWhere(filter),
      orderBy: { serviceDate: "desc" },
    });
    return rows.map(mapClaim);
  }

  async getClaim(id: string): Promise<Claim | null> {
    const row = await this.prisma.claim.findUnique({ where: { id } });
    return row ? mapClaim(row) : null;
  }

  async getClaimRecords(filter?: ClaimFilter): Promise<ClaimRecord[]> {
    const claims = await this.getClaims(filter);
    const records: ClaimRecord[] = [];
    for (const claim of claims) {
      const record = await this.getClaimRecord(claim.id);
      if (record) records.push(record);
    }
    return records;
  }

  async getClaimRecord(id: string): Promise<ClaimRecord | null> {
    const claim = await this.getClaim(id);
    if (!claim) return null;
    const hospital = await this.getHospital(claim.hospitalId);
    if (!hospital) return null;
    const ruleResults = await this.getRuleResults(id);
    const score = (await this.getScore(id)) ?? {
      claimId: id,
      score: 0,
      category: "LOW" as const,
      breakdown: [],
      computedAt: new Date().toISOString(),
      notes: "Belum dihitung.",
    };
    const verificationCase = await this.getVerificationCase(id);
    return { claim, hospital, ruleResults, score, case: verificationCase };
  }

  async getRuleResults(claimId: string): Promise<RuleResult[]> {
    const rows = await this.prisma.claimRuleResult.findMany({
      where: { claimId },
      include: { rule: true },
    });
    return rows.map(mapRuleResult);
  }

  async getScore(claimId: string): Promise<PriorityScore | null> {
    const row = await this.prisma.verificationCase.findFirst({ where: { claimId } });
    if (!row) return null;
    return {
      claimId,
      score: row.score,
      category: row.category,
      breakdown: [],
      computedAt: row.updatedAt.toISOString(),
      notes: "Dimuat dari basis data PostgreSQL.",
    };
  }

  async getVerificationCases(filter?: ClaimFilter): Promise<VerificationCase[]> {
    const rows = await this.prisma.verificationCase.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      orderBy: { score: "desc" },
    });
    return rows.map(mapVerificationCase);
  }

  async getVerificationCase(claimId: string): Promise<VerificationCase | null> {
    const row = await this.prisma.verificationCase.findFirst({ where: { claimId } });
    return row ? mapVerificationCase(row) : null;
  }

  async submitDecision(claimId: string, input: DecisionInput) {
    const existing = await this.getVerificationCase(claimId);
    if (!existing) return null;
    const statusByAction: Record<string, string> = {
      DISETUJUI: "DISETUJUI",
      MEMBUTUHKAN_KLARIFIKASI: "MEMBUTUHKAN_KLARIFIKASI",
      RUJUK_AUDIT: "RUJUK_AUDIT",
    };
    const updated = await this.prisma.verificationCase.update({
      where: { id: existing.id },
      data: {
        status: statusByAction[input.action],
        assignedTo: input.actor ?? existing.assignedTo,
        reviewerNote: input.note ?? existing.reviewerNote,
      },
    });
    const decision = await this.prisma.decision.create({
      data: {
        caseId: existing.id,
        claimId,
        action: input.action,
        actor: input.actor ?? "Petugas BPJS (Demo)",
        note: input.note ?? "-",
      },
    });
    const audit = await this.prisma.auditLog.create({
      data: {
        actor: input.actor ?? "Petugas BPJS (Demo)",
        action: "Keputusan dicatat",
        object: decision.id,
        previousState: existing.status,
        newState: statusByAction[input.action],
      },
    });
    return {
      case: mapVerificationCase(updated),
      decision: {
        id: decision.id,
        caseId: existing.id,
        claimId,
        action: input.action,
        actor: decision.actor,
        note: decision.note,
        createdAt: decision.createdAt.toISOString(),
        humanInTheLoop: true as const,
      },
      audit: [
        {
          id: audit.id,
          timestamp: audit.timestamp.toISOString(),
          actor: audit.actor,
          action: audit.action,
          object: audit.object,
          previousState: audit.previousState,
          newState: audit.newState,
          severity: "info" as const,
        },
      ],
    };
  }

  async getDecisions(): Promise<Decision[]> {
    const rows = await this.prisma.decision.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      caseId: String(r.caseId),
      claimId: String(r.claimId),
      action: r.action as Decision["action"],
      actor: String(r.actor),
      note: String(r.note),
      createdAt: (r.createdAt as Date).toISOString(),
      humanInTheLoop: true as const,
    }));
  }

  async getAuditLog(): Promise<AuditLogEntry[]> {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { timestamp: "desc" } });
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      timestamp: (r.timestamp as Date).toISOString(),
      actor: String(r.actor),
      action: String(r.action),
      object: String(r.object),
      previousState: String(r.previousState),
      newState: String(r.newState),
      severity: (r.severity as AuditLogEntry["severity"]) ?? "info",
    }));
  }

  async getSensorEvents(hospitalId: string, periodDate?: string): Promise<SensorEvent[]> {
    const rows = await this.prisma.sensorEvent.findMany({
      where: { hospitalId, ...(periodDate ? { periodDate } : {}) },
    });
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      hospitalId: String(r.hospitalId),
      machineId: String(r.machineId),
      status: r.status as SensorEvent["status"],
      powerWatts: Number(r.powerWatts),
      currentAmps: Number(r.currentAmps),
      timestamp: (r.timestamp as Date).toISOString(),
      signatureValid: Boolean(r.signatureValid),
      periodDate: String(r.periodDate),
    }));
  }

  async getMachineTelemetry(hospitalId: string, periodDate: string): Promise<MachineTelemetry[]> {
    const { telemetryFromEvent } = await import("@/lib/iot");
    const events = await this.getSensorEvents(hospitalId, periodDate);
    return events.map(telemetryFromEvent);
  }

  async simulateMachine(): Promise<MachineTelemetry | null> {
    throw new Error(
      "Simulasi IoT belum diimplementasikan untuk mode PostgreSQL pada prototype ini.",
    );
  }

  async getEvidence(claimId: string): Promise<EvidencePackage | null> {
    const row = await this.prisma.evidence.findFirst({ where: { claimId } });
    if (!row) return null;
    return row.payload as EvidencePackage;
  }

  async getDashboard(): Promise<DashboardData> {
    return buildDashboardData(await this.getClaimRecords());
  }

  async getPolicies(): Promise<PolicyDocument[]> {
    const rows = await this.prisma.policyDocument.findMany();
    return rows.map((r: Record<string, unknown>) => ({
      docId: String(r.docId),
      title: String(r.title),
      issuer: String(r.issuer),
      year: Number(r.year),
      available: Boolean(r.available),
      excerpt: String(r.excerpt),
      tags: (r.tags as string[]) ?? [],
    }));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHospital(row: any): Hospital {
  const physiotherapists = row.physiotherapists ?? 0;
  const dialysisMachines = row.dialysisMachines ?? 0;
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    class: row.class,
    ownership: row.ownership ?? "Swasta",
    beds: row.beds ?? 0,
    doctors: row.doctors ?? 0,
    physiotherapists,
    dialysisMachines,
    dialysisShiftsPerDay: row.dialysisShiftsPerDay ?? 3,
    physioSessionsPerTherapistPerDay: row.physioSessionsPerTherapistPerDay ?? 8,
    rooms: row.rooms ?? 0,
    dailyCapacity: {
      fisioterapi: row.capacity?.fisioterapi ?? physiotherapists * 8,
      hemodialisis: row.capacity?.hemodialisis ?? dialysisMachines * 3,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClaim(row: any): Claim {
  return {
    id: row.id,
    hospitalId: row.hospitalId,
    patientRef: row.patientRef,
    serviceType: row.serviceType,
    serviceDate:
      typeof row.serviceDate === "string"
        ? row.serviceDate
        : row.serviceDate.toISOString().slice(0, 10),
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    totalValue: row.totalValue,
    description: row.description ?? "",
    previouslyPaid: Boolean(row.previouslyPaid),
    paidReferenceId: row.paidReferenceId ?? undefined,
    aggregateDailyLine: Boolean(row.aggregateDailyLine),
    duplicateOf: row.duplicateOf ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRuleResult(row: any): RuleResult {
  return {
    ruleId: row.ruleId,
    claimId: row.claimId,
    hospitalId: row.hospitalId,
    category: row.rule?.category ?? row.category,
    triggered: row.triggered,
    severity: row.severity,
    explanation: row.explanation,
    evidence: row.evidence ?? [],
    nilaiAktual: row.nilaiAktual,
    nilaiBatas: row.nilaiBatas,
    satuan: row.satuan ?? "",
    selisih: row.selisih ?? null,
    sumber: row.sumber ?? "",
    scoreImpact: row.scoreImpact ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVerificationCase(row: any): VerificationCase {
  return {
    id: row.id,
    claimId: row.claimId,
    hospitalId: row.hospitalId,
    status: row.status,
    assignedTo: row.assignedTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    score: row.score,
    category: row.category,
    triggers: row.triggers ?? [],
    reviewerNote: row.reviewerNote ?? undefined,
  };
}

function buildPrismaWhere(filter?: ClaimFilter) {
  if (!filter) return undefined;
  return {
    ...(filter.hospitalId ? { hospitalId: filter.hospitalId } : {}),
    ...(filter.serviceType ? { serviceType: filter.serviceType } : {}),
    ...(filter.dateFrom || filter.dateTo
      ? {
          serviceDate: {
            ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
            ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
          },
        }
      : {}),
  };
}

let repositorySingleton: KlaimSenseRepository | null = null;

/**
 * Membaca DATABASE_URL secara defensif.
 * Pada runtime edge (mis. WinterJS/Workers), objek `process` belum tentu tersedia,
 * sehingga akses harus dijaga agar tidak melempar ReferenceError.
 */
function readDatabaseUrl(): string | undefined {
  try {
    if (typeof process === "undefined" || !process.env) return undefined;
    return process.env.DATABASE_URL || undefined;
  } catch {
    return undefined;
  }
}

/** True bila `require` CommonJS tersedia pada runtime saat ini. */
function hasRequire(): boolean {
  return typeof require === "function";
}

export function getRepository(): KlaimSenseRepository {
  if (repositorySingleton) return repositorySingleton;

  // Mode PostgreSQL hanya aktif bila DATABASE_URL tersedia DAN Prisma Client
  // berhasil dimuat. Jika tidak, aplikasi berjalan penuh pada mode mock.
  // Pada runtime edge tanpa `process`/`require`, jalur ini dilewati dan aplikasi
  // tetap berjalan normal dengan mock repository in-memory.
  if (readDatabaseUrl() && hasRequire()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const prismaModule = require("@prisma/client");
      const client = new prismaModule.PrismaClient();
      repositorySingleton = new PrismaKlaimSenseRepository(client);
      return repositorySingleton;
    } catch {
      console.warn(
        "[KlaimSense] DATABASE_URL terdeteksi namun Prisma Client belum siap. Beralih ke mode mock.",
      );
    }
  }

  repositorySingleton = new MockKlaimSenseRepository();
  return repositorySingleton;
}

export function resetRepository(): void {
  repositorySingleton = null;
}

export { getStore };
