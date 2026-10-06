import { MockEvidenceAgentService } from "@/lib/agents";
import { DEMO_ACTOR, HERO_CLAIM_DATE, SYSTEM_ACTOR } from "@/lib/constants";
import { getSyntheticDataset, type SyntheticDataset } from "@/lib/data/synthetic";
import { applySimulationAction, telemetryFromEvent, type SimulationAction } from "@/lib/iot";
import { POLICY_DOCUMENTS } from "@/lib/reference-data";
import {
  computePriorityScore,
  key,
  runRuleEngine,
  serviceCapacity,
  type RuleEngineOutput,
} from "@/lib/rules/engine";
import type {
  AuditLogEntry,
  Claim,
  ClaimRecord,
  Decision,
  DecisionAction,
  EvidencePackage,
  Hospital,
  MachineTelemetry,
  PolicyDocument,
  PriorityScore,
  RuleResult,
  SensorEvent,
  VerificationCase,
  VerificationStatus,
} from "@/types";

export interface DecisionInput {
  action: DecisionAction;
  actor?: string;
  note?: string;
}

export interface StoreState {
  dataset: SyntheticDataset;
  engine: RuleEngineOutput;
  cases: Map<string, VerificationCase>;
  decisions: Decision[];
  audit: AuditLogEntry[];
  evidenceCache: Map<string, EvidencePackage>;
  machineOverrides: Map<string, MachineTelemetry[]>;
  policies: PolicyDocument[];
  decisionSeq: number;
  auditSeq: number;
}

const SUSPICIOUS_THRESHOLD = 30;

function nowIso(): string {
  return new Date().toISOString();
}

