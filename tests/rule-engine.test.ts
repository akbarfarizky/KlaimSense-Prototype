import { describe, expect, it } from "vitest";
import { buildRuleContext, evaluateClaim, computePriorityScore } from "@/lib/rules/engine";
import { makeClaim, makeHospital, makeSensorEvent } from "./fixtures";

function evaluate(claims: ReturnType<typeof makeClaim>[], sensors: ReturnType<typeof makeSensorEvent>[] = []) {
  const hospitals = [makeHospital()];
  const ctx = buildRuleContext({ hospitals, claims, sensorEvents: sensors });
  return { ctx, hospitals };
}

function findRule(results: ReturnType<typeof evaluateClaim>, ruleId: string) {
  return results.find((r) => r.ruleId === ruleId)!;
}

describe("CAP-001 — Kapasitas Fisioterapi", () => {
  it("menandai klaim 75 sesi terhadap kapasitas 32 sesi (selisih 43)", () => {
    const claim = makeClaim({
      id: "CLM-2026-00123",
      serviceType: "FISIOTERAPI",
      quantity: 75,
      aggregateDailyLine: true,
    });
    const { ctx } = evaluate([claim]);
    const result = findRule(evaluateClaim(claim, ctx), "CAP-001");

    expect(result.triggered).toBe(true);
    expect(result.nilaiAktual).toBe(75);
    expect(result.nilaiBatas).toBe(32);
    expect(result.selisih).toBe(43);
    expect(result.explanation).toContain("43");
    expect(result.scoreImpact).toBe(40);
  });

  it("tidak menandai klaim 30 sesi terhadap kapasitas 32 sesi", () => {
    const claim = makeClaim({ serviceType: "FISIOTERAPI", quantity: 30 });
    const { ctx } = evaluate([claim]);
    const result = findRule(evaluateClaim(claim, ctx), "CAP-001");
    expect(result.triggered).toBe(false);
  });

  it("menjumlahkan beberapa baris klaim pada tanggal yang sama", () => {
    const a = makeClaim({ id: "CLM-A", serviceType: "FISIOTERAPI", quantity: 20 });
    const b = makeClaim({ id: "CLM-B", serviceType: "FISIOTERAPI", quantity: 15, patientRef: "PT-******0002" });
    const { ctx } = evaluate([a, b]);
    const result = findRule(evaluateClaim(a, ctx), "CAP-001");
    expect(result.triggered).toBe(true);
    expect(result.nilaiAktual).toBe(35);
    expect(result.selisih).toBe(3);
  });

  it("tidak berlaku untuk layanan selain fisioterapi", () => {
    const claim = makeClaim({ serviceType: "OBAT_KRONIS", quantity: 500 });
    const { ctx } = evaluate([claim]);
    const result = findRule(evaluateClaim(claim, ctx), "CAP-001");
    expect(result.triggered).toBe(false);
  });
});

describe("CAP-002 — Kapasitas Cuci Darah", () => {
  it("menandai klaim 40 sesi terhadap kapasitas 24 sesi (selisih 16)", () => {
    const claim = makeClaim({
      id: "CLM-2026-00124",
      serviceType: "HEMODIALISIS",
      quantity: 40,
      aggregateDailyLine: true,
    });
    const { ctx } = evaluate([claim]);
    const result = findRule(evaluateClaim(claim, ctx), "CAP-002");

    expect(result.triggered).toBe(true);
    expect(result.nilaiAktual).toBe(40);
    expect(result.nilaiBatas).toBe(24);
    expect(result.selisih).toBe(16);
    expect(result.explanation).toContain("16");
  });

  it("menghitung kapasitas dari mesin × shift", () => {
    const claim = makeClaim({ serviceType: "HEMODIALISIS", quantity: 40 });
    const { ctx } = evaluate([claim]);
    const result = findRule(evaluateClaim(claim, ctx), "CAP-002");
    expect(result.nilaiBatas).toBe(8 * 3);
  });
});

