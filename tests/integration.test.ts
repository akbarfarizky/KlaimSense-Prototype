import { beforeAll, describe, expect, it } from "vitest";
import { getSyntheticDataset } from "@/lib/data/synthetic";
import { runRuleEngine } from "@/lib/rules/engine";
import {
  buildEvidence,
  getAuditLog,
  getClaimRecord,
  listClaims,
  listHospitals,
  resetStore,
} from "@/lib/repositories/store";
import { MockKlaimSenseRepository } from "@/lib/repositories";
import { EVIDENCE_DISCLAIMER } from "@/lib/agents";

const PRIMARY = "CLM-2026-00123";
const SECONDARY = "CLM-2026-00124";

describe("Data sintetis", () => {
  it("menghasilkan minimal 30 rumah sakit dan 500 klaim", () => {
    const dataset = getSyntheticDataset();
    expect(dataset.hospitals.length).toBeGreaterThanOrEqual(30);
    expect(dataset.claims.length).toBeGreaterThanOrEqual(500);
  });

  it("reproduksibel dengan seed tetap", () => {
    const a = getSyntheticDataset();
    const b = getSyntheticDataset();
    expect(a.claims.length).toBe(b.claims.length);
    expect(a.hospitals.map((h) => h.id)).toEqual(b.hospitals.map((h) => h.id));
  });

  it("memiliki ID klaim yang unik (tanpa tabrakan dengan ID demo)", () => {
    const dataset = getSyntheticDataset();
    const ids = dataset.claims.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Skenario demo harus benar-benar ada dan hanya sekali.
    expect(ids.filter((id) => id === PRIMARY)).toHaveLength(1);
    expect(ids.filter((id) => id === SECONDARY)).toHaveLength(1);
  });

  it("menggunakan referensi pasien tersamarkan (bukan nama asli)", () => {
    const dataset = getSyntheticDataset();
    const allMasked = dataset.claims.every((c) => /^PT-\*{6}\d{4}$/.test(c.patientRef));
    expect(allMasked).toBe(true);
  });

  it("memuat skenario demo RS Sehat Sentosa dengan kapasitas yang benar", () => {
    const hospital = listHospitals().find((h) => h.id === "RS-H-001");
    expect(hospital?.name).toBe("RS Sehat Sentosa");
    expect(hospital?.physiotherapists).toBe(4);
    expect(hospital?.dailyCapacity.fisioterapi).toBe(32);
    expect(hospital?.dialysisMachines).toBe(8);
    expect(hospital?.dailyCapacity.hemodialisis).toBe(24);
  });
});

describe("Rule engine pada dataset demo", () => {
  it("menandai CAP-001 75 vs 32 dengan selisih 43", () => {
    const record = getClaimRecord(PRIMARY);
    const cap = record?.ruleResults.find((r) => r.ruleId === "CAP-001");
    expect(cap?.triggered).toBe(true);
    expect(cap?.nilaiAktual).toBe(75);
    expect(cap?.nilaiBatas).toBe(32);
    expect(cap?.selisih).toBe(43);
  });

  it("menandai CAP-002 40 vs 24 dengan selisih 16", () => {
    const record = getClaimRecord(SECONDARY);
    const cap = record?.ruleResults.find((r) => r.ruleId === "CAP-002");
    expect(cap?.triggered).toBe(true);
    expect(cap?.nilaiAktual).toBe(40);
    expect(cap?.nilaiBatas).toBe(24);
    expect(cap?.selisih).toBe(16);
  });

  it("menandai ketidaksesuaian IoT pada periode klaim", () => {
    const record = getClaimRecord(SECONDARY);
    const iot = record?.ruleResults.find((r) => r.ruleId === "IO-001");
    expect(iot?.triggered).toBe(true);
    expect(String(iot?.evidence.find((e) => e.label === "Mesin OFFLINE/STANDBY")?.value)).toContain(
      "HD-03",
    );
  });

  it("memisahkan rumah sakit sejenis untuk perbandingan peer", () => {
    const dataset = getSyntheticDataset();
    const engine = runRuleEngine({
      hospitals: dataset.hospitals,
      claims: dataset.claims,
      sensorEvents: dataset.sensorEvents,
    });
    const peerKeys = Array.from(engine.context.peerRatios.keys());
    expect(peerKeys.some((k) => k.includes("B|FISIOTERAPI"))).toBe(true);
    // Peer group dibedakan berdasarkan kelas rumah sakit.
    expect(peerKeys.some((k) => k.startsWith("A|"))).toBe(true);
    expect(peerKeys.some((k) => k.startsWith("C|"))).toBe(true);
  });
});

