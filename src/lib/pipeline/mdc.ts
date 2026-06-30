import { getAnthropicClient, MODEL_EXTRACTION } from "@/lib/anthropic";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { MdcCategory, MdcEntry, MdcTaxonomyTerm } from "@/types";

const MDC_EXTRACTION_TOOL = {
  name: "submit_mdc",
  description:
    "Submit extracted MDC (Meta Data Criteria) tags from an artist or reference narrative. " +
    "Extract every relevant tag by category: genre, region, theme, adjective, affiliation, intelligence.",
  input_schema: {
    type: "object" as const,
    properties: {
      extracted_tags: {
        type: "array",
        description: "All MDC tags extracted from the narrative, organized by category.",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["genre", "region", "theme", "adjective", "affiliation", "intelligence"],
              description: "MDC category this tag belongs to.",
            },
            term: {
              type: "string",
              description: "The tag term as it appears or is implied in the narrative.",
            },
            weight: {
              type: "number",
              minimum: 0.5,
              maximum: 2.0,
              description: "Importance weight: 2.0 = defining trait, 1.0 = present but secondary.",
            },
          },
          required: ["category", "term", "weight"],
        },
      },
    },
    required: ["extracted_tags"],
  },
};

async function loadTaxonomy(): Promise<MdcTaxonomyTerm[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("mdc_taxonomy")
    .select("*")
    .order("category")
    .order("canonical_term");

  if (error) throw new Error(`Failed to load MDC taxonomy: ${error.message}`);
  return (data ?? []) as MdcTaxonomyTerm[];
}

function normalizeTags(
  rawTags: { category: string; term: string; weight: number }[],
  taxonomy: MdcTaxonomyTerm[]
): { normalized: MdcEntry[]; uncanonicalized: string[] } {
  const normalized: MdcEntry[] = [];
  const uncanonicalized: string[] = [];
  const seen = new Set<string>();

  for (const tag of rawTags) {
    const cat = tag.category as MdcCategory;
    const termLower = tag.term.toLowerCase().trim();

    const categoryTerms = taxonomy.filter((t) => t.category === cat);

    // 1. Exact match on canonical_term
    let match = categoryTerms.find(
      (t) => t.canonical_term.toLowerCase() === termLower
    );

    // 2. Synonym exact match
    if (!match) {
      match = categoryTerms.find((t) =>
        t.synonyms.some((s) => s.toLowerCase() === termLower)
      );
    }

    // 3. Fuzzy: canonical or synonym contains the term, or vice versa
    if (!match) {
      match = categoryTerms.find(
        (t) =>
          t.canonical_term.toLowerCase().includes(termLower) ||
          termLower.includes(t.canonical_term.toLowerCase()) ||
          t.synonyms.some(
            (s) =>
              s.toLowerCase().includes(termLower) ||
              termLower.includes(s.toLowerCase())
          )
      );
    }

    if (match) {
      const key = `${match.category}:${match.canonical_term}`;
      if (!seen.has(key)) {
        seen.add(key);
        normalized.push({
          category: match.category,
          term: match.canonical_term,
          weight: match.weight,
        });
      }
    } else {
      uncanonicalized.push(`${tag.category}:${tag.term}`);
    }
  }

  return { normalized, uncanonicalized };
}

const MDC_STATIC_PREFIX = `You are extracting MDC (Meta Data Criteria) tags from a hip-hop artist or label narrative.
MDC categories:
- genre: musical genres and sub-genres (e.g. drill, trap, conscious rap, melodic rap)
- region: geographic roots (e.g. Atlanta, Chicago, New York, Houston, UK)
- theme: lyrical/artistic themes (e.g. street life, black excellence, spirituality, introspection)
- adjective: descriptive qualities (e.g. raw, lyrical, melodic, aggressive, commercial)
- affiliation: label, collective, or notable cosigns (e.g. YSL, OVO, independent)
- intelligence: platform-level traits (e.g. culturally grounded, forward looking, curated taste)

Extract all relevant tags from the narrative below. Be thorough — a narrative usually contains 5-15 tags across categories. Use the submit_mdc tool.`;

export interface MdcUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

export async function runMdcExtraction(narrative: string): Promise<{
  normalized: MdcEntry[];
  uncanonicalized: string[];
  usage: MdcUsage;
}> {
  const taxonomy = await loadTaxonomy();

  const anthropic = getAnthropicClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (anthropic.messages.create as (p: any) => Promise<any>)({
    model: MODEL_EXTRACTION,
    max_tokens: 1024,
    tools: [{ ...MDC_EXTRACTION_TOOL, cache_control: { type: "ephemeral" } }],
    tool_choice: { type: "tool", name: "submit_mdc" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: MDC_STATIC_PREFIX, cache_control: { type: "ephemeral" } },
          { type: "text", text: `\n\nNarrative:\n${narrative}` },
        ],
      },
    ],
  });

  const rawToolUse = (response.content as { type: string }[]).find((b) => b.type === "tool_use");
  if (!rawToolUse) {
    throw new Error("Model did not return a submit_mdc tool call");
  }

  const input = (rawToolUse as { type: string; input: { extracted_tags: { category: string; term: string; weight: number }[] } }).input;

  const u = response.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };

  return {
    ...normalizeTags(input.extracted_tags ?? [], taxonomy),
    usage: {
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_read_tokens: u.cache_read_input_tokens ?? 0,
      cache_write_tokens: u.cache_creation_input_tokens ?? 0,
    },
  };
}
