import type { PolicyDocument, RuleDefinition, ServiceType } from "@/types";

/**
 * Tarif acuan sintetis untuk prototype.
 * Angka ini BUKAN tarif resmi dan hanya dipakai untuk mendemonstrasikan mesin aturan.
 */
export const REFERENCE_PRICES: Record<ServiceType, number> = {
  FISIOTERAPI: 150_000,
  HEMODIALISIS: 450_000,
  ALAT_BANTU_DENGAR: 2_500_000,
  OBAT_KRONIS: 350_000,
};

export const SERVICE_UNITS: Record<ServiceType, string> = {
  FISIOTERAPI: "sesi",
  HEMODIALISIS: "sesi",
  ALAT_BANTU_DENGAR: "unit",
  OBAT_KRONIS: "bulan",
};

/** Masa penggantian minimum (tahun) per jenis layanan alat. */
export const REPLACEMENT_PERIOD_YEARS: Partial<Record<ServiceType, number>> = {
  ALAT_BANTU_DENGAR: 5,
};

/** Kapasitas default per sumber daya. */
export const PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY = 8;
export const DIALYSIS_SHIFTS_PER_DAY = 3;

export const RULE_SCORE_WEIGHTS = {
  CAP_VIOLATION: 40,
  DUPLICATE: 30,
  PRICE_ABOVE_REFERENCE: 20,
  REPLACEMENT_VIOLATION: 20,
  PEER_ANOMALY: 10,
  IOT_MISMATCH: 30,
} as const;

export const MAX_PRIORITY_SCORE = 100;

export const PRIORITY_BANDS: {
  category: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  min: number;
  max: number;
}[] = [
  { category: "LOW", min: 0, max: 29 },
  { category: "MEDIUM", min: 30, max: 59 },
  { category: "HIGH", min: 60, max: 79 },
  { category: "CRITICAL", min: 80, max: 100 },
];

