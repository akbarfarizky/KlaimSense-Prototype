export type ServiceType =
  | "FISIOTERAPI"
  | "HEMODIALISIS"
  | "ALAT_BANTU_DENGAR"
  | "OBAT_KRONIS";

export type HospitalClass = "A" | "B" | "C" | "D";

export type Region =
  | "DKI Jakarta"
  | "Jawa Barat"
  | "Jawa Tengah"
  | "Jawa Timur"
  | "Sumatera Utara"
  | "Sulawesi Selatan"
  | "Bali";

export type RuleCategory =
  | "KAPASITAS"
  | "DUPLIKASI"
  | "KEWAJARAN_HARGA"
  | "MASA_PENGGANTIAN"
  | "PEER_COMPARISON"
  | "IOT";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PriorityCategory = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type VerificationStatus =
  | "BARU"
  | "DALAM_PEMERIKSAAN"
  | "MEMBUTUHKAN_KLARIFIKASI"
  | "RUJUK_AUDIT"
  | "DISETUJUI"
  | "DITOLAK";

export type DecisionAction =
  | "DISETUJUI"
  | "MEMBUTUHKAN_KLARIFIKASI"
  | "RUJUK_AUDIT";

export type MachineStatus = "THERAPY" | "STANDBY" | "OFFLINE";

export interface Hospital {
  id: string;
  name: string;
  region: Region;
  class: HospitalClass;
  ownership: "Pemerintah" | "Swasta";
  beds: number;
  doctors: number;
  physiotherapists: number;
  dialysisMachines: number;
  dialysisShiftsPerDay: number;
  physioSessionsPerTherapistPerDay: number;
  rooms: number;
  /** Kapasitas harian turunan, dihitung deterministik dari sumber daya. */
  dailyCapacity: {
    fisioterapi: number;
    hemodialisis: number;
  };
}

export interface Claim {
  id: string;
  hospitalId: string;
  /** Referensi pasien tersamarkan, contoh: PT-******4821 */
  patientRef: string;
  serviceType: ServiceType;
  serviceDate: string; // ISO date (yyyy-MM-dd)
  quantity: number;
  unitPrice: number;
  totalValue: number;
  /** Deskripsi sintetis, bukan data klinis nyata */
  description: string;
  /** true jika klaim sintetis ini dirancang sebagai pembayaran yang sudah selesai */
  previouslyPaid: boolean;
  /** id klaim yang dibayar sebelumnya, untuk DUP-002 */
  paidReferenceId?: string;
  /** true jika klaim ini adalah baris agregat harian (bulk claim line) */
  aggregateDailyLine: boolean;
  /** true jika klaim ini adalah duplikat dari klaim lain */
  duplicateOf?: string;
}

export interface RuleDefinition {
  ruleId: string;
  name: string;
  category: RuleCategory;
  severity: Severity;
  scoreImpact: number;
  active: boolean;
  description: string;
  threshold: string;
  formula: string;
  example: string;
  dataUsed: string[];
  policyRefs: string[];
}

export interface RuleEvidenceItem {
  label: string;
  value: string;
}

export interface RuleResult {
  ruleId: string;
  claimId: string;
  hospitalId: string;
  category: RuleCategory;
  triggered: boolean;
  severity: Severity;
  explanation: string;
  evidence: RuleEvidenceItem[];
  nilaiAktual: number | string;
  nilaiBatas: number | string;
  satuan: string;
  selisih: number | null;
  sumber: string;
  scoreImpact: number;
}

export interface ScoreBreakdownItem {
  ruleId: string;
  label: string;
  impact: number;
}

export interface PriorityScore {
  claimId: string;
  score: number;
  category: PriorityCategory;
  breakdown: ScoreBreakdownItem[];
  computedAt: string;
  notes: string;
}

export interface MachineTelemetry {
  machineId: string;
  label: string;
  status: MachineStatus;
  powerWatts: number;
  currentAmps: number;
  timestamp: string;
  signatureValid: boolean;
  edgeAiConfidence: number;
  edgeAiPrediction: MachineStatus;
}

export interface SensorEvent {
  id: string;
  hospitalId: string;
  machineId: string;
  status: MachineStatus;
  powerWatts: number;
  currentAmps: number;
  timestamp: string;
  signatureValid: boolean;
  periodDate: string;
}

export interface EvidenceSection {
  key: string;
  title: string;
  summary: string;
  items: RuleEvidenceItem[];
}

export interface EvidencePackage {
  id: string;
  claimId: string;
  hospitalId: string;
  generatedAt: string;
  summary: string;
  disclaimer: string;
  sections: EvidenceSection[];
  agentTrace: AgentTraceEntry[];
  policyRefs: PolicyReference[];
}

export interface AgentTraceEntry {
  agent: string;
  role: string;
  finding: string;
  deterministic: boolean;
  durationMs: number;
}

export interface PolicyReference {
  docId: string;
  title: string;
  excerpt: string;
  available: boolean;
}

export interface VerificationCase {
  id: string;
  claimId: string;
  hospitalId: string;
  status: VerificationStatus;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  score: number;
  category: PriorityCategory;
  triggers: string[];
  reviewerNote?: string;
}

export interface Decision {
  id: string;
  caseId: string;
  claimId: string;
  action: DecisionAction;
  actor: string;
  note: string;
  createdAt: string;
  humanInTheLoop: true;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  object: string;
  previousState: string;
  newState: string;
  severity: "info" | "warning" | "critical";
}

export interface PolicyDocument {
  docId: string;
  title: string;
  issuer: string;
  year: number;
  available: boolean;
  excerpt: string;
  tags: string[];
}

export interface ClaimRecord {
  claim: Claim;
  hospital: Hospital;
  ruleResults: RuleResult[];
  score: PriorityScore;
  case: VerificationCase | null;
}

export interface DemoStep {
  id: string;
  order: number;
  title: string;
  description: string;
  status: "pending" | "running" | "done";
  detail: string;
}

export interface DemoRunResult {
  runId: string;
  startedAt: string;
  finishedAt: string;
  steps: DemoStep[];
  primaryClaimId: string;
  secondaryClaimId: string;
  score: PriorityScore;
  evidenceId: string;
  auditTrail: AuditLogEntry[];
}

export interface KpiSummary {
  totalClaims: number;
  suspiciousClaims: number;
  highPriorityClaims: number;
  awaitingVerification: number;
  potentialValueUnderReview: number;
  detectionRate: number;
}

export interface DashboardData {
  kpi: KpiSummary;
  claimTrend: { date: string; claims: number; suspicious: number }[];
  categoryDistribution: { category: string; value: number }[];
  priorityDistribution: { priority: string; value: number }[];
  suspiciousPerDay: { date: string; value: number }[];
  topRules: { ruleId: string; name: string; count: number }[];
}
