import {
  MAX_PRIORITY_SCORE,
  PRIORITY_BANDS,
  REFERENCE_PRICES,
  REPLACEMENT_PERIOD_YEARS,
  RULE_DEFINITIONS,
  SERVICE_UNITS,
} from "@/lib/reference-data";
import { SERVICE_LABELS } from "@/lib/constants";
import type {
  Claim,
  Hospital,
  PriorityCategory,
  PriorityScore,
  RuleEvidenceItem,
  RuleResult,
  SensorEvent,
  ServiceType,
} from "@/types";

export interface RuleContext {
  hospitals: Hospital[];
  claims: Claim[];
  sensorEvents: SensorEvent[];
  hospitalById: Map<string, Hospital>;
  claimsByHospital: Map<string, Claim[]>;
  claimsByHospitalDate: Map<string, Claim[]>;
  claimsByHospitalServiceDate: Map<string, Claim[]>;
  claimsByPatientServiceDate: Map<string, Claim[]>;
  claimsByPatientService: Map<string, Claim[]>;
  sensorsByHospitalDate: Map<string, SensorEvent[]>;
  /** Rasio intensitas layanan per kapasitas 30 hari, dikelompokkan per kelas+layanan. */
  peerRatios: Map<string, number[]>;
}

export function key(...parts: (string | number)[]): string {
  return parts.join("|");
}

export function buildRuleContext(input: {
  hospitals: Hospital[];
  claims: Claim[];
  sensorEvents: SensorEvent[];
}): RuleContext {
  const { hospitals, claims, sensorEvents } = input;

  const hospitalById = new Map(hospitals.map((h) => [h.id, h]));
  const claimsByHospital = new Map<string, Claim[]>();
  const claimsByHospitalDate = new Map<string, Claim[]>();
  const claimsByHospitalServiceDate = new Map<string, Claim[]>();
  const claimsByPatientServiceDate = new Map<string, Claim[]>();
  const claimsByPatientService = new Map<string, Claim[]>();
  const sensorsByHospitalDate = new Map<string, SensorEvent[]>();

  const push = <T>(map: Map<string, T[]>, k: string, value: T) => {
    const list = map.get(k);
    if (list) list.push(value);
    else map.set(k, [value]);
  };

  for (const claim of claims) {
    push(claimsByHospital, claim.hospitalId, claim);
    push(claimsByHospitalDate, key(claim.hospitalId, claim.serviceDate), claim);
    push(
      claimsByHospitalServiceDate,
      key(claim.hospitalId, claim.serviceType, claim.serviceDate),
      claim,
    );
    push(
      claimsByPatientServiceDate,
      key(claim.patientRef, claim.serviceType, claim.serviceDate),
      claim,
    );
    push(claimsByPatientService, key(claim.patientRef, claim.serviceType), claim);
  }

  for (const event of sensorEvents) {
    push(sensorsByHospitalDate, key(event.hospitalId, event.periodDate), event);
  }

  const peerRatios = new Map<string, number[]>();
  const windowDays = 30;
  for (const hospital of hospitals) {
    for (const service of ["FISIOTERAPI", "HEMODIALISIS", "ALAT_BANTU_DENGAR", "OBAT_KRONIS"] as ServiceType[]) {
      const volume = (claimsByHospital.get(hospital.id) ?? [])
        .filter((c) => c.serviceType === service)
        .reduce((sum, c) => sum + c.quantity, 0);
      const capacityPerDay = serviceCapacity(hospital, service);
      const denominator = Math.max(1, capacityPerDay * windowDays);
      const ratio = volume / denominator;
      push(peerRatios, key(hospital.class, service), ratio);
    }
  }

  return {
    hospitals,
    claims,
    sensorEvents,
    hospitalById,
    claimsByHospital,
    claimsByHospitalDate,
    claimsByHospitalServiceDate,
    claimsByPatientServiceDate,
    claimsByPatientService,
    sensorsByHospitalDate,
    peerRatios,
  };
}