describe("Integration: CLAIM → RULE ENGINE → EVIDENCE → HUMAN DECISION → AUDIT LOG", () => {
  beforeAll(() => {
    resetStore();
  });

  it("menjalankan alur lengkap dari klaim hingga audit log", async () => {
    const repository = new MockKlaimSenseRepository();

    // 1. CLAIM
    const claim = await repository.getClaim(PRIMARY);
    expect(claim).not.toBeNull();
    expect(claim?.hospitalId).toBe("RS-H-001");

    // 2. RULE ENGINE
    const record = await repository.getClaimRecord(PRIMARY);
    expect(record).not.toBeNull();
    const triggered = record!.ruleResults.filter((r) => r.triggered);
    expect(triggered.length).toBeGreaterThan(0);
    expect(record!.score.score).toBeGreaterThan(0);

    // 3. EVIDENCE
    const evidence = await repository.getEvidence(PRIMARY);
    expect(evidence).not.toBeNull();
    expect(evidence!.sections.length).toBeGreaterThanOrEqual(7);
    expect(evidence!.agentTrace.length).toBe(7);
    expect(evidence!.disclaimer).toBe(EVIDENCE_DISCLAIMER);
    // Setiap agen harus deterministik pada prototype.
    expect(evidence!.agentTrace.every((t) => t.deterministic)).toBe(true);
    // Bukti kapasitas & sensor harus tersedia.
    expect(evidence!.sections.some((s) => s.key === "capacity")).toBe(true);
    expect(evidence!.sections.some((s) => s.key === "sensor")).toBe(true);

    // 4. HUMAN DECISION
    const before = await repository.getVerificationCase(PRIMARY);
    expect(before?.status).toBe("DALAM_PEMERIKSAAN");

    const auditBefore = (await repository.getAuditLog()).length;

    const decision = await repository.submitDecision(PRIMARY, {
      action: "MEMBUTUHKAN_KLARIFIKASI",
      actor: "Petugas BPJS — Rina A. (Demo)",
      note: "Meminta rekam medis periode 5 Oktober 2026.",
    });

    expect(decision).not.toBeNull();
    expect(decision!.decision.humanInTheLoop).toBe(true);
    expect(decision!.decision.action).toBe("MEMBUTUHKAN_KLARIFIKASI");
    expect(decision!.case.status).toBe("MEMBUTUHKAN_KLARIFIKASI");

    // 5. AUDIT LOG
    const auditAfter = await repository.getAuditLog();
    expect(auditAfter.length).toBeGreaterThan(auditBefore);

    const decisionEntry = auditAfter.find((a) => a.action === "Keputusan dicatat");
    expect(decisionEntry).toBeDefined();
    expect(decisionEntry?.previousState).toBe("DALAM_PEMERIKSAAN");
    expect(decisionEntry?.newState).toBe("MEMBUTUHKAN_KLARIFIKASI");

    const clarificationEntry = auditAfter.find((a) => a.action === "Petugas meminta klarifikasi");
    expect(clarificationEntry).toBeDefined();
    expect(clarificationEntry?.actor).toContain("Petugas");
  });

  it("tidak pernah menolak klaim secara otomatis (tidak ada aksi DITOLAK otomatis)", async () => {
    const repository = new MockKlaimSenseRepository();
    const decisions = await repository.getDecisions();
    // Prototype hanya menyediakan tiga aksi manusia; tidak ada penolakan otomatis.
    for (const d of decisions) {
      expect(["DISETUJUI", "MEMBUTUHKAN_KLARIFIKASI", "RUJUK_AUDIT"]).toContain(d.action);
      expect(d.humanInTheLoop).toBe(true);
    }
  });

  it("mempertahankan bahasa indikatif dan bukan tuduhan fraud", () => {
    const evidence = buildEvidence(PRIMARY);
    expect(evidence).not.toBeNull();
    const text = [
      evidence!.summary,
      evidence!.disclaimer,
      ...evidence!.sections.map((s) => s.summary),
      ...evidence!.agentTrace.map((t) => t.finding),
    ]
      .join(" ")
      .toLowerCase();

    expect(text).toContain("indikasi");
    expect(text).not.toContain("fraud terdeteksi");
    expect(text).not.toContain("terbukti fraud");
  });
});

describe("Cakupan klaim & rumah sakit", () => {
  it("memiliki case verifikasi untuk klaim demo", () => {
    const record = getClaimRecord(PRIMARY);
    expect(record?.case).not.toBeNull();
    expect(record?.case?.score).toBeGreaterThan(0);
  });

  it("memuat seluruh jenis layanan pada dataset", () => {
    const claims = listClaims();
    const services = new Set(claims.map((c) => c.serviceType));
    expect(services.has("FISIOTERAPI")).toBe(true);
    expect(services.has("HEMODIALISIS")).toBe(true);
    expect(services.has("ALAT_BANTU_DENGAR")).toBe(true);
    expect(services.has("OBAT_KRONIS")).toBe(true);
  });

  it("mencatat audit log awal untuk klaim demo", () => {
    const audit = getAuditLog();
    expect(audit.some((a) => a.object === PRIMARY)).toBe(true);
  });
});
