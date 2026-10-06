"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Gavel, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import type { DecisionAction } from "@/types";

export interface DecisionOption {
  action: DecisionAction;
  label: string;
  description: string;
  variant: "success" | "warning" | "danger";
  icon: typeof CheckCircle2;
}

export const DECISION_OPTIONS: DecisionOption[] = [
  {
    action: "DISETUJUI",
    label: "SETUJUI",
    description:
      "Klaim dinyatakan wajar dan dapat dilanjutkan. Keputusan ini dicatat sebagai tindakan petugas.",
    variant: "success",
    icon: CheckCircle2,
  },
  {
    action: "MEMBUTUHKAN_KLARIFIKASI",
    label: "MINTA KLARIFIKASI",
    description:
      "Petugas meminta klarifikasi tambahan kepada fasilitas kesehatan sebelum keputusan akhir.",
    variant: "warning",
    icon: HelpCircle,
  },
  {
    action: "RUJUK_AUDIT",
    label: "RUJUK KE AUDIT",
    description:
      "Kasus diteruskan ke tim audit untuk pemeriksaan lebih lanjut. Sistem tidak menolak klaim.",
    variant: "danger",
    icon: Gavel,
  },
];

export function DecisionButton({
  claimId,
  option,
  size = "sm",
  fullWidth = false,
}: {
  claimId: string;
  option: DecisionOption;
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const Icon = option.icon;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/verification/${claimId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: option.action, note: note.trim() || undefined }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Gagal menyimpan keputusan.");
      }
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setNote("");
        router.refresh();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size={size}
        variant={option.variant}
        className={fullWidth ? "w-full" : undefined}
        onClick={() => setOpen(true)}
        data-testid={`decision-${option.action}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {option.label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Konfirmasi keputusan petugas
            </DialogTitle>
            <DialogDescription>
              Anda akan mencatat keputusan <strong>{option.label}</strong> untuk klaim{" "}
              <span className="font-mono">{claimId}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-line bg-canvas/60 p-3 text-xs text-ink-soft">
            {option.description}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`note-${claimId}-${option.action}`} className="text-xs font-medium text-ink-soft">
              Catatan petugas (opsional)
            </label>
            <Textarea
              id={`note-${claimId}-${option.action}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Meminta rekam medis dan log terapi periode 5 Oktober 2026."
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-xs text-success">
              Keputusan tercatat pada audit log.
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-ink-muted">
            Sistem tidak memutuskan fraud secara otomatis. Keputusan ini sepenuhnya merupakan
            tindakan petugas manusia dan akan tercatat pada audit log.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button variant={option.variant} onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DecisionPanel({ claimId, disabled }: { claimId: string; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      {DECISION_OPTIONS.map((option) => (
        <DecisionButton
          key={option.action}
          claimId={claimId}
          option={option}
          size="default"
          fullWidth
        />
      ))}
      {disabled && (
        <p className="text-[11px] text-ink-muted">
          Klaim ini tidak berada pada daftar periksa sehingga keputusan belum dapat dicatat.
        </p>
      )}
    </div>
  );
}