export const RULE_DEFINITIONS: RuleDefinition[] = [
  {
    ruleId: "CAP-001",
    name: "Kapasitas Fisioterapi",
    category: "KAPASITAS",
    severity: "HIGH",
    scoreImpact: RULE_SCORE_WEIGHTS.CAP_VIOLATION,
    active: true,
    description:
      "Memeriksa apakah volume klaim fisioterapi pada satu hari melebihi kapasitas nyata tenaga fisioterapis rumah sakit.",
    threshold: "Klaim harian > (jumlah fisioterapis × sesi maksimal per fisioterapis per hari)",
    formula: "selisih = klaim_harian − (fisioterapis × 8)",
    example:
      "4 fisioterapis × 8 sesi = 32 sesi/hari. Klaim 75 sesi/hari → 43 sesi di atas kapasitas.",
    dataUsed: ["jumlah fisioterapis", "sesi maksimal per fisioterapis", "klaim fisioterapi harian"],
    policyRefs: ["Permenkes No. 16 Tahun 2019", "Konfigurasi Kapasitas Prototype"],
  },
  {
    ruleId: "CAP-002",
    name: "Kapasitas Cuci Darah (Hemodialisis)",
    category: "KAPASITAS",
    severity: "HIGH",
    scoreImpact: RULE_SCORE_WEIGHTS.CAP_VIOLATION,
    active: true,
    description:
      "Memeriksa apakah volume klaim hemodialisis pada satu hari melebihi kapasitas mesin dan shift rumah sakit.",
    threshold: "Klaim harian > (jumlah mesin × jumlah shift per hari)",
    formula: "selisih = klaim_harian − (mesin × 3)",
    example: "8 mesin × 3 shift = 24 sesi/hari. Klaim 40 sesi → 16 sesi di atas kapasitas.",
    dataUsed: ["jumlah mesin cuci darah", "jumlah shift per hari", "klaim hemodialisis harian"],
    policyRefs: ["Permenkes No. 16 Tahun 2019", "Konfigurasi Kapasitas Prototype"],
  },
  {
    ruleId: "DUP-001",
    name: "Klaim Duplikat",
    category: "DUPLIKASI",
    severity: "HIGH",
    scoreImpact: RULE_SCORE_WEIGHTS.DUPLICATE,
    active: true,
    description:
      "Mendeteksi kombinasi pasien, layanan, dan tanggal yang sama muncul lebih dari satu kali dalam periode klaim.",
    threshold: "jumlah kemunculan (pasien + layanan + tanggal) > 1",
    formula: "count(group by patientRef, serviceType, serviceDate) > 1",
    example:
      "PT-******4821 dengan fisioterapi pada 2026-10-05 muncul 2 kali → indikasi klaim berulang.",
    dataUsed: ["referensi pasien", "jenis layanan", "tanggal layanan"],
    policyRefs: ["Prototype: Aturan Anti-Duplikasi"],
  },
  {
    ruleId: "DUP-002",
    name: "Klaim Identik yang Sudah Dibayar",
    category: "DUPLIKASI",
    severity: "HIGH",
    scoreImpact: RULE_SCORE_WEIGHTS.DUPLICATE,
    active: true,
    description:
      "Mendeteksi klaim yang identik dengan klaim sebelumnya yang statusnya sudah dibayar.",
    threshold: "terdapat klaim identik dengan referensi yang sudah dibayar",
    formula: "exists(claim.paidReferenceId ∈ claims[previouslyPaid])",
    example: "Klaim sesi hemodialisis yang sama diajukan kembali setelah dibayar sebelumnya.",
    dataUsed: ["referensi klaim dibayar", "pasien", "layanan", "tanggal", "nilai"],
    policyRefs: ["Prototype: Aturan Anti-Duplikasi"],
  },
  {
    ruleId: "PRICE-001",
    name: "Harga di Atas Acuan",
    category: "KEWAJARAN_HARGA",
    severity: "MEDIUM",
    scoreImpact: RULE_SCORE_WEIGHTS.PRICE_ABOVE_REFERENCE,
    active: true,
    description:
      "Membandingkan harga satuan klaim dengan harga acuan sintetis untuk jenis layanan yang sama.",
    threshold: "harga_satuan_klaim > harga_acuan",
    formula: "selisih = (harga_klaim − harga_acuan) × kuantitas",
    example: "Fisioterapi klaim Rp200.000/sesi sedangkan acuan Rp150.000/sesi.",
    dataUsed: ["harga satuan klaim", "harga acuan layanan", "kuantitas"],
    policyRefs: ["Tarif Acuan Internal (sintetis)"],
  },
  {
    ruleId: "REPLACE-001",
    name: "Masa Penggantian Alat",
    category: "MASA_PENGGANTIAN",
    severity: "MEDIUM",
    scoreImpact: RULE_SCORE_WEIGHTS.REPLACEMENT_VIOLATION,
    active: true,
    description:
      "Memeriksa pengajuan penggantian alat bantu sebelum masa penggantian minimum terpenuhi.",
    threshold: "jarak waktu sejak klaim alat sebelumnya < masa penggantian minimum",
    formula: "selisih_tahun = tahun_klaim_baru − tahun_klaim_sebelumnya; trigger jika < 5",
    example: "Alat bantu dengar masa penggantian 5 tahun, diklaim kembali setelah 2 tahun.",
    dataUsed: ["riwayat klaim alat", "tanggal klaim", "masa penggantian minimum"],
    policyRefs: ["Permenkes No. 3 Tahun 2023", "Konfigurasi Masa Penggantian Prototype"],
  },
  {
    ruleId: "PEER-001",
    name: "Perbandingan Rumah Sakit Sejenis",
    category: "PEER_COMPARISON",
    severity: "LOW",
    scoreImpact: RULE_SCORE_WEIGHTS.PEER_ANOMALY,
    active: true,
    description:
      "Membandingkan intensitas layanan rumah sakit dengan rumah sakit sejenis (kelas dan wilayah sama), bukan dengan rumah sakit besar.",
    threshold: "rasio volume layanan per tempat tidur > median peer × 1.5",
    formula: "rasio = klaim_layanan / tempat_tidur; trigger jika rasio > 1.5 × median_peer",
    example: "Rumah sakit kelas C dengan volume hemodialisis jauh di atas peer kelas C sejenis.",
    dataUsed: ["kelas rumah sakit", "wilayah", "tempat tidur", "volume layanan"],
    policyRefs: ["Prototype: Metodologi Peer Group"],
  },
  {
    ruleId: "IO-001",
    name: "Ketidaksesuaian Klaim dengan Data Sensor",
    category: "IOT",
    severity: "HIGH",
    scoreImpact: RULE_SCORE_WEIGHTS.IOT_MISMATCH,
    active: true,
    description:
      "Membandingkan klaim pada suatu periode dengan simulasi telemetri mesin. Mesin OFFLINE/STANDBY pada periode klaim merupakan potensi ketidaksesuaian.",
    threshold: "terdapat klaim pada periode dengan mesin berstatus OFFLINE atau STANDBY",
    formula: "trigger jika count(klaim_periode) > 0 AND exists(mesin OFFLINE/STANDBY)",
    example:
      "Mesin 3 OFFLINE, Mesin 5 STANDBY, Mesin 7 OFFLINE ketika terdapat klaim hemodialisis.",
    dataUsed: ["status mesin", "timestamp sensor", "klaim per periode"],
    policyRefs: ["Prototype: Simulasi IoT/Edge AI"],
  },
];

