import {
  DEMO_ACTOR,
  DEMO_HOSPITAL_NAME,
  PRIMARY_DEMO_CLAIM_ID,
  SECONDARY_DEMO_CLAIM_ID,
  SYSTEM_ACTOR,
} from "@/lib/constants";
import {
  appendAudit,
  buildEvidence,
  getAuditLog,
  getCase,
  getClaimById,
  getClaimRecord,
  getMachineTelemetry,
  getScore,
  listDecisions,
} from "@/lib/repositories/store";
import type { AuditLogEntry, DemoRunResult, DemoStep } from "@/types";

export const DEMO_STEP_TEMPLATES: { id: string; order: number; title: string; description: string }[] = [
  {
    id: "step-1",
    order: 1,
    title: "Klaim masuk",
    description: "Klaim fisioterapi dan hemodialisis RS Sehat Sentosa diterima sistem.",
  },
  {
    id: "step-2",
    order: 2,
    title: "Rule Engine berjalan",
    description: "Delapan aturan deterministik dievaluasi terhadap klaim dan konteks rumah sakit.",
  },
  {
    id: "step-3",
    order: 3,
    title: "Anomali terdeteksi",
    description: "Pelanggaran kapasitas dan kewajaran harga teridentifikasi.",
  },
  {
    id: "step-4",
    order: 4,
    title: "IoT diperiksa",
    description: "Simulasi telemetri mesin cuci darah dibandingkan dengan periode klaim.",
  },
  {
    id: "step-5",
    order: 5,
    title: "Evidence dibuat",
    description: "Paket bukti disusun oleh EvidenceAgentService (mock deterministik).",
  },
  {
    id: "step-6",
    order: 6,
    title: "Petugas melakukan verifikasi",
    description: "Petugas manusia membuka kasus dan memutuskan tindak lanjut.",
  },
  {
    id: "step-7",
    order: 7,
    title: "Keputusan dicatat",
    description: "Keputusan dicatat pada audit log beserta perubahan status.",
  },
];

function findLatestDecision(claimId: string) {
  return listDecisions().find((d) => d.claimId === claimId) ?? null;
}

function buildSteps(): DemoStep[] {
  const primaryCase = getCase(PRIMARY_DEMO_CLAIM_ID);
  const decision = findLatestDecision(PRIMARY_DEMO_CLAIM_ID);
  const steps: DemoStep[] = [];

  for (const template of DEMO_STEP_TEMPLATES) {
    let status: DemoStep["status"] = "done";
    let detail = "";

    switch (template.id) {
      case "step-1": {
        const claim = getClaimById(PRIMARY_DEMO_CLAIM_ID);
        const second = getClaimById(SECONDARY_DEMO_CLAIM_ID);
        detail = `Klaim ${PRIMARY_DEMO_CLAIM_ID} (${claim?.quantity ?? 0} sesi fisioterapi) dan ${SECONDARY_DEMO_CLAIM_ID} (${second?.quantity ?? 0} sesi hemodialisis) diterima dari ${DEMO_HOSPITAL_NAME}.`;
        break;
      }
      case "step-2": {
        const score = getScore(PRIMARY_DEMO_CLAIM_ID);
        detail = `Rule engine mengevaluasi klaim; skor awal ${score?.score ?? 0}/100 (${score?.category ?? "-"}).`;
        break;
      }
      case "step-3": {
        const record = getClaimRecord(PRIMARY_DEMO_CLAIM_ID);
        const cap = record?.ruleResults.find((r) => r.ruleId === "CAP-001" && r.triggered);
        detail = cap
          ? `CAP-001 terpicu: ${cap.explanation}`
          : "Tidak ada pelanggaran kapasitas terdeteksi pada klaim utama.";
        break;
      }
      case "step-4": {
        const machines = getMachineTelemetry("RS-H-001", "2026-10-05");
        const anomalous = machines.filter((m) => m.status !== "THERAPY");
        detail = `Simulasi sensor: ${anomalous.map((m) => `${m.machineId} ${m.status}`).join(", ") || "semua mesin normal"}.`;
        break;
      }
      case "step-5": {
        const evidence = buildEvidence(PRIMARY_DEMO_CLAIM_ID);
        detail = `Paket bukti ${evidence?.id ?? "-"} dibuat dengan ${evidence?.sections.length ?? 0} bagian dan ${evidence?.agentTrace.length ?? 0} agen.`;
        break;
      }
      case "step-6": {
        if (decision) {
          status = "done";
          detail = `Petugas ${decision.actor} memproses kasus.`;
        } else {
          status = "pending";
          detail = "Menunggu tindakan petugas pada halaman Daftar Periksa / Detail Klaim.";
        }
        break;
      }
      case "step-7": {
        if (decision) {
          status = "done";
          detail = `Keputusan ${decision.action} dicatat pada audit log (status kasus: ${primaryCase?.status ?? "-"}).`;
        } else {
          status = "pending";
          detail = "Belum ada keputusan yang dicatat.";
        }
        break;
      }
      default:
        break;
    }

    steps.push({ ...template, status, detail });
  }

  return steps;
}

