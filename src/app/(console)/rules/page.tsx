import { Calculator, Database, FileText, Scale, ShieldCheck } from "lucide-react";
import { SeverityBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_LABELS } from "@/lib/constants";
import { MAX_PRIORITY_SCORE, POLICY_DOCUMENTS, PRIORITY_BANDS, RULE_DEFINITIONS } from "@/lib/reference-data";
import { getStore } from "@/lib/repositories/store";
import type { RuleCategory } from "@/types";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER: RuleCategory[] = [
  "KAPASITAS",
  "DUPLIKASI",
  "KEWAJARAN_HARGA",
  "MASA_PENGGANTIAN",
  "PEER_COMPARISON",
  "IOT",
];

export default async function RulesPage() {
  const store = getStore();
  const triggerCounts = new Map<string, number>();
  for (const results of store.engine.resultsByClaim.values()) {
    for (const r of results) {
      if (!r.triggered) continue;
      triggerCounts.set(r.ruleId, (triggerCounts.get(r.ruleId) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aturan Deteksi"
        title="Rule Engine & Kebijakan"
        description="Seluruh aturan deterministik yang digunakan sistem. Data yang sama dengan aturan yang sama selalu menghasilkan hasil yang sama. Setiap keputusan dapat dijelaskan."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Rule"
          value={String(RULE_DEFINITIONS.length)}
          hint="Semua aktif"
          icon={<Scale className="h-4 w-4" />}
        />
        <StatCard
          label="Skor Maksimum"
          value={String(MAX_PRIORITY_SCORE)}
          hint="Batas atas skor prioritas"
          icon={<Calculator className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Dokumen Referensi"
          value={String(POLICY_DOCUMENTS.length)}
          hint="Knowledge base lokal"
          icon={<FileText className="h-4 w-4" />}
          tone="teal"
        />
        <StatCard
          label="Deterministik"
          value="Ya"
          hint="Tanpa AI untuk penilaian"
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Band Skor Prioritas</CardTitle>
          <p className="text-xs text-ink-muted">
            Skor adalah penjumlahan bobot rule yang terpicu, dibatasi maksimum {MAX_PRIORITY_SCORE}.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {PRIORITY_BANDS.map((band) => (
              <div key={band.category} className="rounded-lg border border-line bg-canvas/40 p-3">
                <Badge
                  variant={
                    band.category === "CRITICAL"
                      ? "critical"
                      : band.category === "HIGH"
                        ? "danger"
                        : band.category === "MEDIUM"
                          ? "warning"
                          : "muted"
                  }
                >
                  {band.category}
                </Badge>
                <p className="mt-2 text-lg font-bold tabular-nums text-navy-900">
                  {band.min}–{band.max}
                </p>
                <p className="text-[11px] text-ink-muted">Rentang skor prioritas</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ALL">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ALL">Semua ({RULE_DEFINITIONS.length})</TabsTrigger>
          {CATEGORY_ORDER.map((category) => (
            <TabsTrigger key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ALL">
          <RuleGrid triggerCounts={triggerCounts} />
        </TabsContent>

        {CATEGORY_ORDER.map((category) => (
          <TabsContent key={category} value={category}>
            <RuleGrid triggerCounts={triggerCounts} category={category} />
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-brand-600" />
            Knowledge Base Lokal (RAG Prototype)
          </CardTitle>
          <p className="text-xs text-ink-muted">
            Prototype menggunakan knowledge base lokal sederhana berbasis kata kunci. Referensi
            peraturan resmi yang teksnya belum tersedia ditandai secara eksplisit agar tidak ada
            kutipan hukum yang dikarang.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {POLICY_DOCUMENTS.map((doc) => (
            <div key={doc.docId} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-navy-900">{doc.title}</span>
                <Badge variant={doc.available ? "teal" : "muted"}>
                  {doc.available ? "TERSEDIA" : "BELUM TERSEDIA"}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                {doc.issuer} • {doc.year}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{doc.excerpt}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {doc.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RuleGrid({
  triggerCounts,
  category,
}: {
  triggerCounts: Map<string, number>;
  category?: RuleCategory;
}) {
  const rules = category
    ? RULE_DEFINITIONS.filter((r) => r.category === category)
    : RULE_DEFINITIONS;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rules.map((rule) => (
        <Card key={rule.ruleId}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="dark" className="font-mono">
                    {rule.ruleId}
                  </Badge>
                  <Badge variant={rule.active ? "success" : "muted"}>
                    {rule.active ? "AKTIF" : "NONAKTIF"}
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-base">{rule.name}</CardTitle>
                <p className="text-[11px] text-ink-muted">{CATEGORY_LABELS[rule.category]}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <SeverityBadge severity={rule.severity} />
                <span className="text-xs font-semibold text-navy-900">+{rule.scoreImpact} poin</span>
                <span className="text-[10px] text-ink-muted">
                  {triggerCounts.get(rule.ruleId) ?? 0}× terpicu
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs leading-relaxed text-ink-soft">{rule.description}</p>

            <div className="space-y-2">
              <RuleField label="Threshold" value={rule.threshold} />
              <RuleField label="Rumus" value={rule.formula} mono />
              <RuleField label="Contoh" value={rule.example} />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Data yang digunakan
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {rule.dataUsed.map((d) => (
                  <Badge key={d} variant="outline">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Sumber / Referensi
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {rule.policyRefs.map((p) => (
                  <Badge key={p} variant="muted">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RuleField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-canvas/40 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className={mono ? "mt-0.5 font-mono text-[11px] text-ink-soft" : "mt-0.5 text-xs text-ink-soft"}>
        {value}
      </p>
    </div>
  );
}
