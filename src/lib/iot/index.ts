import type { MachineStatus, MachineTelemetry, SensorEvent } from "@/types";

/**
 * Simulasi Edge AI.
 * Klasifikasi status mesin diturunkan secara deterministik dari pola arus dan
 * konsumsi daya. Ini BUKAN model terlatih dan BUKAN validasi klinis.
 */
export const EDGE_AI_SIMULATED_ACCURACY = 97.8;

export interface EdgeAiInput {
  currentAmps: number;
  powerWatts: number;
  /** Pola waktu operasional (0-23). */
  hour: number;
}

export interface EdgeAiOutput {
  prediction: MachineStatus;
  confidence: number;
  rationale: string;
}

export function simulateEdgeAi(input: EdgeAiInput): EdgeAiOutput {
  const { currentAmps, powerWatts, hour } = input;

  if (powerWatts < 90 && currentAmps < 0.35) {
    const confidence = clamp(96 + (0.35 - currentAmps) * 8, 88, 99.4);
    return {
      prediction: "OFFLINE",
      confidence: round1(confidence),
      rationale: "Daya sangat rendah dan arus mendekati nol → mesin tidak beroperasi.",
    };
  }

  if (powerWatts >= 1000 && currentAmps >= 4.2) {
    const signal = Math.min(1, (powerWatts - 1000) / 700 + (currentAmps - 4.2) / 1.6);
    const confidence = clamp(93 + signal * 6.4, 88, 99.4);
    const inOperatingWindow = hour >= 6 && hour <= 21;
    return {
      prediction: "THERAPY",
      confidence: round1(inOperatingWindow ? confidence : confidence - 3.5),
      rationale: "Daya dan arus konsisten dengan siklus terapi aktif.",
    };
  }

  if (powerWatts >= 120 && powerWatts < 900) {
    const confidence = clamp(90 + (1 - Math.abs(currentAmps - 1.4)) * 4, 85, 97.5);
    return {
      prediction: "STANDBY",
      confidence: round1(confidence),
      rationale: "Daya siaga dengan arus rendah → mesin dalam mode standby.",
    };
  }

  return {
    prediction: "OFFLINE",
    confidence: 89.5,
    rationale: "Pola daya dan arus tidak konsisten dengan operasi terapi.",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function telemetryFromEvent(event: SensorEvent): MachineTelemetry {
  const hour = Number(event.timestamp.slice(11, 13));
  const ai = simulateEdgeAi({
    currentAmps: event.currentAmps,
    powerWatts: event.powerWatts,
    hour,
  });
  return {
    machineId: event.machineId,
    label: `Mesin ${event.machineId.replace("HD-", "")}`,
    status: event.status,
    powerWatts: event.powerWatts,
    currentAmps: event.currentAmps,
    timestamp: event.timestamp,
    signatureValid: event.signatureValid,
    edgeAiConfidence: ai.confidence,
    edgeAiPrediction: ai.prediction,
  };
}

export type SimulationAction =
  | "START_THERAPY"
  | "POWER_OFF"
  | "STANDBY"
  | "SENSOR_MISMATCH";

export const SIMULATION_ACTIONS: {
  action: SimulationAction;
  label: string;
  description: string;
}[] = [
  { action: "START_THERAPY", label: "Mulai terapi", description: "Mesin beroperasi penuh (THERAPY)." },
  { action: "POWER_OFF", label: "Matikan mesin", description: "Mesin tidak beroperasi (OFFLINE)." },
  { action: "STANDBY", label: "Standby", description: "Mesin siaga tanpa sesi aktif (STANDBY)." },
  {
    action: "SENSOR_MISMATCH",
    label: "Buat ketidaksesuaian sensor",
    description: "Menandai mesin OFFLINE pada periode yang memiliki klaim.",
  },
];

export function applySimulationAction(
  machine: MachineTelemetry,
  action: SimulationAction,
  nowIso: string,
): MachineTelemetry {
  let status: MachineStatus = machine.status;
  let powerWatts = machine.powerWatts;
  let currentAmps = machine.currentAmps;

  switch (action) {
    case "START_THERAPY":
      status = "THERAPY";
      powerWatts = 1580;
      currentAmps = 6.42;
      break;
    case "POWER_OFF":
      status = "OFFLINE";
      powerWatts = 6;
      currentAmps = 0.02;
      break;
    case "STANDBY":
      status = "STANDBY";
      powerWatts = 260;
      currentAmps = 1.12;
      break;
    case "SENSOR_MISMATCH":
      status = "OFFLINE";
      powerWatts = 4;
      currentAmps = 0.01;
      break;
    default:
      break;
  }

  const ai = simulateEdgeAi({
    currentAmps,
    powerWatts,
    hour: new Date(nowIso).getUTCHours(),
  });

  return {
    ...machine,
    status,
    powerWatts,
    currentAmps,
    timestamp: nowIso,
    signatureValid: action === "SENSOR_MISMATCH" ? false : true,
    edgeAiConfidence: ai.confidence,
    edgeAiPrediction: ai.prediction,
  };
}

export function machineTelemetryForHospital(
  events: SensorEvent[],
  hospitalId: string,
  periodDate: string,
): MachineTelemetry[] {
  return events
    .filter((e) => e.hospitalId === hospitalId && e.periodDate === periodDate)
    .sort((a, b) => a.machineId.localeCompare(b.machineId))
    .map(telemetryFromEvent);
}

export function latestPeriodDate(events: SensorEvent[], hospitalId: string): string {
  const dates = events.filter((e) => e.hospitalId === hospitalId).map((e) => e.periodDate);
  return dates.sort().at(-1) ?? "";
}

export function edgeAiSummary(machines: MachineTelemetry[]): {
  accuracy: number;
  meanConfidence: number;
  agreement: number;
  note: string;
} {
  const mean =
    machines.length > 0
      ? machines.reduce((sum, m) => sum + m.edgeAiConfidence, 0) / machines.length
      : 0;
  const agreement =
    machines.length > 0
      ? (machines.filter((m) => m.edgeAiPrediction === m.status).length / machines.length) * 100
      : 0;
  return {
    accuracy: EDGE_AI_SIMULATED_ACCURACY,
    meanConfidence: round1(mean),
    agreement: round1(agreement),
    note: "Nilai simulasi prototype, bukan validasi pada data rumah sakit nyata.",
  };
}
