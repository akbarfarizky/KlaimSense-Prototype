import { cn } from "@/lib/utils";
import type { PriorityCategory } from "@/types";

const COLOR_BY_CATEGORY: Record<PriorityCategory, string> = {
  LOW: "#6b7280",
  MEDIUM: "#f59e0b",
  HIGH: "#dc2626",
  CRITICAL: "#b91c1c",
};

const TRACK_BY_CATEGORY: Record<PriorityCategory, string> = {
  LOW: "#e3e9f2",
  MEDIUM: "#fff5e5",
  HIGH: "#fdecec",
  CRITICAL: "#fdecec",
};

export function ScoreMeter({
  score,
  category,
  size = 132,
  thickness = 10,
  label = "SKOR PRIORITAS",
}: {
  score: number;
  category: PriorityCategory;
  size?: number;
  thickness?: number;
  label?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;
  const color = COLOR_BY_CATEGORY[category];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={TRACK_BY_CATEGORY[category]}
            strokeWidth={thickness}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-navy-900">{clamped}</span>
          <span className="text-[11px] font-medium text-ink-muted">/ 100</span>
        </div>
      </div>
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </span>
      )}
    </div>
  );
}

export function ScoreBar({
  score,
  category,
  className,
}: {
  score: number;
  category: PriorityCategory;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: COLOR_BY_CATEGORY[category] }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-navy-800">{clamped}</span>
    </div>
  );
}

export function scoreColor(category: PriorityCategory): string {
  return COLOR_BY_CATEGORY[category];
}