function buildInitialAudit(dataset: SyntheticDataset, engine: RuleEngineOutput): AuditLogEntry[] {
  const entries: AuditLogEntry[] = [];
  let seq = 1;
  const at = (time: string) => `${HERO_CLAIM_DATE}T${time}.000Z`;

  const primary = "CLM-2026-00123";
  const secondary = "CLM-2026-00124";

  for (const claimId of [primary, secondary]) {
    const score = engine.scoresByClaim.get(claimId);
    const results = engine.resultsByClaim.get(claimId) ?? [];
    const triggered = results.filter((r) => r.triggered);
    for (const r of triggered) {
      entries.push({
        id: `AUD-${String(seq++).padStart(5, "0")}`,
        timestamp: at("13:24:00"),
        actor: SYSTEM_ACTOR,
        action: `Sistem mendeteksi ${r.ruleId}`,
        object: claimId,
        previousState: "-",
        newState: "TERPICU",
        severity: r.severity === "HIGH" ? "warning" : "info",
      });
    }
    if (score) {
      entries.push({
        id: `AUD-${String(seq++).padStart(5, "0")}`,
        timestamp: at("13:24:30"),
        actor: SYSTEM_ACTOR,
        action: "Skor prioritas dibuat",
        object: claimId,
        previousState: "-",
        newState: `${score.score}/100 (${score.category})`,
        severity: "info",
      });
    }
    entries.push({
      id: `AUD-${String(seq++).padStart(5, "0")}`,
      timestamp: at("13:25:00"),
      actor: "EvidenceAgentService (mock)",
      action: "Evidence package dibuat",
      object: claimId,
      previousState: "-",
      newState: `EVD-${claimId}`,
      severity: "info",
    });
  }

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function buildCases(engine: RuleEngineOutput, claims: Claim[]): Map<string, VerificationCase> {
  const cases = new Map<string, VerificationCase>();
  const claimById = new Map(claims.map((c) => [c.id, c]));
  let seq = 1;

  for (const claim of claims) {
    const score = engine.scoresByClaim.get(claim.id);
    if (!score || score.score < SUSPICIOUS_THRESHOLD) continue;
    const results = engine.resultsByClaim.get(claim.id) ?? [];
    const triggers = results.filter((r) => r.triggered).map((r) => r.ruleId);
    const createdAt = `${claim.serviceDate}T13:24:00.000Z`;

    const isPrimary = claim.id === "CLM-2026-00123" || claim.id === "CLM-2026-00124";

    cases.set(claim.id, {
      id: `CASE-2026-${String(seq++).padStart(5, "0")}`,
      claimId: claim.id,
      hospitalId: claim.hospitalId,
      status: isPrimary ? "DALAM_PEMERIKSAAN" : "BARU",
      assignedTo: isPrimary ? DEMO_ACTOR : "Belum ditugaskan",
      createdAt,
      updatedAt: createdAt,
      score: score.score,
      category: score.category,
      triggers,
    });
  }

  // Pastikan klaim demo selalu memiliki case meskipun skornya berubah.
  for (const id of ["CLM-2026-00123", "CLM-2026-00124"]) {
    if (cases.has(id)) continue;
    const claim = claimById.get(id);
    if (!claim) continue;
    const score = engine.scoresByClaim.get(id) ?? computePriorityScore(id, []);
    cases.set(id, {
      id: `CASE-2026-${String(seq++).padStart(5, "0")}`,
      claimId: id,
      hospitalId: claim.hospitalId,
      status: "BARU",
      assignedTo: "Belum ditugaskan",
      createdAt: `${claim.serviceDate}T13:24:00.000Z`,
      updatedAt: `${claim.serviceDate}T13:24:00.000Z`,
      score: score.score,
      category: score.category,
      triggers: (engine.resultsByClaim.get(id) ?? []).filter((r) => r.triggered).map((r) => r.ruleId),
    });
  }

  return cases;
}

function createState(): StoreState {
  const dataset = getSyntheticDataset();
  const engine = runRuleEngine({
    hospitals: dataset.hospitals,
    claims: dataset.claims,
    sensorEvents: dataset.sensorEvents,
  });
  const audit = buildInitialAudit(dataset, engine);
  const cases = buildCases(engine, dataset.claims);

  return {
    dataset,
    engine,
    cases,
    decisions: [],
    audit,
    evidenceCache: new Map(),
    machineOverrides: new Map(),
    policies: POLICY_DOCUMENTS,
    decisionSeq: 1,
    auditSeq: audit.length + 1,
  };
}

const globalForStore = globalThis as unknown as { __klaimsenseStore?: StoreState };

export function getStore(): StoreState {
  if (!globalForStore.__klaimsenseStore) {
    globalForStore.__klaimsenseStore = createState();
  }
  return globalForStore.__klaimsenseStore;
}

export function resetStore(): void {
  globalForStore.__klaimsenseStore = createState();
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function listClaims(): Claim[] {
  return getStore().dataset.claims;
}

export function getClaimById(claimId: string): Claim | null {
  return getStore().dataset.claims.find((c) => c.id === claimId) ?? null;
}

export function getHospitalById(hospitalId: string): Hospital | null {
  return getStore().dataset.hospitals.find((h) => h.id === hospitalId) ?? null;
}

export function listHospitals(): Hospital[] {
  return getStore().dataset.hospitals;
}

export function getRuleResults(claimId: string): RuleResult[] {
  return getStore().engine.resultsByClaim.get(claimId) ?? [];
}

export function getScore(claimId: string): PriorityScore | null {
  return getStore().engine.scoresByClaim.get(claimId) ?? null;
}

export function getCase(claimId: string): VerificationCase | null {
  return getStore().cases.get(claimId) ?? null;
}

export function listCases(): VerificationCase[] {
  return Array.from(getStore().cases.values());
}

export function getClaimRecord(claimId: string): ClaimRecord | null {
  const claim = getClaimById(claimId);
  if (!claim) return null;
  const hospital = getHospitalById(claim.hospitalId);
  if (!hospital) return null;
  const score = getScore(claimId) ?? computePriorityScore(claimId, []);
  return {
    claim,
    hospital,
    ruleResults: getRuleResults(claimId),
    score,
    case: getCase(claimId),
  };
}

export function listClaimRecords(): ClaimRecord[] {
  return listClaims()
    .map((c) => getClaimRecord(c.id))
    .filter((r): r is ClaimRecord => r !== null);
}

export function getSensorEvents(hospitalId: string, periodDate?: string): SensorEvent[] {
  return getStore().dataset.sensorEvents.filter(
    (e) => e.hospitalId === hospitalId && (!periodDate || e.periodDate === periodDate),
  );
}

export function getAuditLog(): AuditLogEntry[] {
  return [...getStore().audit].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function appendAudit(entry: Omit<AuditLogEntry, "id">): AuditLogEntry {
  const store = getStore();
  const full: AuditLogEntry = {
    ...entry,
    id: `AUD-${String(store.auditSeq++).padStart(5, "0")}`,
  };
  store.audit.push(full);
  return full;
}

// ---------------------------------------------------------------------------
// Telemetri mesin
// ---------------------------------------------------------------------------

export function getMachineTelemetry(hospitalId: string, periodDate: string): MachineTelemetry[] {
  const store = getStore();
  const overrideKey = key(hospitalId, periodDate);
  const override = store.machineOverrides.get(overrideKey);
  if (override) return override;

  const events = store.dataset.sensorEvents.filter(
    (e) => e.hospitalId === hospitalId && e.periodDate === periodDate,
  );
  const machines = events
    .sort((a, b) => a.machineId.localeCompare(b.machineId))
    .map(telemetryFromEvent);
  store.machineOverrides.set(overrideKey, machines);
  return machines;
}

export function simulateMachine(
  hospitalId: string,
  periodDate: string,
  machineId: string,
  action: SimulationAction,
  actor = DEMO_ACTOR,
): MachineTelemetry | null {
  const machines = getMachineTelemetry(hospitalId, periodDate);
  const index = machines.findIndex((m) => m.machineId === machineId);
  if (index === -1) return null;

  const updated = applySimulationAction(machines[index], action, nowIso());
  const next = [...machines];
  next[index] = updated;
  getStore().machineOverrides.set(key(hospitalId, periodDate), next);

  appendAudit({
    timestamp: nowIso(),
    actor,
    action: `Simulasi IoT: ${action}`,
    object: `${machineId} @ ${hospitalId}`,
    previousState: machines[index].status,
    newState: updated.status,
    severity: updated.status === "OFFLINE" ? "warning" : "info",
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export function buildEvidence(claimId: string): EvidencePackage | null {
  const store = getStore();
  const cached = store.evidenceCache.get(claimId);
  if (cached) return cached;

  const record = getClaimRecord(claimId);
  if (!record) return null;

  const { claim, hospital, ruleResults, score } = record;
  const sensorEvents = store.dataset.sensorEvents
    .filter((e) => e.hospitalId === claim.hospitalId && e.periodDate === claim.serviceDate)
    .sort((a, b) => a.machineId.localeCompare(b.machineId));

  const peerValues = (store.engine.context.peerRatios.get(key(hospital.class, claim.serviceType)) ?? []).filter(
    (v) => v > 0,
  );
  const sorted = [...peerValues].sort((a, b) => a - b);
  const peerMedian =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

  const volume = (store.engine.context.claimsByHospital.get(hospital.id) ?? [])
    .filter((c) => c.serviceType === claim.serviceType)
    .reduce((sum, c) => sum + c.quantity, 0);

  const service = createEvidenceAgentServiceInstance();
  const pkg = service.buildPackage({
    claim,
    hospital,
    ruleResults,
    score,
    sensorEvents,
    peerSummary: {
      peerGroup: `Kelas ${hospital.class} • ${claim.serviceType}`,
      volume,
      capacity: serviceCapacity(hospital, claim.serviceType) * 30,
      hospitalRatio: volume / Math.max(1, serviceCapacity(hospital, claim.serviceType) * 30),
      peerMedian,
    },
    auditTrail: store.audit.filter((a) => a.object === claimId),
    now: nowIso(),
  });

  store.evidenceCache.set(claimId, pkg);
  return pkg;
}

let evidenceServiceSingleton: MockEvidenceAgentService | null = null;
function createEvidenceAgentServiceInstance(): MockEvidenceAgentService {
  if (!evidenceServiceSingleton) evidenceServiceSingleton = new MockEvidenceAgentService();
  return evidenceServiceSingleton;
}

// ---------------------------------------------------------------------------
// Keputusan (human-in-the-loop)
// ---------------------------------------------------------------------------

const STATUS_BY_ACTION: Record<DecisionAction, VerificationStatus> = {
  DISETUJUI: "DISETUJUI",
  MEMBUTUHKAN_KLARIFIKASI: "MEMBUTUHKAN_KLARIFIKASI",
  RUJUK_AUDIT: "RUJUK_AUDIT",
};

export function submitDecision(
  claimId: string,
  input: DecisionInput,
): { case: VerificationCase; decision: Decision; audit: AuditLogEntry[] } | null {
  const store = getStore();
  const existing = store.cases.get(claimId);
  if (!existing) return null;

  const actor = input.actor ?? DEMO_ACTOR;
  const timestamp = nowIso();
  const newStatus = STATUS_BY_ACTION[input.action];
  const previousStatus = existing.status;

  const updatedCase: VerificationCase = {
    ...existing,
    status: newStatus,
    updatedAt: timestamp,
    assignedTo: actor,
    reviewerNote: input.note ?? existing.reviewerNote,
  };
  store.cases.set(claimId, updatedCase);

  const decision: Decision = {
    id: `DEC-${String(store.decisionSeq++).padStart(5, "0")}`,
    caseId: existing.id,
    claimId,
    action: input.action,
    actor,
    note:
      input.note ??
      (input.action === "MEMBUTUHKAN_KLARIFIKASI"
        ? "Petugas meminta klarifikasi kepada fasilitas kesehatan."
        : input.action === "RUJUK_AUDIT"
          ? "Petugas merujuk kasus ke audit internal."
          : "Petugas menyetujui klaim setelah verifikasi."),
    createdAt: timestamp,
    humanInTheLoop: true,
  };
  store.decisions.push(decision);

  const audit = [
    appendAudit({
      timestamp,
      actor,
      action: "Petugas membuka klaim",
      object: claimId,
      previousState: "-",
      newState: "DIBUKA",
      severity: "info",
    }),
    appendAudit({
      timestamp,
      actor,
      action:
        input.action === "MEMBUTUHKAN_KLARIFIKASI"
          ? "Petugas meminta klarifikasi"
          : input.action === "RUJUK_AUDIT"
            ? "Petugas merujuk ke audit"
            : "Petugas menyetujui klaim",
      object: claimId,
      previousState: previousStatus,
      newState: newStatus,
      severity: input.action === "DISETUJUI" ? "info" : "warning",
    }),
    appendAudit({
      timestamp,
      actor,
      action: "Keputusan dicatat",
      object: decision.id,
      previousState: previousStatus,
      newState: newStatus,
      severity: "info",
    }),
  ];

  return { case: updatedCase, decision, audit };
}

export function listDecisions(): Decision[] {
  return [...getStore().decisions];
}

export function listPolicies(): PolicyDocument[] {
  return [...getStore().policies];
}

export const SUSPICIOUS_SCORE_THRESHOLD = SUSPICIOUS_THRESHOLD;
