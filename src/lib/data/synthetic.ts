import {
  DIALYSIS_SHIFTS_PER_DAY,
  PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
  REFERENCE_PRICES,
} from "@/lib/reference-data";
import { createRng, DEFAULT_SEED, type SeededRng } from "./rng";
import type {
  Claim,
  Hospital,
  HospitalClass,
  MachineStatus,
  Region,
  SensorEvent,
  ServiceType,
} from "@/types";

export interface SyntheticDataset {
  hospitals: Hospital[];
  claims: Claim[];
  sensorEvents: SensorEvent[];
  seed: number;
  generatedAt: string;
}

const REGIONS: Region[] = [
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Sumatera Utara",
  "Sulawesi Selatan",
  "Bali",
];

const RS_PREFIX = ["RS", "RSUD", "RSIA", "RSU"] as const;
const RS_WORD_A = [
  "Sehat",
  "Bina",
  "Harapan",
  "Cahaya",
  "Mitra",
  "Sinar",
  "Karya",
  "Amanah",
  "Bhakti",
  "Prima",
  "Mandiri",
  "Nusantara",
  "Anugerah",
  "Bunda",
  "Kartika",
  "Pelita",
  "Mulia",
  "Tunas",
  "Wijaya",
  "Cendana",
  "Melati",
  "Permata",
  "Samudra",
  "Bintang",
  "Waluya",
] as const;
const RS_WORD_B = [
  "Sentosa",
  "Husada",
  "Medika",
  "Sejahtera",
  "Jaya",
  "Abadi",
  "Utama",
  "Bakti",
  "Insani",
  "Lestari",
  "Farma",
  "Sehat",
  "Kencana",
  "Asih",
  "Pratama",
] as const;

const SERVICE_ROTATION: ServiceType[] = [
  "FISIOTERAPI",
  "FISIOTERAPI",
  "HEMODIALISIS",
  "HEMODIALISIS",
  "OBAT_KRONIS",
  "ALAT_BANTU_DENGAR",
];

const CLASS_PROFILE: Record<
  HospitalClass,
  { beds: [number, number]; doctors: [number, number]; physio: [number, number]; dialysis: [number, number] }
> = {
  A: { beds: [420, 780], doctors: [140, 300], physio: [8, 14], dialysis: [12, 24] },
  B: { beds: [200, 360], doctors: [60, 120], physio: [5, 9], dialysis: [6, 12] },
  C: { beds: [100, 180], doctors: [25, 55], physio: [3, 6], dialysis: [3, 8] },
  D: { beds: [50, 95], doctors: [12, 24], physio: [2, 4], dialysis: [2, 4] },
};

const DEMO_WINDOW_DAYS = 30;
const DEMO_WINDOW_END = "2026-10-05";

/** ID klaim yang direservasi untuk skenario demo utama. */
export const RESERVED_CLAIM_IDS = new Set([
  "CLM-2026-00123",
  "CLM-2026-00124",
  "CLM-2026-00125",
  "CLM-2026-00130",
  "CLM-2026-00131",
  "CLM-2026-00140",
]);