export function serviceCapacity(hospital: Hospital, service: ServiceType): number {
  switch (service) {
    case "FISIOTERAPI":
      return hospital.dailyCapacity.fisioterapi;
    case "HEMODIALISIS":
      return hospital.dailyCapacity.hemodialisis;
    case "ALAT_BANTU_DENGAR":
      return Math.max(1, Math.round(hospital.doctors * 0.25));
    case "OBAT_KRONIS":
      return Math.max(1, Math.round(hospital.doctors * 0.6));
    default:
      return 1;
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function result(
  claim: Claim,
  ruleId: string,
  patch: Omit<RuleResult, "ruleId" | "claimId" | "hospitalId" | "category" | "severity" | "scoreImpact">,
): RuleResult {
  const def = RULE_DEFINITIONS.find((r) => r.ruleId === ruleId);
  return {
    ruleId,
    claimId: claim.id,
    hospitalId: claim.hospitalId,
    category: def?.category ?? "KAPASITAS",
    severity: def?.severity ?? "MEDIUM",
    scoreImpact: def?.scoreImpact ?? 0,
    ...patch,
  };
}

function notTriggered(
  claim: Claim,
  ruleId: string,
  explanation: string,
  evidence: RuleEvidenceItem[],
  nilaiAktual: number | string,
  nilaiBatas: number | string,
  satuan: string,
): RuleResult {
  const def = RULE_DEFINITIONS.find((r) => r.ruleId === ruleId);
  return result(claim, ruleId, {
    triggered: false,
    explanation,
    evidence,
    nilaiAktual,
    nilaiBatas,
    satuan,
    selisih: null,
    sumber: def?.policyRefs.join("; ") ?? "",
  });
}

// ---------------------------------------------------------------------------
// CAP-001 / CAP-002 — Kapasitas
// ---------------------------------------------------------------------------

function evaluateCapacity(claim: Claim, ctx: RuleContext, ruleId: "CAP-001" | "CAP-002"): RuleResult {
  const hospital = ctx.hospitalById.get(claim.hospitalId);
  const service: ServiceType = ruleId === "CAP-001" ? "FISIOTERAPI" : "HEMODIALISIS";
  const capacityPerDay = hospital ? serviceCapacity(hospital, service) : 0;

  // Aturan kapasitas hanya berlaku untuk jenis layanan yang diperiksa.
  if (claim.serviceType !== service) {
    return notTriggered(
      claim,
      ruleId,
      `Aturan kapasitas ini hanya berlaku untuk layanan ${SERVICE_LABELS[service]}.`,
      [{ label: "Layanan klaim", value: SERVICE_LABELS[claim.serviceType] }],
      "-",
      capacityPerDay,
      `${SERVICE_UNITS[service]}/hari`,
    );
  }

  const dailyClaims = ctx.claimsByHospitalServiceDate.get(
    key(claim.hospitalId, service, claim.serviceDate),
  ) ?? [];
  const dailyTotal = dailyClaims.reduce((sum, c) => sum + c.quantity, 0);

  const resourceLabel =
    ruleId === "CAP-001"
      ? `${hospital?.physiotherapists ?? 0} fisioterapis × ${hospital?.physioSessionsPerTherapistPerDay ?? 8} sesi/hari`
      : `${hospital?.dialysisMachines ?? 0} mesin × ${hospital?.dialysisShiftsPerDay ?? 3} shift/hari`;

  const evidence: RuleEvidenceItem[] = [
    { label: "Kapasitas harian", value: `${capacityPerDay} ${SERVICE_UNITS[service]}/hari` },
    { label: "Sumber daya", value: resourceLabel },
    { label: "Klaim harian (agregat)", value: `${dailyTotal} ${SERVICE_UNITS[service]}/hari` },
    { label: "Jumlah baris klaim", value: `${dailyClaims.length} baris` },
    {
      label: "Selisih",
      value: `${Math.max(0, dailyTotal - capacityPerDay)} ${SERVICE_UNITS[service]}/hari`,
    },
  ];

  if (dailyTotal > capacityPerDay) {
    const selisih = dailyTotal - capacityPerDay;
    return result(claim, ruleId, {
      triggered: true,
      explanation:
        ruleId === "CAP-001"
          ? `Klaim melebihi kapasitas fisioterapis sebesar ${selisih} sesi/hari.`
          : `Klaim melebihi kapasitas mesin cuci darah sebesar ${selisih} sesi/hari.`,
      evidence,
      nilaiAktual: dailyTotal,
      nilaiBatas: capacityPerDay,
      satuan: `${SERVICE_UNITS[service]}/hari`,
      selisih,
      sumber: "Konfigurasi Kapasitas Prototype; Permenkes No. 16 Tahun 2019 (referensi belum tersedia)",
    });
  }

  return notTriggered(
    claim,
    ruleId,
    `Volume klaim harian (${dailyTotal} ${SERVICE_UNITS[service]}/hari) masih dalam kapasitas (${capacityPerDay} ${SERVICE_UNITS[service]}/hari).`,
    evidence,
    dailyTotal,
    capacityPerDay,
    `${SERVICE_UNITS[service]}/hari`,
  );
}

// ---------------------------------------------------------------------------
// DUP-001 / DUP-002 — Duplikasi
// ---------------------------------------------------------------------------

function evaluateDuplicateSameDay(claim: Claim, ctx: RuleContext): RuleResult {
  const group =
    ctx.claimsByPatientServiceDate.get(key(claim.patientRef, claim.serviceType, claim.serviceDate)) ?? [];
  const evidence: RuleEvidenceItem[] = [
    { label: "Referensi pasien", value: claim.patientRef },
    { label: "Layanan", value: SERVICE_LABELS[claim.serviceType] },
    { label: "Tanggal", value: claim.serviceDate },
    { label: "Jumlah kemunculan", value: `${group.length}×` },
    { label: "ID klaim terkait", value: group.map((c) => c.id).join(", ") || "-" },
  ];

  if (group.length > 1) {
    return result(claim, "DUP-001", {
      triggered: true,
      explanation: `Pasien yang sama dengan layanan dan tanggal yang sama muncul ${group.length} kali pada periode ini.`,
      evidence,
      nilaiAktual: group.length,
      nilaiBatas: 1,
      satuan: "kemunculan",
      selisih: group.length - 1,
      sumber: "Prototype: Aturan Anti-Duplikasi",
    });
  }

  return notTriggered(
    claim,
    "DUP-001",
    "Tidak ditemukan duplikasi pasien, layanan, dan tanggal yang sama.",
    evidence,
    group.length,
    1,
    "kemunculan",
  );
}

function evaluateDuplicatePaid(claim: Claim, ctx: RuleContext): RuleResult {
  const candidates = (ctx.claimsByPatientService.get(key(claim.patientRef, claim.serviceType)) ?? []).filter(
    (c) => c.id !== claim.id,
  );

  const paidMatch = claim.paidReferenceId
    ? ctx.claims.find((c) => c.id === claim.paidReferenceId && c.previouslyPaid)
    : candidates.find(
        (c) =>
          c.previouslyPaid &&
          c.serviceDate === claim.serviceDate &&
          c.totalValue === claim.totalValue,
      );

  const evidence: RuleEvidenceItem[] = [
    { label: "Referensi pasien", value: claim.patientRef },
    { label: "Layanan", value: SERVICE_LABELS[claim.serviceType] },
    {
      label: "Klaim pembanding",
      value: paidMatch ? `${paidMatch.id} (sudah dibayar)` : "Tidak ada",
    },
    { label: "Nilai klaim", value: `Rp ${claim.totalValue.toLocaleString("id-ID")}` },
  ];

  if (paidMatch) {
    return result(claim, "DUP-002", {
      triggered: true,
      explanation: `Klaim identik dengan klaim ${paidMatch.id} yang berstatus sudah dibayar.`,
      evidence,
      nilaiAktual: claim.totalValue,
      nilaiBatas: 0,
      satuan: "Rp",
      selisih: null,
      sumber: "Prototype: Aturan Anti-Duplikasi",
    });
  }

  return notTriggered(
    claim,
    "DUP-002",
    "Tidak ditemukan klaim identik yang sudah dibayar sebelumnya.",
    evidence,
    claim.totalValue,
    0,
    "Rp",
  );
}

// ---------------------------------------------------------------------------
// PRICE-001 — Kewajaran harga
// ---------------------------------------------------------------------------

function evaluatePrice(claim: Claim): RuleResult {
  const reference = REFERENCE_PRICES[claim.serviceType];
  const evidence: RuleEvidenceItem[] = [
    { label: "Harga satuan klaim", value: `Rp ${claim.unitPrice.toLocaleString("id-ID")}` },
    { label: "Harga acuan", value: `Rp ${reference.toLocaleString("id-ID")}` },
    { label: "Kuantitas", value: `${claim.quantity} ${SERVICE_UNITS[claim.serviceType]}` },
    {
      label: "Selisih nilai",
      value: `Rp ${Math.max(0, (claim.unitPrice - reference) * claim.quantity).toLocaleString("id-ID")}`,
    },
  ];

  if (claim.unitPrice > reference) {
    const diff = claim.unitPrice - reference;
    return result(claim, "PRICE-001", {
      triggered: true,
      explanation: `Harga satuan Rp ${claim.unitPrice.toLocaleString("id-ID")} berada di atas harga acuan Rp ${reference.toLocaleString("id-ID")} (selisih Rp ${diff.toLocaleString("id-ID")} per satuan).`,
      evidence,
      nilaiAktual: claim.unitPrice,
      nilaiBatas: reference,
      satuan: "Rp/satuan",
      selisih: diff,
      sumber: "Tarif Acuan Internal (sintetis)",
    });
  }

  return notTriggered(
    claim,
    "PRICE-001",
    "Harga satuan klaim tidak melebihi harga acuan.",
    evidence,
    claim.unitPrice,
    reference,
    "Rp/satuan",
  );
}

// ---------------------------------------------------------------------------
// REPLACE-001 — Masa penggantian alat
// ---------------------------------------------------------------------------

function yearsBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00.000Z`).getTime();
  const to = new Date(`${toIso}T00:00:00.000Z`).getTime();
  return Math.abs(to - from) / (365.25 * 24 * 60 * 60 * 1000);
}

function evaluateReplacement(claim: Claim, ctx: RuleContext): RuleResult {
  const minYears = REPLACEMENT_PERIOD_YEARS[claim.serviceType];
  const evidenceBase: RuleEvidenceItem[] = [
    { label: "Layanan", value: SERVICE_LABELS[claim.serviceType] },
    {
      label: "Masa penggantian minimum",
      value: minYears ? `${minYears} tahun` : "Tidak diatur",
    },
  ];

  if (!minYears) {
    return notTriggered(
      claim,
      "REPLACE-001",
      "Layanan ini tidak memiliki aturan masa penggantian pada prototype.",
      evidenceBase,
      "-",
      "-",
      "tahun",
    );
  }

  const priors = (ctx.claimsByPatientService.get(key(claim.patientRef, claim.serviceType)) ?? []).filter(
    (c) => c.id !== claim.id && c.serviceDate < claim.serviceDate,
  );

  if (priors.length === 0) {
    return notTriggered(
      claim,
      "REPLACE-001",
      "Tidak ditemukan riwayat pengajuan alat sebelumnya untuk pasien ini.",
      evidenceBase,
      "-",
      minYears,
      "tahun",
    );
  }

  const lastPrior = priors.reduce((latest, c) => (c.serviceDate > latest.serviceDate ? c : latest));
  const gap = yearsBetween(lastPrior.serviceDate, claim.serviceDate);
  const evidence: RuleEvidenceItem[] = [
    ...evidenceBase,
    { label: "Klaim sebelumnya", value: `${lastPrior.id} (${lastPrior.serviceDate})` },
    { label: "Jarak waktu", value: `${gap.toFixed(2)} tahun` },
  ];

  if (gap < minYears) {
    return result(claim, "REPLACE-001", {
      triggered: true,
      explanation: `Penggantian terjadi sebelum masa penggantian minimum (${gap.toFixed(2)} tahun < ${minYears} tahun).`,
      evidence,
      nilaiAktual: Number(gap.toFixed(2)),
      nilaiBatas: minYears,
      satuan: "tahun",
      selisih: Number((minYears - gap).toFixed(2)),
      sumber: "Konfigurasi Masa Penggantian Prototype; Permenkes No. 3 Tahun 2023 (referensi belum tersedia)",
    });
  }

  return notTriggered(
    claim,
    "REPLACE-001",
    `Jarak waktu ${gap.toFixed(2)} tahun memenuhi masa penggantian minimum ${minYears} tahun.`,
    evidence,
    Number(gap.toFixed(2)),
    minYears,
    "tahun",
  );
}

// ---------------------------------------------------------------------------
// PEER-001 — Perbandingan rumah sakit sejenis
// ---------------------------------------------------------------------------

function evaluatePeer(claim: Claim, ctx: RuleContext, capacitySuppressed: boolean): RuleResult {
  const hospital = ctx.hospitalById.get(claim.hospitalId);
  const service = claim.serviceType;
  const volume = (ctx.claimsByHospital.get(claim.hospitalId) ?? [])
    .filter((c) => c.serviceType === service)
    .reduce((sum, c) => sum + c.quantity, 0);
  const capacityPerDay = hospital ? serviceCapacity(hospital, service) : 1;
  const ratio = volume / Math.max(1, capacityPerDay * 30);

  const peerValues = (ctx.peerRatios.get(key(hospital?.class ?? "C", service)) ?? []).filter(
    (v) => v > 0,
  );
  const peerMedian = median(peerValues);

  const evidence: RuleEvidenceItem[] = [
    { label: "Peer group", value: `Kelas ${hospital?.class ?? "-"} • ${service}` },
    { label: "Volume layanan (30 hari)", value: `${volume} ${SERVICE_UNITS[service]}` },
    { label: "Intensitas per kapasitas", value: ratio.toFixed(4) },
    { label: "Median peer", value: peerMedian.toFixed(4) },
    { label: "Jumlah peer", value: `${peerValues.length} rumah sakit` },
  ];

  if (capacitySuppressed) {
    return notTriggered(
      claim,
      "PEER-001",
      "Perbandingan peer tidak dievaluasi karena aturan kapasitas sudah menandai layanan ini (menghindari penilaian berganda atas anomali yang sama).",
      evidence,
      ratio.toFixed(4),
      (peerMedian * 1.5).toFixed(4),
      "rasio",
    );
  }

  if (peerValues.length < 3 || peerMedian <= 0) {
    return notTriggered(
      claim,
      "PEER-001",
      "Jumlah rumah sakit sejenis belum cukup untuk perbandingan peer yang bermakna.",
      evidence,
      ratio.toFixed(4),
      "-",
      "rasio",
    );
  }

  const threshold = peerMedian * 1.5;
  if (ratio > threshold) {
    return result(claim, "PEER-001", {
      triggered: true,
      explanation: `Intensitas layanan ${ratio.toFixed(4)} berada ${(ratio / peerMedian).toFixed(1)}× di atas median rumah sakit sejenis (${peerMedian.toFixed(4)}).`,
      evidence,
      nilaiAktual: Number(ratio.toFixed(4)),
      nilaiBatas: Number(threshold.toFixed(4)),
      satuan: "rasio",
      selisih: Number((ratio - threshold).toFixed(4)),
      sumber: "Prototype: Metodologi Peer Group",
    });
  }

  return notTriggered(
    claim,
    "PEER-001",
    "Intensitas layanan masih dalam rentang rumah sakit sejenis.",
    evidence,
    Number(ratio.toFixed(4)),
    Number(threshold.toFixed(4)),
    "rasio",
  );
}

// ---------------------------------------------------------------------------
// IO-001 — Ketidaksesuaian dengan data sensor
// ---------------------------------------------------------------------------

function evaluateIot(claim: Claim, ctx: RuleContext): RuleResult {
  const events = ctx.sensorsByHospitalDate.get(key(claim.hospitalId, claim.serviceDate)) ?? [];
  const anomalous = events.filter((e) => e.status === "OFFLINE" || e.status === "STANDBY");
  const claimsThatDay = ctx.claimsByHospitalDate.get(key(claim.hospitalId, claim.serviceDate)) ?? [];

  const evidence: RuleEvidenceItem[] = [
    { label: "Periode klaim", value: claim.serviceDate },
    { label: "Total mesin dipantau", value: `${events.length} mesin` },
    {
      label: "Mesin OFFLINE/STANDBY",
      value:
        anomalous.length > 0
          ? anomalous.map((e) => `${e.machineId}: ${e.status}`).join(", ")
          : "Tidak ada",
    },
    { label: "Klaim pada periode", value: `${claimsThatDay.length} klaim` },
    {
      label: "Integritas tanda tangan",
      value: events.every((e) => e.signatureValid)
        ? "Semua tanda tangan valid"
        : "Terdapat tanda tangan tidak valid",
    },
  ];

  if (anomalous.length > 0 && claimsThatDay.length > 0) {
    return result(claim, "IO-001", {
      triggered: true,
      explanation: `Potensi ketidaksesuaian antara klaim dan data sensor: ${anomalous.length} mesin berada pada status OFFLINE/STANDBY pada periode ketika terdapat klaim.`,
      evidence,
      nilaiAktual: anomalous.length,
      nilaiBatas: 0,
      satuan: "mesin",
      selisih: null,
      sumber: "Prototype: Simulasi IoT/Edge AI",
    });
  }

  return notTriggered(
    claim,
    "IO-001",
    "Tidak ditemukan ketidaksesuaian antara klaim dan data sensor pada periode ini.",
    evidence,
    anomalous.length,
    0,
    "mesin",
  );
}

// ---------------------------------------------------------------------------
// Evaluasi lengkap satu klaim
// ---------------------------------------------------------------------------

export function evaluateClaim(claim: Claim, ctx: RuleContext): RuleResult[] {
  const cap1 = evaluateCapacity(claim, ctx, "CAP-001");
  const cap2 = evaluateCapacity(claim, ctx, "CAP-002");
  const capacitySuppressed =
    claim.serviceType === "FISIOTERAPI"
      ? cap1.triggered
      : claim.serviceType === "HEMODIALISIS"
        ? cap2.triggered
        : false;

  return [
    cap1,
    cap2,
    evaluateDuplicateSameDay(claim, ctx),
    evaluateDuplicatePaid(claim, ctx),
    evaluatePrice(claim),
    evaluateReplacement(claim, ctx),
    evaluatePeer(claim, ctx, capacitySuppressed),
    evaluateIot(claim, ctx),
  ];
}

// ---------------------------------------------------------------------------
// Skoring
// ---------------------------------------------------------------------------

export function categoryForScore(score: number): PriorityCategory {
  const band = PRIORITY_BANDS.find((b) => score >= b.min && score <= b.max);
  return band?.category ?? "LOW";
}

export function computePriorityScore(claimId: string, results: RuleResult[]): PriorityScore {
  const triggered = results.filter((r) => r.triggered);
  const raw = triggered.reduce((sum, r) => sum + r.scoreImpact, 0);
  const score = Math.min(MAX_PRIORITY_SCORE, raw);

  return {
    claimId,
    score,
    category: categoryForScore(score),
    breakdown: triggered.map((r) => ({
      ruleId: r.ruleId,
      label:
        RULE_DEFINITIONS.find((d) => d.ruleId === r.ruleId)?.name ?? r.ruleId,
      impact: r.scoreImpact,
    })),
    computedAt: new Date().toISOString(),
    notes:
      raw > MAX_PRIORITY_SCORE
        ? `Total bobot mentah ${raw} dibatasi pada maksimum ${MAX_PRIORITY_SCORE}.`
        : "Skor adalah penjumlahan bobot rule yang terpicu (deterministik).",
  };
}

export interface RuleEngineOutput {
  context: RuleContext;
  resultsByClaim: Map<string, RuleResult[]>;
  scoresByClaim: Map<string, PriorityScore>;
}

export function runRuleEngine(input: {
  hospitals: Hospital[];
  claims: Claim[];
  sensorEvents: SensorEvent[];
}): RuleEngineOutput {
  const context = buildRuleContext(input);
  const resultsByClaim = new Map<string, RuleResult[]>();
  const scoresByClaim = new Map<string, PriorityScore>();

  for (const claim of input.claims) {
    const results = evaluateClaim(claim, context);
    resultsByClaim.set(claim.id, results);
    scoresByClaim.set(claim.id, computePriorityScore(claim.id, results));
  }

  return { context, resultsByClaim, scoresByClaim };
}
