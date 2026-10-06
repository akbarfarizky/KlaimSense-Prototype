import type { Claim, Hospital, SensorEvent } from "@/types";
import {
  DIALYSIS_SHIFTS_PER_DAY,
  PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
  REFERENCE_PRICES,
} from "@/lib/reference-data";

export function makeHospital(overrides: Partial<Hospital> = {}): Hospital {
  const physiotherapists = overrides.physiotherapists ?? 4;
  const dialysisMachines = overrides.dialysisMachines ?? 8;
  return {
    id: "RS-TEST-01",
    name: "RS Uji Sintetis",
    region: "DKI Jakarta",
    class: "B",
    ownership: "Swasta",
    beds: 200,
    doctors: 40,
    physiotherapists,
    dialysisMachines,
    dialysisShiftsPerDay: DIALYSIS_SHIFTS_PER_DAY,
    physioSessionsPerTherapistPerDay: PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
    rooms: 50,
    dailyCapacity: {
      fisioterapi: physiotherapists * PHYSIO_SESSIONS_PER_THERAPIST_PER_DAY,
      hemodialisis: dialysisMachines * DIALYSIS_SHIFTS_PER_DAY,
    },
    ...overrides,
  };
}

export function makeClaim(overrides: Partial<Claim> = {}): Claim {
  const serviceType = overrides.serviceType ?? "FISIOTERAPI";
  const quantity = overrides.quantity ?? 1;
  const unitPrice = overrides.unitPrice ?? REFERENCE_PRICES[serviceType];
  return {
    id: overrides.id ?? "CLM-TEST-00001",
    hospitalId: overrides.hospitalId ?? "RS-TEST-01",
    patientRef: overrides.patientRef ?? "PT-******0001",
    serviceType,
    serviceDate: overrides.serviceDate ?? "2026-10-05",
    quantity,
    unitPrice,
    totalValue: quantity * unitPrice,
    description: overrides.description ?? "Klaim uji sintetis",
    previouslyPaid: overrides.previouslyPaid ?? false,
    aggregateDailyLine: overrides.aggregateDailyLine ?? false,
    paidReferenceId: overrides.paidReferenceId,
    duplicateOf: overrides.duplicateOf,
  };
}

export function makeSensorEvent(overrides: Partial<SensorEvent> = {}): SensorEvent {
  return {
    id: overrides.id ?? "SEN-TEST-01",
    hospitalId: overrides.hospitalId ?? "RS-TEST-01",
    machineId: overrides.machineId ?? "HD-01",
    status: overrides.status ?? "THERAPY",
    powerWatts: overrides.powerWatts ?? 1500,
    currentAmps: overrides.currentAmps ?? 6.2,
    timestamp: overrides.timestamp ?? "2026-10-05T09:00:00.000Z",
    signatureValid: overrides.signatureValid ?? true,
    periodDate: overrides.periodDate ?? "2026-10-05",
  };
}