export const POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    docId: "PERMENKES-16-2019",
    title: "Permenkes No. 16 Tahun 2019",
    issuer: "Kementerian Kesehatan RI",
    year: 2019,
    available: false,
    excerpt: "Referensi resmi belum tersedia dalam prototype.",
    tags: ["kapasitas", "fasilitas kesehatan"],
  },
  {
    docId: "PERMENKES-3-2023",
    title: "Permenkes No. 3 Tahun 2023",
    issuer: "Kementerian Kesehatan RI",
    year: 2023,
    available: false,
    excerpt: "Referensi resmi belum tersedia dalam prototype.",
    tags: ["standar", "pelayanan"],
  },
  {
    docId: "PROTO-KAPASITAS",
    title: "Konfigurasi Kapasitas Prototype",
    issuer: "KlaimSense (sintetis)",
    year: 2026,
    available: true,
    excerpt:
      "Kapasitas fisioterapi = jumlah fisioterapis × 8 sesi/hari. Kapasitas hemodialisis = jumlah mesin × 3 shift/hari.",
    tags: ["kapasitas"],
  },
  {
    docId: "PROTO-TARIF",
    title: "Tarif Acuan Internal (sintetis)",
    issuer: "KlaimSense (sintetis)",
    year: 2026,
    available: true,
    excerpt:
      "Tarif acuan sintetis: Fisioterapi Rp150.000/sesi; Hemodialisis Rp450.000/sesi; Alat Bantu Dengar Rp2.500.000/unit; Obat Kronis Rp350.000/bulan.",
    tags: ["harga", "kewajaran"],
  },
  {
    docId: "PROTO-DUPLIKASI",
    title: "Aturan Anti-Duplikasi Prototype",
    issuer: "KlaimSense (sintetis)",
    year: 2026,
    available: true,
    excerpt:
      "Klaim dengan kombinasi pasien, layanan, dan tanggal yang sama tidak boleh diajukan lebih dari satu kali.",
    tags: ["duplikasi"],
  },
  {
    docId: "PROTO-PEER",
    title: "Metodologi Peer Group Prototype",
    issuer: "KlaimSense (sintetis)",
    year: 2026,
    available: true,
    excerpt:
      "Perbandingan hanya dilakukan terhadap rumah sakit dengan kelas dan wilayah yang sama, dinormalisasi terhadap jumlah tempat tidur.",
    tags: ["peer"],
  },
  {
    docId: "PROTO-IOT",
    title: "Simulasi IoT/Edge AI Prototype",
    issuer: "KlaimSense (sintetis)",
    year: 2026,
    available: true,
    excerpt:
      "Status mesin disimulasikan dari pola arus dan konsumsi daya. Nilai simulasi prototype, bukan validasi pada data rumah sakit nyata.",
    tags: ["iot", "edge-ai"],
  },
];

export function getRuleDefinition(ruleId: string): RuleDefinition | undefined {
  return RULE_DEFINITIONS.find((r) => r.ruleId === ruleId);
}

export function getPolicyDocument(docId: string): PolicyDocument | undefined {
  return POLICY_DOCUMENTS.find((d) => d.docId === docId);
}
