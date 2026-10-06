import { NextResponse } from "next/server";
import { z } from "zod";

export const claimFilterSchema = z.object({
  hospitalId: z.string().min(1).optional(),
  serviceType: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  priority: z.string().min(1).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().min(1).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
});

export type ClaimFilterInput = z.infer<typeof claimFilterSchema>;

export function parseFilter(url: URL): ClaimFilterInput {
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = claimFilterSchema.safeParse(params);
  if (!parsed.success) return {};
  return parsed.data;
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export const decisionSchema = z.object({
  action: z.enum(["DISETUJUI", "MEMBUTUHKAN_KLARIFIKASI", "RUJUK_AUDIT"]),
  actor: z.string().min(1).max(120).optional(),
  note: z.string().max(1000).optional(),
});

export const simulateSchema = z.object({
  hospitalId: z.string().min(1),
  periodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  machineId: z.string().min(1),
  action: z.enum(["START_THERAPY", "POWER_OFF", "STANDBY", "SENSOR_MISMATCH"]),
});