describe("DUP-001 — Klaim Duplikat", () => {
  it("menandai pasien + layanan + tanggal yang sama muncul dua kali", () => {
    const first = makeClaim({
      id: "CLM-2026-00130",
      patientRef: "PT-******3390",
      serviceType: "HEMODIALISIS",
      serviceDate: "2026-10-03",
    });
    const second = makeClaim({
      id: "CLM-2026-00131",
      patientRef: "PT-******3390",
      serviceType: "HEMODIALISIS",
      serviceDate: "2026-10-03",
    });
    const { ctx } = evaluate([first, second]);
    const result = findRule(evaluateClaim(second, ctx), "DUP-001");

    expect(result.triggered).toBe(true);
    expect(result.nilaiAktual).toBe(2);
    expect(result.scoreImpact).toBe(30);
  });

  it("tidak menandai klaim dengan tanggal berbeda", () => {
    const a = makeClaim({ id: "CLM-A", patientRef: "PT-******3390", serviceDate: "2026-10-03" });
    const b = makeClaim({ id: "CLM-B", patientRef: "PT-******3390", serviceDate: "2026-10-04" });
    const { ctx } = evaluate([a, b]);
    expect(findRule(evaluateClaim(b, ctx), "DUP-001").triggered).toBe(false);
  });
});

describe("DUP-002 — Klaim yang Sudah Dibayar", () => {
  it("menandai klaim identik dengan klaim yang sudah dibayar", () => {
    const paid = makeClaim({
      id: "CLM-2024-00077",
      patientRef: "PT-******9052",
      serviceType: "ALAT_BANTU_DENGAR",
      serviceDate: "2024-10-05",
      previouslyPaid: true,
    });
    const current = makeClaim({
      id: "CLM-2026-00140",
      patientRef: "PT-******9052",
      serviceType: "ALAT_BANTU_DENGAR",
      serviceDate: "2026-10-05",
      paidReferenceId: paid.id,
    });
    const { ctx } = evaluate([paid, current]);
    const result = findRule(evaluateClaim(current, ctx), "DUP-002");
    expect(result.triggered).toBe(true);
    expect(result.explanation).toContain(paid.id);
  });
});

describe("PRICE-001 — Harga di Atas Acuan", () => {
  it("menandai harga 200.000 terhadap acuan 150.000", () => {
    const claim = makeClaim({ serviceType: "FISIOTERAPI", quantity: 10, unitPrice: 200_000 });
    const { ctx } = evaluate([claim]);
    const result = findRule(evaluateClaim(claim, ctx), "PRICE-001");

    expect(result.triggered).toBe(true);
    expect(result.nilaiAktual).toBe(200_000);
    expect(result.nilaiBatas).toBe(150_000);
    expect(result.selisih).toBe(50_000);
  });

  it("tidak menandai harga sama dengan acuan", () => {
    const claim = makeClaim({ serviceType: "FISIOTERAPI", unitPrice: 150_000 });
    const { ctx } = evaluate([claim]);
    expect(findRule(evaluateClaim(claim, ctx), "PRICE-001").triggered).toBe(false);
  });
});

describe("REPLACE-001 — Masa Penggantian Alat", () => {
  it("menandai penggantian setelah 2 tahun dari masa minimum 5 tahun", () => {
    const prior = makeClaim({
      id: "CLM-2024-00077",
      patientRef: "PT-******9052",
      serviceType: "ALAT_BANTU_DENGAR",
      serviceDate: "2024-10-05",
      previouslyPaid: true,
    });
    const current = makeClaim({
      id: "CLM-2026-00140",
      patientRef: "PT-******9052",
      serviceType: "ALAT_BANTU_DENGAR",
      serviceDate: "2026-10-05",
    });
    const { ctx } = evaluate([prior, current]);
    const result = findRule(evaluateClaim(current, ctx), "REPLACE-001");

    expect(result.triggered).toBe(true);
    expect(result.nilaiBatas).toBe(5);
    expect(Number(result.nilaiAktual)).toBeCloseTo(2, 1);
    expect(result.explanation).toContain("sebelum masa penggantian minimum");
  });

  it("tidak menandai penggantian setelah 6 tahun", () => {
    const prior = makeClaim({
      id: "CLM-2020-00001",
      patientRef: "PT-******9052",
      serviceType: "ALAT_BANTU_DENGAR",
      serviceDate: "2020-01-05",
      previouslyPaid: true,
    });
    const current = makeClaim({
      id: "CLM-2026-00140",
      patientRef: "PT-******9052",
      serviceType: "ALAT_BANTU_DENGAR",
      serviceDate: "2026-10-05",
    });
    const { ctx } = evaluate([prior, current]);
    expect(findRule(evaluateClaim(current, ctx), "REPLACE-001").triggered).toBe(false);
  });
});

