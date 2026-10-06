"use client";

import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function EvidenceToolbar({
  claimId,
  options,
}: {
  claimId: string;
  options: { id: string; label: string }[];
}) {
  const router = useRouter();

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Select
        value={claimId}
        onChange={(e) => router.push(`/evidence?claim=${e.target.value}`)}
        className="w-[320px]"
        aria-label="Pilih kasus"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button variant="default" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" />
        Export Evidence Report
      </Button>
    </div>
  );
}
