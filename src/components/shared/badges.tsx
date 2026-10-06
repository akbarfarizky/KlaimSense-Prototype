import { Badge, type BadgeProps } from "@/components/ui/badge";
import { PRIORITY_LABELS } from "@/lib/constants";
import type { PriorityCategory, Severity, VerificationStatus } from "@/types";
import type { MachineStatus } from "@/types";

const PRIORITY_VARIANT: Record<PriorityCategory, BadgeProps["variant"]> = {
  LOW: "muted",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "critical",
};

export function PriorityBadge({
  category,
  className,
}: {
  category: PriorityCategory;
  className?: string;
}) {
  return (
    <Badge variant={PRIORITY_VARIANT[category]} className={className}>
      {PRIORITY_LABELS[category]}
    </Badge>
  );
}

const SEVERITY_VARIANT: Record<Severity, BadgeProps["variant"]> = {
  LOW: "muted",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "critical",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge variant={SEVERITY_VARIANT[severity]}>{severity}</Badge>;
}

const STATUS_VARIANT: Record<VerificationStatus, BadgeProps["variant"]> = {
  BARU: "brand",
  DALAM_PEMERIKSAAN: "warning",
  MEMBUTUHKAN_KLARIFIKASI: "warning",
  RUJUK_AUDIT: "danger",
  DISETUJUI: "success",
  DITOLAK: "critical",
};

const STATUS_TEXT: Record<VerificationStatus, string> = {
  BARU: "BARU",
  DALAM_PEMERIKSAAN: "DALAM PEMERIKSAAN",
  MEMBUTUHKAN_KLARIFIKASI: "BUTUH KLARIFIKASI",
  RUJUK_AUDIT: "RUJUK AUDIT",
  DISETUJUI: "DISETUJUI",
  DITOLAK: "DITOLAK",
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_TEXT[status]}</Badge>;
}

const MACHINE_VARIANT: Record<MachineStatus, BadgeProps["variant"]> = {
  THERAPY: "success",
  STANDBY: "warning",
  OFFLINE: "danger",
};

export function MachineStatusBadge({ status }: { status: MachineStatus }) {
  return <Badge variant={MACHINE_VARIANT[status]}>{status}</Badge>;
}
