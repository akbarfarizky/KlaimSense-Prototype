import { SERVICE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateID } from "@/lib/format";
import { policyReferencesFor } from "@/lib/rag";
import { RULE_DEFINITIONS, getRuleDefinition } from "@/lib/reference-data";
import type {
  AgentTraceEntry,
  AuditLogEntry,
  Claim,
  EvidencePackage,
  EvidenceSection,
  Hospital,
  PolicyReference,
  PriorityScore,
  RuleEvidenceItem,
  RuleResult,
  SensorEvent,
} from "@/types";

export const EVIDENCE_DISCLAIMER =
  "Temuan ini merupakan indikasi yang perlu diverifikasi dan bukan keputusan final mengenai fraud. Keputusan akhir berada pada petugas verifikasi manusia.";

export interface PeerSummary {
  peerGroup: string;
  volume: number;
  capacity: number;
  hospitalRatio: number;
  peerMedian: number;
}

export interface EvidenceAgentContext {
  claim: Claim;
  hospital: Hospital;
  ruleResults: RuleResult[];
  score: PriorityScore;
  sensorEvents: SensorEvent[];
  peerSummary: PeerSummary | null;
  auditTrail: AuditLogEntry[];
  now: string;
}

export interface EvidenceAgentOutput {
  finding: string;
  section: EvidenceSection;
}

export interface EvidenceAgent {
  id: string;
  name: string;
  role: string;
  deterministic: boolean;
  run(ctx: EvidenceAgentContext): EvidenceAgentOutput;
}

function ruleLabel(ruleId: string): string {
  return getRuleDefinition(ruleId)?.name ?? ruleId;
}

// ---------------------------------------------------------------------------
// 1. Claim Agent
// ---------------------------------------------------------------------------

