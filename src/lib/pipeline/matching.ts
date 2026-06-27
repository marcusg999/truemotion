import type { MdcEntry, MatchChecklistItem } from "@/types";

export interface MatchResult {
  match_score: number;
  checklist: MatchChecklistItem[];
}

/**
 * Computes how well Source 2 (artist) covers Source 1 (reference profile).
 *
 * Score is reference-coverage-first: full credit when an artist matches a
 * reference term, zero when absent. Terms the artist has that the reference
 * doesn't are shown as "partial" in the checklist (bonus context, not noise).
 */
export function computeMatch(
  source1: MdcEntry[],
  source2: MdcEntry[]
): MatchResult {
  const s1Map = new Map<string, MdcEntry>();
  const s2Map = new Map<string, MdcEntry>();

  for (const e of source1) s1Map.set(`${e.category}:${e.term}`, e);
  for (const e of source2) s2Map.set(`${e.category}:${e.term}`, e);

  const allKeys = new Set([...s1Map.keys(), ...s2Map.keys()]);
  const checklist: MatchChecklistItem[] = [];

  let totalReferenceWeight = 0;
  let matchedWeight = 0;

  for (const key of allKeys) {
    const colonIdx = key.indexOf(":");
    const category = key.slice(0, colonIdx) as MdcEntry["category"];
    const term = key.slice(colonIdx + 1);

    const inS1 = s1Map.has(key);
    const inS2 = s2Map.has(key);
    const entry = (s1Map.get(key) ?? s2Map.get(key))!;

    let status: MatchChecklistItem["status"];

    if (inS1 && inS2) {
      status = "match";
      totalReferenceWeight += entry.weight;
      matchedWeight += entry.weight;
    } else if (inS1 && !inS2) {
      status = "absent";
      totalReferenceWeight += entry.weight;
    } else {
      // artist has a term the reference doesn't specify — extra signal
      status = "partial";
    }

    checklist.push({ category, term, status, in_source_1: inS1, in_source_2: inS2 });
  }

  // Sort: matches first, then partials, then absents; within each by category weight descending
  checklist.sort((a, b) => {
    const statusOrder = { match: 0, partial: 1, absent: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const rawCoverage = totalReferenceWeight > 0 ? matchedWeight / totalReferenceWeight : 0;
  const match_score = Math.min(10, Math.round(rawCoverage * 10 * 10) / 10);

  return { match_score, checklist };
}