export function getDemoStatus(): DemoRunResult {
  const steps = buildSteps();
  const score = getScore(PRIMARY_DEMO_CLAIM_ID);
  const evidence = buildEvidence(PRIMARY_DEMO_CLAIM_ID);

  return {
    runId: `DEMO-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}`,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    steps,
    primaryClaimId: PRIMARY_DEMO_CLAIM_ID,
    secondaryClaimId: SECONDARY_DEMO_CLAIM_ID,
    score: score ?? {
      claimId: PRIMARY_DEMO_CLAIM_ID,
      score: 0,
      category: "LOW",
      breakdown: [],
      computedAt: new Date().toISOString(),
      notes: "Skor belum tersedia.",
    },
    evidenceId: evidence?.id ?? "-",
    auditTrail: getAuditLog().slice(0, 20),
  };
}

export function runDemo(): DemoRunResult {
  const claim = getClaimById(PRIMARY_DEMO_CLAIM_ID);
  const score = getScore(PRIMARY_DEMO_CLAIM_ID);

  const stamp = new Date().toISOString();
  const entries: AuditLogEntry[] = [
    appendAudit({
      timestamp: stamp,
      actor: SYSTEM_ACTOR,
      action: "Demo dijalankan",
      object: "DEMO-SCENARIO",
      previousState: "-",
      newState: "MULAI",
      severity: "info",
    }),
    appendAudit({
      timestamp: stamp,
      actor: SYSTEM_ACTOR,
      action: "Klaim masuk",
      object: claim?.id ?? "-",
      previousState: "-",
      newState: "DITERIMA",
      severity: "info",
    }),
    appendAudit({
      timestamp: stamp,
      actor: SYSTEM_ACTOR,
      action: "Rule engine dijalankan",
      object: claim?.id ?? "-",
      previousState: "-",
      newState: `${score?.score ?? 0}/100 (${score?.category ?? "-"})`,
      severity: "warning",
    }),
    appendAudit({
      timestamp: stamp,
      actor: SYSTEM_ACTOR,
      action: "Pemeriksaan IoT dijalankan",
      object: "RS-H-001",
      previousState: "-",
      newState: "SIMULASI SENSOR",
      severity: "warning",
    }),
    appendAudit({
      timestamp: stamp,
      actor: "EvidenceAgentService (mock)",
      action: "Evidence package dibuat",
      object: claim?.id ?? "-",
      previousState: "-",
      newState: `EVD-${claim?.id ?? "-"}`,
      severity: "info",
    }),
  ];

  const result = getDemoStatus();
  return {
    ...result,
    runId: `DEMO-${stamp.slice(0, 19).replace(/[:T]/g, "")}`,
    startedAt: stamp,
    finishedAt: stamp,
    auditTrail: [...entries, ...result.auditTrail].slice(0, 25),
    steps: result.steps.map((s) =>
      s.order <= 5
        ? { ...s, status: "done" as const }
        : s,
    ),
  };
}

export const DEMO_NARRATIVE = {
  hospital: DEMO_HOSPITAL_NAME,
  actor: DEMO_ACTOR,
  fisioterapi: { claim: 75, capacity: 32, over: 43 },
  hemodialisis: { claim: 40, capacity: 24, over: 16 },
  iot: { offline: ["HD-03", "HD-07"], standby: ["HD-05"] },
} as const;