export const claimAgent: EvidenceAgent = {
  id: "claim-agent",
  name: "Claim Agent",
  role: "Mengambil klaim yang mencurigakan",
  deterministic: true,
  run(ctx) {
    const { claim, hospital } = ctx;
    const items: RuleEvidenceItem[] = [
      { label: "ID Klaim", value: claim.id },
      { label: "ID Pasien", value: claim.patientRef },
      { label: "Rumah sakit", value: `${hospital.name} (${hospital.id})` },
      { label: "Layanan", value: SERVICE_LABELS[claim.serviceType] },
      { label: "Tanggal layanan", value: formatDateID(claim.serviceDate) },
      { label: "Kuantitas", value: `${claim.quantity}` },
      { label: "Nilai klaim", value: formatCurrency(claim.totalValue) },
      { label: "Baris agregat harian", value: claim.aggregateDailyLine ? "Ya" : "Tidak" },
    ];
    return {
      finding: `Klaim ${claim.id} (${SERVICE_LABELS[claim.serviceType]}) pada ${hospital.name} dengan nilai ${formatCurrency(claim.totalValue)}.`,
      section: {
        key: "claim",
        title: "1. Ringkasan Klaim",
        summary: "Data klaim sintetis yang sedang ditinjau.",
        items,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 2. Capacity Agent
// ---------------------------------------------------------------------------

export const capacityAgent: EvidenceAgent = {
  id: "capacity-agent",
  name: "Capacity Agent",
  role: "Mengambil informasi kapasitas rumah sakit",
  deterministic: true,
  run(ctx) {
    const { hospital, claim, ruleResults } = ctx;
    const capRules = ruleResults.filter((r) => r.category === "KAPASITAS" && r.triggered);
    const items: RuleEvidenceItem[] = [
      { label: "Tempat tidur", value: `${hospital.beds} TT` },
      { label: "Dokter", value: `${hospital.doctors} orang` },
      { label: "Fisioterapis", value: `${hospital.physiotherapists} orang` },
      { label: "Mesin cuci darah", value: `${hospital.dialysisMachines} unit` },
      { label: "Shift cuci darah / hari", value: `${hospital.dialysisShiftsPerDay} shift` },
      {
        label: "Kapasitas fisioterapi",
        value: `${hospital.dailyCapacity.fisioterapi} sesi/hari`,
      },
      {
        label: "Kapasitas hemodialisis",
        value: `${hospital.dailyCapacity.hemodialisis} sesi/hari`,
      },
      {
        label: "Status kapasitas untuk klaim ini",
        value: capRules.length > 0 ? "Melebihi kapasitas" : "Dalam kapasitas",
      },
    ];
    return {
      finding:
        capRules.length > 0
          ? `Terdapat pelanggaran kapasitas: ${capRules.map((r) => r.explanation).join(" ")}`
          : "Tidak ditemukan pelanggaran kapasitas untuk klaim ini.",
      section: {
        key: "capacity",
        title: "3. Data Kapasitas",
        summary: `Kapasitas harian ${SERVICE_LABELS[claim.serviceType]} berdasarkan sumber daya terkonfigurasi.`,
        items,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 3. Sensor Agent
// ---------------------------------------------------------------------------

export const sensorAgent: EvidenceAgent = {
  id: "sensor-agent",
  name: "Sensor Agent",
  role: "Mengambil data sensor",
  deterministic: true,
  run(ctx) {
    const { sensorEvents, claim } = ctx;
    const anomalous = sensorEvents.filter(
      (e) => e.status === "OFFLINE" || e.status === "STANDBY",
    );
    const items: RuleEvidenceItem[] =
      sensorEvents.length === 0
        ? [{ label: "Data sensor", value: "Tidak tersedia untuk periode ini" }]
        : [
            { label: "Periode", value: claim.serviceDate },
            { label: "Mesin dipantau", value: `${sensorEvents.length} unit` },
            ...sensorEvents.map((e) => ({
              label: e.machineId,
              value: `${e.status} • ${e.powerWatts} W • ${e.currentAmps} A • tanda tangan ${e.signatureValid ? "valid" : "tidak valid"}`,
            })),
          ];

    return {
      finding:
        anomalous.length > 0
          ? `Potensi ketidaksesuaian: ${anomalous.map((e) => `${e.machineId} ${e.status}`).join(", ")} pada periode klaim.`
          : "Tidak ditemukan mesin OFFLINE/STANDBY pada periode klaim.",
      section: {
        key: "sensor",
        title: "4. Data Sensor",
        summary:
          "Simulasi telemetri mesin. Nilai simulasi prototype, bukan validasi pada data rumah sakit nyata.",
        items,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 4. Rule Agent
// ---------------------------------------------------------------------------

export const ruleAgent: EvidenceAgent = {
  id: "rule-agent",
  name: "Rule Agent",
  role: "Mengambil rule yang terpicu",
  deterministic: true,
  run(ctx) {
    const triggered = ctx.ruleResults.filter((r) => r.triggered);
    const items: RuleEvidenceItem[] = triggered.map((r) => ({
      label: r.ruleId,
      value: `${ruleLabel(r.ruleId)} — ${r.explanation} (+${r.scoreImpact})`,
    }));

    return {
      finding:
        triggered.length > 0
          ? `${triggered.length} aturan terpicu dengan total skor ${ctx.score.score}/100 (${ctx.score.category}).`
          : "Tidak ada aturan yang terpicu.",
      section: {
        key: "rules",
        title: "2. Rule yang Terpicu",
        summary: "Daftar aturan deterministik yang terpicu beserta bobot skornya.",
        items: items.length > 0 ? items : [{ label: "Status", value: "Tidak ada rule terpicu" }],
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 5. Policy Agent (RAG lokal)
// ---------------------------------------------------------------------------

export const policyAgent: EvidenceAgent = {
  id: "policy-agent",
  name: "Policy Agent",
  role: "Mengambil referensi aturan",
  deterministic: true,
  run(ctx) {
    const triggered = ctx.ruleResults.filter((r) => r.triggered).map((r) => r.ruleId);
    const refs = policyReferencesFor(triggered, SERVICE_LABELS[ctx.claim.serviceType]);
    const items: RuleEvidenceItem[] = refs.map((r) => ({
      label: r.title,
      value: r.available ? r.excerpt : "Referensi resmi belum tersedia dalam prototype.",
    }));

    return {
      finding: `${refs.length} referensi aturan/knowledge base lokal dikaitkan dengan klaim ini.`,
      section: {
        key: "policy",
        title: "6. Referensi Aturan",
        summary: "Knowledge base lokal prototype (RAG sederhana berbasis kata kunci).",
        items:
          items.length > 0
            ? items
            : [{ label: "Referensi", value: "Referensi resmi belum tersedia dalam prototype." }],
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 6. Peer Agent
// ---------------------------------------------------------------------------

export const peerAgent: EvidenceAgent = {
  id: "peer-agent",
  name: "Peer Agent",
  role: "Membandingkan dengan rumah sakit sejenis",
  deterministic: true,
  run(ctx) {
    const peer = ctx.peerSummary;
    if (!peer) {
      return {
        finding: "Perbandingan peer belum tersedia.",
        section: {
          key: "peer",
          title: "5. Perbandingan Peer",
          summary: "Data peer tidak mencukupi.",
          items: [{ label: "Peer group", value: "Tidak tersedia" }],
        },
      };
    }

    const ratioVsPeer = peer.peerMedian > 0 ? peer.hospitalRatio / peer.peerMedian : 0;
    return {
      finding: `Intensitas layanan rumah sakit ${peer.hospitalRatio.toFixed(4)} dibanding median peer ${peer.peerMedian.toFixed(4)} (${ratioVsPeer.toFixed(1)}×).`,
      section: {
        key: "peer",
        title: "5. Perbandingan Peer",
        summary: "Perbandingan hanya dengan rumah sakit kelas dan layanan yang sejenis.",
        items: [
          { label: "Peer group", value: peer.peerGroup },
          { label: "Volume layanan", value: `${peer.volume}` },
          { label: "Kapasitas 30 hari", value: `${peer.capacity}` },
          { label: "Intensitas rumah sakit", value: peer.hospitalRatio.toFixed(4) },
          { label: "Median peer", value: peer.peerMedian.toFixed(4) },
          { label: "Rasio terhadap peer", value: `${ratioVsPeer.toFixed(2)}×` },
        ],
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 7. Summary Agent
// ---------------------------------------------------------------------------

export const summaryAgent: EvidenceAgent = {
  id: "summary-agent",
  name: "Summary Agent",
  role: "Membuat ringkasan bukti",
  deterministic: true,
  run(ctx) {
    const triggered = ctx.ruleResults.filter((r) => r.triggered);
    const sentences: string[] = [];

    sentences.push(
      `Sistem menemukan ${triggered.length} indikasi ketidaksesuaian pada klaim ${ctx.claim.id} di ${ctx.hospital.name}.`,
    );

    const cap = triggered.filter((r) => r.category === "KAPASITAS");
    if (cap.length > 0) {
      sentences.push(
        `Kapasitas layanan terlampaui: ${cap.map((r) => r.explanation).join(" ")}`,
      );
    }

    const dup = triggered.filter((r) => r.category === "DUPLIKASI");
    if (dup.length > 0) {
      sentences.push(`Terdapat indikasi klaim berulang: ${dup.map((r) => r.explanation).join(" ")}`);
    }

    const price = triggered.filter((r) => r.category === "KEWAJARAN_HARGA");
    if (price.length > 0) {
      sentences.push(`Kewajaran harga perlu ditinjau: ${price.map((r) => r.explanation).join(" ")}`);
    }

    const replace = triggered.filter((r) => r.category === "MASA_PENGGANTIAN");
    if (replace.length > 0) {
      sentences.push(`Masa penggantian alat: ${replace.map((r) => r.explanation).join(" ")}`);
    }

    const iot = triggered.filter((r) => r.category === "IOT");
    if (iot.length > 0) {
      sentences.push(
        "Simulasi sensor menunjukkan beberapa mesin berada dalam kondisi offline atau standby ketika terdapat klaim.",
      );
    }

    const peer = triggered.filter((r) => r.category === "PEER_COMPARISON");
    if (peer.length > 0) {
      sentences.push("Intensitas layanan berada di atas rumah sakit sejenis.");
    }

    const summary = `${sentences.join(" ")} Skor prioritas ${ctx.score.score}/100 (${ctx.score.category}). ${EVIDENCE_DISCLAIMER}`;

    return {
      finding: `Ringkasan bukti dibuat untuk ${triggered.length} rule terpicu.`,
      section: {
        key: "summary",
        title: "8. Ringkasan Bukti (AI Deterministik)",
        summary: "Ringkasan disusun oleh service deterministik, bukan model generatif.",
        items: [{ label: "Ringkasan", value: summary }],
      },
    };
  },
};

export const EVIDENCE_AGENTS: EvidenceAgent[] = [
  claimAgent,
  capacityAgent,
  sensorAgent,
  ruleAgent,
  policyAgent,
  peerAgent,
  summaryAgent,
];

export interface EvidenceAgentService {
  readonly mode: "mock" | "llm";
  buildPackage(ctx: EvidenceAgentContext): EvidencePackage;
}

/**
 * Implementasi deterministik/mock.
 * Antarmuka ini sengaja dibuat agar dapat diganti dengan implementasi berbasis
 * LLM/API eksternal tanpa mengubah pemanggil.
 */
export class MockEvidenceAgentService implements EvidenceAgentService {
  readonly mode = "mock" as const;

  constructor(private readonly agents: EvidenceAgent[] = EVIDENCE_AGENTS) {}

  buildPackage(ctx: EvidenceAgentContext): EvidencePackage {
    const trace: AgentTraceEntry[] = [];
    const sections: EvidenceSection[] = [];

    for (const agent of this.agents) {
      const output = agent.run(ctx);
      // Durasi deterministik agar output dapat direproduksi pada demo.
      const duration = 3 + (agent.id.length % 7);
      trace.push({
        agent: agent.name,
        role: agent.role,
        finding: output.finding,
        deterministic: agent.deterministic,
        durationMs: duration,
      });
      sections.push(output.section);
    }

    const triggered = ctx.ruleResults.filter((r) => r.triggered).map((r) => r.ruleId);
    const policyRefs: PolicyReference[] = policyReferencesFor(
      triggered,
      SERVICE_LABELS[ctx.claim.serviceType],
    );

    sections.push({
      key: "timeline",
      title: "7. Timeline",
      summary: "Jejak aktivitas sistem dan petugas untuk klaim ini.",
      items:
        ctx.auditTrail.length > 0
          ? ctx.auditTrail.map((a) => ({
              label: a.timestamp.slice(11, 19),
              value: `${a.actor} — ${a.action}`,
            }))
          : [{ label: "Timeline", value: "Belum ada aktivitas tercatat." }],
    });

    sections.push({
      key: "decisions",
      title: "9. Riwayat Keputusan",
      summary: "Keputusan manusia yang tercatat (human-in-the-loop).",
      items: ctx.auditTrail
        .filter((a) => a.action.toLowerCase().includes("keputusan") || a.action.toLowerCase().includes("klarifikasi") || a.action.toLowerCase().includes("audit") || a.action.toLowerCase().includes("disetujui"))
        .map((a) => ({ label: a.timestamp.slice(11, 19), value: `${a.actor} — ${a.newState}` })),
    });

    // Susun bagian sesuai nomor urut pada judul agar laporan terbaca 1..9.
    const ordered = [...sections].sort((a, b) => {
      const na = Number(a.title.match(/^(\d+)/)?.[1] ?? 99);
      const nb = Number(b.title.match(/^(\d+)/)?.[1] ?? 99);
      return na - nb;
    });
    sections.length = 0;
    sections.push(...ordered);

    const summarySection = sections.find((s) => s.key === "summary");
    const summary =
      summarySection?.items[0]?.value ??
      `Skor prioritas ${ctx.score.score}/100 (${ctx.score.category}). ${EVIDENCE_DISCLAIMER}`;

    return {
      id: `EVD-${ctx.claim.id}`,
      claimId: ctx.claim.id,
      hospitalId: ctx.hospital.id,
      generatedAt: ctx.now,
      summary,
      disclaimer: EVIDENCE_DISCLAIMER,
      sections,
      agentTrace: trace,
      policyRefs,
    };
  }
}

export function createEvidenceAgentService(): EvidenceAgentService {
  return new MockEvidenceAgentService();
}

export function allRuleNames(): string[] {
  return RULE_DEFINITIONS.map((r) => r.name);
}