describe("IO-001 — Ketidaksesuaian IoT", () => {
  it("menandai klaim ketika mesin OFFLINE/STANDBY pada periode yang sama", () => {
    const claim = makeClaim({ serviceType: "HEMODIALISIS", quantity: 4 });
    const sensors = [
      makeSensorEvent({ machineId: "HD-03", status: "OFFLINE" }),
      makeSensorEvent({ machineId: "HD-05", status: "STANDBY" }),
      makeSensorEvent({ machineId: "HD-01", status: "THERAPY" }),
    ];
    const { ctx } = evaluate([claim], sensors);
    const result = findRule(evaluateClaim(claim, ctx), "IO-001");

    expect(result.triggered).toBe(true);
    expect(result.nilaiAktual).toBe(2);
    expect(result.scoreImpact).toBe(30);
    expect(result.explanation).toContain("Potensi ketidaksesuaian");
  });

  it("tidak menandai bila semua mesin THERAPY", () => {
    const claim = makeClaim({ serviceType: "HEMODIALISIS", quantity: 4 });
    const sensors = [makeSensorEvent({ machineId: "HD-01", status: "THERAPY" })];
    const { ctx } = evaluate([claim], sensors);
    expect(findRule(evaluateClaim(claim, ctx), "IO-001").triggered).toBe(false);
  });
});

describe("PEER-001 — Perbandingan Rumah Sakit Sejenis", () => {
  it("menandai rumah sakit dengan intensitas jauh di atas peer sejenis", () => {
    const hospital = makeHospital({ id: "RS-TEST-01", class: "C", physiotherapists: 4 });
    const peers = [
      makeHospital({ id: "RS-PEER-01", class: "C" }),
      makeHospital({ id: "RS-PEER-02", class: "C" }),
      makeHospital({ id: "RS-PEER-03", class: "C" }),
    ];

    const targetClaims = Array.from({ length: 25 }, (_, i) =>
      makeClaim({
        id: `CLM-T-${i}`,
        hospitalId: "RS-TEST-01",
        serviceType: "FISIOTERAPI",
        quantity: 3,
        patientRef: `PT-******10${String(i).padStart(2, "0")}`,
        serviceDate: `2026-10-${String((i % 20) + 1).padStart(2, "0")}`,
      }),
    );
    const peerClaims = peers.flatMap((p, pi) =>
      Array.from({ length: 3 }, (_, i) =>
        makeClaim({
          id: `CLM-P-${pi}-${i}`,
          hospitalId: p.id,
          serviceType: "FISIOTERAPI",
          quantity: 1,
          patientRef: `PT-******20${pi}${i}`,
          serviceDate: `2026-10-0${i + 1}`,
        }),
      ),
    );

    const hospitals = [hospital, ...peers];
    const ctx = buildRuleContext({
      hospitals,
      claims: [...targetClaims, ...peerClaims],
      sensorEvents: [],
    });
    const result = findRule(evaluateClaim(targetClaims[0], ctx), "PEER-001");
    expect(result.triggered).toBe(true);
    expect(result.category).toBe("PEER_COMPARISON");
  });

  it("tidak mengevaluasi peer ketika aturan kapasitas sudah terpicu", () => {
    const claim = makeClaim({
      serviceType: "FISIOTERAPI",
      quantity: 75,
      aggregateDailyLine: true,
    });
    const { ctx } = evaluate([claim]);
    const results = evaluateClaim(claim, ctx);
    expect(findRule(results, "CAP-001").triggered).toBe(true);
    expect(findRule(results, "PEER-001").triggered).toBe(false);
  });
});

