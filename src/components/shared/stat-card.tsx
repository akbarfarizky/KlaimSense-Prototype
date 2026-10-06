import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "navy",
  footer,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "navy" | "brand" | "warning" | "danger" | "success" | "teal";
  footer?: ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    navy: "bg-navy-50 text-navy-700",
    brand: "bg-brand-50 text-brand-600",
    warning: "bg-warning-soft text-amber-600",
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    teal: "bg-teal-500/10 text-teal-600",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-navy-900">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
          {footer && <div className="mt-2">{footer}</div>}
        </div>
        {icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