function isoDateMinusDays(endIso: string, daysBack: number): string {
  const date = new Date(`${endIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function buildHospitals(rng: SeededRng): Hospital[] {
  const hospitals: Hospital[] = [];

  // Rumah sakit utama untuk demo (spesifikasi Healthkathon).
  const demo: Hospital = {
    id: "RS-H-001",
    name: "RS Sehat Sentosa",
    region: "DKI Jakarta",
    class: "B",
    ownership: "Swasta",
    beds: 240,
    doctors: 48,
    physiotherapists: 4,
    dialysisMachines: 8,
    dialysisShiftsPerDay: DIALYSIS_SHIFTS_PER_DAY,
    physioSessionsPerTherapistPerDay: PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
    rooms: 60,
    dailyCapacity: {
      fisioterapi: 4 * PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
      hemodialisis: 8 * DIALYSIS_SHIFTS_PER_DAY,
    },
  };
  hospitals.push(demo);

  const usedNames = new Set([demo.name]);
  const classPlan: HospitalClass[] = [
    ...Array<HospitalClass>(8).fill("A"),
    ...Array<HospitalClass>(12).fill("B"),
    ...Array<HospitalClass>(7).fill("C"),
    ...Array<HospitalClass>(2).fill("D"),
  ];

  for (let i = 0; i < 29; i += 1) {
    let name = "";
    let guard = 0;
    do {
      const prefix = rng.pick(RS_PREFIX);
      const a = rng.pick(RS_WORD_A);
      const b = rng.pick(RS_WORD_B);
      name = `${prefix} ${a} ${b}`;
      guard += 1;
    } while (usedNames.has(name) && guard < 50);
    usedNames.add(name);

    const klass = classPlan[i] ?? "C";
    const profile = CLASS_PROFILE[klass];
    const beds = rng.int(profile.beds[0], profile.beds[1]);
    const doctors = rng.int(profile.doctors[0], profile.doctors[1]);
    const physiotherapists = rng.int(profile.physio[0], profile.physio[1]);
    const dialysisMachines = rng.int(profile.dialysis[0], profile.dialysis[1]);

    hospitals.push({
      id: `RS-H-${String(i + 2).padStart(3, "0")}`,
      name,
      region: rng.pick(REGIONS),
      class: klass,
      ownership: rng.bool(0.45) ? "Pemerintah" : "Swasta",
      beds,
      doctors,
      physiotherapists,
      dialysisMachines,
      dialysisShiftsPerDay: DIALYSIS_SHIFTS_PER_DAY,
      physioSessionsPerTherapistPerDay: PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
      rooms: Math.round(beds * rng.int(20, 30) * 0.01),
      dailyCapacity: {
        fisioterapi: physiotherapists * PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
        hemodialisis: dialysisMachines * DIALYSIS_SHIFTS_PER_DAY,
      },
    });
  }

  return hospitals;
}

function dailyCapacityFor(hospital: Hospital, service: ServiceType): number {
  switch (service) {
    case "FISIOTERAPI":
      return hospital.dailyCapacity.fisioterapi;
    case "HEMODIALISIS":
      return hospital.dailyCapacity.hemodialisis;
    case "ALAT_BANTU_DENGAR":
      return Math.max(1, Math.round(hospital.doctors * 0.25));
    default:
      return Math.max(1, Math.round(hospital.doctors * 0.6));
  }
}

function patientRef(rng: SeededRng): string {
  return `PT-******${rng.int(1000, 9999)}`;
}

function descriptionFor(service: ServiceType, quantity: number): string {
  switch (service) {
    case "FISIOTERAPI":
      return `Sesi terapi fisik (${quantity} sesi) — data sintetis`;
    case "HEMODIALISIS":
      return `Sesi cuci darah (${quantity} sesi) — data sintetis`;
    case "ALAT_BANTU_DENGAR":
      return `Pengajuan alat bantu dengar (${quantity} unit) — data sintetis`;
    case "OBAT_KRONIS":
      return `Klaim obat penyakit kronis (${quantity} bulan) — data sintetis`;
    default:
      return "Klaim sintetis";
  }
}

export function generateSyntheticDataset(
  seed: number = DEFAULT_SEED,
): SyntheticDataset {
  const rng = createRng(seed);
  const hospitals = buildHospitals(rng);
  const claims: Claim[] = [];
  let claimSeq = 1;

  // ID klaim yang dipakai skenario demo harus direservasi agar tidak bertabrakan
  // dengan ID yang dibangkitkan otomatis.
  const nextId = () => {
    let id = `CLM-2026-${String(claimSeq++).padStart(5, "0")}`;
    while (RESERVED_CLAIM_IDS.has(id)) {
      id = `CLM-2026-${String(claimSeq++).padStart(5, "0")}`;
    }
    return id;
  };

  const dates: string[] = [];
  for (let i = DEMO_WINDOW_DAYS - 1; i >= 0; i -= 1) {
    dates.push(isoDateMinusDays(DEMO_WINDOW_END, i));
  }

  const addClaim = (partial: Omit<Claim, "id" | "totalValue"> & { id?: string }): Claim => {
    const claim: Claim = {
      ...partial,
      id: partial.id ?? nextId(),
      totalValue: partial.quantity * partial.unitPrice,
    };
    claims.push(claim);
    return claim;
  };

  // ---------- Klaim normal & semi-normal untuk seluruh rumah sakit ----------
  for (const hospital of hospitals) {
    if (hospital.id === "RS-H-001") continue; // demo hospital dibuat eksplisit

    for (const date of dates) {
      if (!rng.bool(0.55)) continue;
      const service = rng.pick(SERVICE_ROTATION);
      let quantity: number;
      let unitPrice = REFERENCE_PRICES[service];

      switch (service) {
        case "FISIOTERAPI":
          quantity = rng.int(1, 6);
          break;
        case "HEMODIALISIS":
          quantity = rng.int(1, 4);
          break;
        case "ALAT_BANTU_DENGAR":
          quantity = rng.int(1, 2);
          break;
        default:
          quantity = rng.int(1, 3);
      }

      // Inflated billing: ~8% klaim dengan harga di atas acuan.
      if (rng.bool(0.08)) {
        unitPrice = Math.round(unitPrice * (1.2 + rng.next() * 0.5));
      }

      const previouslyPaid = rng.bool(0.4);

      addClaim({
        hospitalId: hospital.id,
        patientRef: patientRef(rng),
        serviceType: service,
        serviceDate: date,
        quantity,
        unitPrice,
        description: descriptionFor(service, quantity),
        previouslyPaid,
        aggregateDailyLine: false,
      });

      // Repeat billing: ~4% duplikasi pasien+layanan+tanggal.
      if (rng.bool(0.04)) {
        const patient = patientRef(rng);
        const dupService = rng.pick(SERVICE_ROTATION);
        const qty = rng.int(1, 3);
        const first = addClaim({
          hospitalId: hospital.id,
          patientRef: patient,
          serviceType: dupService,
          serviceDate: date,
          quantity: qty,
          unitPrice: REFERENCE_PRICES[dupService],
          description: descriptionFor(dupService, qty),
          previouslyPaid: false,
          aggregateDailyLine: false,
        });
        addClaim({
          hospitalId: hospital.id,
          patientRef: patient,
          serviceType: dupService,
          serviceDate: date,
          quantity: qty,
          unitPrice: REFERENCE_PRICES[dupService],
          description: descriptionFor(dupService, qty),
          previouslyPaid: false,
          aggregateDailyLine: false,
          duplicateOf: first.id,
        });
      }
    }
  }

  // ---------- Anomali kapasitas terdistribusi ----------
  const anomalyTargets = hospitals.filter((h) => h.id !== "RS-H-001");
  for (const hospital of anomalyTargets) {
    if (!rng.bool(0.45)) continue;
    const date = rng.pick(dates);
    const isPhysio = rng.bool(0.5);
    if (isPhysio) {
      const over = Math.round(hospital.dailyCapacity.fisioterapi * (0.4 + rng.next() * 0.8));
      addClaim({
        hospitalId: hospital.id,
        patientRef: patientRef(rng),
        serviceType: "FISIOTERAPI",
        serviceDate: date,
        quantity: Math.max(1, over),
        unitPrice: REFERENCE_PRICES.FISIOTERAPI,
        description: "Baris klaim agregat harian — data sintetis",
        previouslyPaid: false,
        aggregateDailyLine: true,
      });
    } else {
      const over = Math.round(hospital.dailyCapacity.hemodialisis * (0.4 + rng.next() * 0.8));
      addClaim({
        hospitalId: hospital.id,
        patientRef: patientRef(rng),
        serviceType: "HEMODIALISIS",
        serviceDate: date,
        quantity: Math.max(1, over),
        unitPrice: REFERENCE_PRICES.HEMODIALISIS,
        description: "Baris klaim agregat harian — data sintetis",
        previouslyPaid: false,
        aggregateDailyLine: true,
      });
    }
  }

  // ---------- Anomali masa penggantian alat bantu dengar ----------
  for (const hospital of rng.shuffle(hospitals.filter((h) => h.id !== "RS-H-001")).slice(0, 6)) {
    const priorDate = isoDateMinusDays(DEMO_WINDOW_END, rng.int(700, 900)); // ~2 tahun
    const prior = addClaim({
      hospitalId: hospital.id,
      patientRef: "PT-******0000",
      serviceType: "ALAT_BANTU_DENGAR",
      serviceDate: priorDate,
      quantity: 1,
      unitPrice: REFERENCE_PRICES.ALAT_BANTU_DENGAR,
      description: "Riwayat pengajuan alat bantu dengar — data sintetis",
      previouslyPaid: true,
      aggregateDailyLine: false,
    });
    const patient = patientRef(rng);
    // samakan pasien riwayat
    prior.patientRef = patient;
    addClaim({
      hospitalId: hospital.id,
      patientRef: patient,
      serviceType: "ALAT_BANTU_DENGAR",
      serviceDate: isoDateMinusDays(DEMO_WINDOW_END, rng.int(5, 25)),
      quantity: 1,
      unitPrice: REFERENCE_PRICES.ALAT_BANTU_DENGAR,
      description: "Pengajuan penggantian alat bantu dengar — data sintetis",
      previouslyPaid: false,
      aggregateDailyLine: false,
      paidReferenceId: prior.id,
    });
  }

  // ---------- Pola peer abnormal ----------
  // Volume tinggi yang tersebar (tidak melebihi kapasitas harian) sehingga hanya
  // terdeteksi melalui perbandingan peer, bukan aturan kapasitas.
  const peerAnomalyTargets = rng
    .shuffle(hospitals.filter((h) => h.id !== "RS-H-001"))
    .slice(0, 5);
  for (const hospital of peerAnomalyTargets) {
    const service: ServiceType = rng.bool(0.5) ? "FISIOTERAPI" : "HEMODIALISIS";
    for (let i = 0; i < 14; i += 1) {
      const date = rng.pick(dates);
      const perDayCap = Math.max(2, Math.floor(dailyCapacityFor(hospital, service) / 4));
      addClaim({
        hospitalId: hospital.id,
        patientRef: patientRef(rng),
        serviceType: service,
        serviceDate: date,
        quantity: Math.max(1, rng.int(1, perDayCap)),
        unitPrice: REFERENCE_PRICES[service],
        description: "Klaim volume tinggi (pola peer abnormal) — data sintetis",
        previouslyPaid: rng.bool(0.5),
        aggregateDailyLine: false,
      });
    }
  }

  // ---------- RS Sehat Sentosa: skenario demo utama ----------
  const demoHospital = hospitals[0];
  const heroDate = DEMO_WINDOW_END; // 2026-10-05

  // Fisioterapi: 75 sesi/hari (kapasitas 32) — +43 sesi
  addClaim({
    id: "CLM-2026-00123",
    hospitalId: demoHospital.id,
    patientRef: "PT-******4821",
    serviceType: "FISIOTERAPI",
    serviceDate: heroDate,
    quantity: 75,
    unitPrice: 200_000, // di atas acuan Rp150.000
    description: "Baris klaim agregat harian fisioterapi — data sintetis",
    previouslyPaid: false,
    aggregateDailyLine: true,
  });

  // Hemodialisis: 40 sesi/hari (kapasitas 24) — +16 sesi
  addClaim({
    id: "CLM-2026-00124",
    hospitalId: demoHospital.id,
    patientRef: "PT-******7710",
    serviceType: "HEMODIALISIS",
    serviceDate: heroDate,
    quantity: 40,
    unitPrice: REFERENCE_PRICES.HEMODIALISIS,
    description: "Baris klaim agregat harian hemodialisis — data sintetis",
    previouslyPaid: false,
    aggregateDailyLine: true,
  });

  // Klaim individual fisioterapi pasien yang sama pada hari sebelumnya.
  // Sengaja BUKAN pada 2026-10-05 agar agregat harian tepat 75 sesi.
  addClaim({
    id: "CLM-2026-00125",
    hospitalId: demoHospital.id,
    patientRef: "PT-******4821",
    serviceType: "FISIOTERAPI",
    serviceDate: isoDateMinusDays(heroDate, 1),
    quantity: 6,
    unitPrice: 200_000,
    description: descriptionFor("FISIOTERAPI", 6),
    previouslyPaid: false,
    aggregateDailyLine: false,
  });

  // Duplikasi jelas: pasien + layanan + tanggal sama dua kali
  addClaim({
    id: "CLM-2026-00130",
    hospitalId: demoHospital.id,
    patientRef: "PT-******3390",
    serviceType: "HEMODIALISIS",
    serviceDate: "2026-10-03",
    quantity: 1,
    unitPrice: REFERENCE_PRICES.HEMODIALISIS,
    description: descriptionFor("HEMODIALISIS", 1),
    previouslyPaid: false,
    aggregateDailyLine: false,
  });
  addClaim({
    id: "CLM-2026-00131",
    hospitalId: demoHospital.id,
    patientRef: "PT-******3390",
    serviceType: "HEMODIALISIS",
    serviceDate: "2026-10-03",
    quantity: 1,
    unitPrice: REFERENCE_PRICES.HEMODIALISIS,
    description: descriptionFor("HEMODIALISIS", 1),
    previouslyPaid: false,
    aggregateDailyLine: false,
    duplicateOf: "CLM-2026-00130",
  });

  // Masa penggantian alat bantu dengar di RS demo (2 tahun dari masa 5 tahun)
  const demoPrior = addClaim({
    id: "CLM-2024-00077",
    hospitalId: demoHospital.id,
    patientRef: "PT-******9052",
    serviceType: "ALAT_BANTU_DENGAR",
    serviceDate: "2024-10-05",
    quantity: 1,
    unitPrice: REFERENCE_PRICES.ALAT_BANTU_DENGAR,
    description: "Riwayat pengajuan alat bantu dengar — data sintetis",
    previouslyPaid: true,
    aggregateDailyLine: false,
  });
  addClaim({
    id: "CLM-2026-00140",
    hospitalId: demoHospital.id,
    patientRef: demoPrior.patientRef,
    serviceType: "ALAT_BANTU_DENGAR",
    serviceDate: "2026-10-05",
    quantity: 1,
    unitPrice: REFERENCE_PRICES.ALAT_BANTU_DENGAR,
    description: "Pengajuan penggantian alat bantu dengar — data sintetis",
    previouslyPaid: false,
    aggregateDailyLine: false,
    paidReferenceId: demoPrior.id,
  });

  // Klaim hemodialisis normal lain di RS demo untuk melengkapi periode
  for (let i = 1; i <= 6; i += 1) {
    const date = isoDateMinusDays(heroDate, i);
    addClaim({
      hospitalId: demoHospital.id,
      patientRef: patientRef(rng),
      serviceType: rng.pick(SERVICE_ROTATION),
      serviceDate: date,
      quantity: rng.int(1, 4),
      unitPrice: REFERENCE_PRICES.FISIOTERAPI,
      description: "Klaim sintetis RS Sehat Sentosa",
      previouslyPaid: rng.bool(0.4),
      aggregateDailyLine: false,
    });
  }

  // ---------- Simulasi telemetri IoT ----------
  const sensorEvents = generateSensorEvents(rng, hospitals, dates.slice(-5));

  return {
    hospitals,
    claims,
    sensorEvents,
    seed,
    generatedAt: new Date().toISOString(),
  };
}

function machineStatusFor(rng: SeededRng, isDemoHeroPeriod: boolean, index: number): MachineStatus {
  if (isDemoHeroPeriod) {
    // Spesifikasi demo: Mesin 3 OFFLINE, Mesin 5 STANDBY, Mesin 7 OFFLINE.
    if (index === 3 || index === 7) return "OFFLINE";
    if (index === 5) return "STANDBY";
    return "THERAPY";
  }
  const roll = rng.next();
  if (roll < 0.62) return "THERAPY";
  if (roll < 0.85) return "STANDBY";
  return "OFFLINE";
}

function telemetryFor(status: MachineStatus, rng: SeededRng) {
  switch (status) {
    case "THERAPY":
      return { powerWatts: rng.int(1350, 1750), currentAmps: Number((rng.next() * 1.4 + 5.6).toFixed(2)) };
    case "STANDBY":
      return { powerWatts: rng.int(180, 420), currentAmps: Number((rng.next() * 0.9 + 0.6).toFixed(2)) };
    case "OFFLINE":
    default:
      return { powerWatts: rng.int(0, 25), currentAmps: Number((rng.next() * 0.08).toFixed(2)) };
  }
}

function generateSensorEvents(
  rng: SeededRng,
  hospitals: Hospital[],
  dates: string[],
): SensorEvent[] {
  const events: SensorEvent[] = [];

  for (const hospital of hospitals) {
    const machineCount = Math.min(hospital.dialysisMachines, 8);
    for (const date of dates) {
      const isDemoHeroPeriod = hospital.id === "RS-H-001" && date === DEMO_WINDOW_END;
      for (let m = 1; m <= machineCount; m += 1) {
        const status = machineStatusFor(rng, isDemoHeroPeriod, m);
        const telemetry = telemetryFor(status, rng);
        const timestamp = `${date}T${String(rng.int(6, 20)).padStart(2, "0")}:${String(
          rng.int(0, 59),
        ).padStart(2, "0")}:00.000Z`;
        events.push({
          id: `SEN-${hospital.id}-${date}-${m}`,
          hospitalId: hospital.id,
          machineId: `HD-${String(m).padStart(2, "0")}`,
          status,
          powerWatts: telemetry.powerWatts,
          currentAmps: telemetry.currentAmps,
          timestamp,
          signatureValid: !rng.bool(0.03),
          periodDate: date,
        });
      }
    }
  }

  return events;
}

let cachedDataset: SyntheticDataset | null = null;

export function getSyntheticDataset(): SyntheticDataset {
  if (!cachedDataset) {
    cachedDataset = generateSyntheticDataset(DEFAULT_SEED);
  }
  return cachedDataset;
}