describe("Klaim normal", () => {
  it("tidak memicu rule apa pun dan menghasilkan skor 0", () => {
    const claim = makeClaim({
      serviceType: "FISIOTERAPI",
      quantity: 2,
      unitPrice: 150_000,
      serviceDate: "2026-09-01",
    });
    const { ctx } = evaluate([claim]);
    const results = evaluateClaim(claim, ctx);
    const triggered = results.filter((r) => r.triggered);

    expect(triggered).toHaveLength(0);
    const score = computePriorityScore(claim.id, results);
    expect(score.score).toBe(0);
    expect(score.category).toBe("LOW");
    expect(score.breakdown).toHaveLength(0);
  });
});

describe("Skoring", () => {
  it("menjumlahkan bobot rule yang terpicu", () => {
    const claim = makeClaim({
      serviceType: "FISIOTERAPI",
      quantity: 75,
      unitPrice: 200_000,
      aggregateDailyLine: true,
    });
    const { ctx } = evaluate([claim]);
    const results = evaluateClaim(claim, ctx);
    const score = computePriorityScore(claim.id, results);

    expect(score.score).toBe(40 + 20);
    expect(score.category).toBe("HIGH");
    expect(score.breakdown.map((b) => b.ruleId).sort()).toEqual(["CAP-001", "PRICE-001"]);
  });

  it("membatasi skor maksimum pada 100 dan menjelaskan pembatasan", () => {
    // Kapasitas (+40) + Duplikat (+30) + Sudah dibayar (+30) + Harga (+20) = 120
    const paid = makeClaim({
      id: "CLM-2024-00001",
      patientRef: "PT-******7777",
      serviceType: "FISIOTERAPI",
      serviceDate: "2024-01-01",
      previouslyPaid: true,
    });
    const target = makeClaim({
      id: "CLM-2026-00123",
      patientRef: "PT-******7777",
      serviceType: "FISIOTERAPI",
      serviceDate: "2026-10-05",
      quantity: 75,
      unitPrice: 200_000,
      aggregateDailyLine: true,
      paidReferenceId: paid.id,
    });
    const twin = makeClaim({
      id: "CLM-2026-00199",
      patientRef: "PT-******7777",
      serviceType: "FISIOTERAPI",
      serviceDate: "2026-10-05",
      quantity: 1,
    });

    const hospitals = [makeHospital()];
    const ctx = buildRuleContext({
      hospitals,
      claims: [paid, target, twin],
      sensorEvents: [],
    });
    const results = evaluateClaim(target, ctx);
    const raw = results.filter((r) => r.triggered).reduce((sum, r) => sum + r.scoreImpact, 0);
    const score = computePriorityScore(target.id, results);

    expect(raw).toBeGreaterThan(100);
    expect(score.score).toBe(100);
    expect(score.category).toBe("CRITICAL");
    expect(score.notes).toContain("dibatasi");
  });

  it("menentukan band kategori sesuai rentang", () => {
    const cases: [number, string][] = [
      [0, "LOW"],
      [29, "LOW"],
      [30, "MEDIUM"],
      [59, "MEDIUM"],
      [60, "HIGH"],
      [79, "HIGH"],
      [80, "CRITICAL"],
      [100, "CRITICAL"],
    ];
    for (const [score, expected] of cases) {
      const breakdown = [{ ruleId: "X", label: "X", impact: score }];
      const results = [
        {
          ruleId: "X",
          claimId: "c",
          hospitalId: "h",
          category: "KAPASITAS" as const,
          triggered: true,
          severity: "HIGH" as const,
          explanation: "",
          evidence: [],
          nilaiAktual: 0,
          nilaiBatas: 0,
          satuan: "",
          selisih: null,
          sumber: "",
          scoreImpact: score,
        },
      ];
      void breakdown;
      const computed = computePriorityScore("c", results);
      expect(computed.category).toBe(expected);
    }
  });
});

describe("Determinisme", () => {
  it("menghasilkan hasil identik untuk input identik", () => {
    const build = () => {
      const claim = makeClaim({
        serviceType: "HEMODIALISIS",
        quantity: 40,
        aggregateDailyLine: true,
      });
      const { ctx } = evaluate([claim]);
      return evaluateClaim(claim, ctx);
    };
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });
});
