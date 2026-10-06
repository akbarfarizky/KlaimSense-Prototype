import { POLICY_DOCUMENTS, getPolicyDocument } from "@/lib/reference-data";
import type { PolicyDocument, PolicyReference } from "@/types";

export interface RagHit {
  document: PolicyDocument;
  score: number;
  matchedTerms: string[];
}

const STOPWORDS = new Set([
  "dan",
  "atau",
  "yang",
  "untuk",
  "pada",
  "dengan",
  "dari",
  "the",
  "and",
  "of",
  "a",
  "an",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Knowledge base lokal prototype.
 * Pengambilan dokumen berbasis kemiripan kata kunci (deterministik, tanpa embedding).
 */
export function retrievePolicy(query: string, limit = 3): RagHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const hits: RagHit[] = POLICY_DOCUMENTS.map((document) => {
    const haystack = tokenize(
      [document.title, document.excerpt, document.tags.join(" "), document.docId].join(" "),
    );
    const matchedTerms: string[] = [];
    let score = 0;

    for (const term of terms) {
      const exact = haystack.filter((h) => h === term).length;
      if (exact > 0) {
        score += exact * 2;
        matchedTerms.push(term);
        continue;
      }
      const partial = haystack.some((h) => h.startsWith(term) || term.startsWith(h));
      if (partial) {
        score += 1;
        matchedTerms.push(term);
      }
    }

    // Dokumen yang isinya belum tersedia tidak boleh tampak seolah terverifikasi.
    if (!document.available) {
      score = Math.min(score, 1.5);
    }

    return { document, score, matchedTerms: Array.from(new Set(matchedTerms)) };
  })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.document.docId.localeCompare(b.document.docId));

  return hits.slice(0, limit);
}

export function toPolicyReference(docId: string): PolicyReference {
  const document = getPolicyDocument(docId);
  if (!document) {
    return {
      docId,
      title: docId,
      excerpt: "Referensi resmi belum tersedia dalam prototype.",
      available: false,
    };
  }
  return {
    docId: document.docId,
    title: document.title,
    excerpt: document.available
      ? document.excerpt
      : "Referensi resmi belum tersedia dalam prototype.",
    available: document.available,
  };
}

export function policyReferencesFor(ruleIds: string[], serviceLabel: string): PolicyReference[] {
  const query = [serviceLabel, ...ruleIds].join(" ");
  const hits = retrievePolicy(query, 4);
  const ids = new Set<string>();

  for (const hit of hits) ids.add(hit.document.docId);

  // Sertakan referensi kanonik untuk rule yang terpicu, jika belum tercakup.
  for (const ruleId of ruleIds) {
    if (ruleId.startsWith("CAP")) ids.add("PROTO-KAPASITAS");
    if (ruleId.startsWith("DUP")) ids.add("PROTO-DUPLIKASI");
    if (ruleId === "PRICE-001") ids.add("PROTO-TARIF");
    if (ruleId === "PEER-001") ids.add("PROTO-PEER");
    if (ruleId === "IO-001") ids.add("PROTO-IOT");
    if (ruleId === "REPLACE-001") ids.add("PERMENKES-3-2023");
  }

  return Array.from(ids).map(toPolicyReference);
}
