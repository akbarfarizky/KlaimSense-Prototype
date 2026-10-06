import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-navy-200 bg-navy-50 text-navy-800",
        outline: "border-line bg-white text-ink-soft",
        brand: "border-brand-200 bg-brand-50 text-brand-700",
        teal: "border-teal-500/30 bg-teal-500/10 text-teal-600",
        success: "border-success/25 bg-success-soft text-success",
        warning: "border-warning/30 bg-warning-soft text-amber-700",
        danger: "border-danger/25 bg-danger-soft text-danger",
        critical: "border-critical/30 bg-red-100 text-critical",
        muted: "border-line bg-canvas text-ink-muted",
        dark: "border-navy-800 bg-navy-800 text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
