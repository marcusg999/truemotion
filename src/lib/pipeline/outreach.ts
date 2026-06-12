import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { TIER_LABELS } from "@/lib/config";
import type { Artist, Evaluation, MessageTone } from "@/types";

export interface OutreachDraft {
  tone: MessageTone;
  content: string;
}

const TIER_GUIDANCE: Record<string, string> = {
  SIGN: `This is a SIGN-tier artist. Be confident and specific: reference what
TRP saw in their work and the matched archetype. This is an invitation to
build something together, not a generic compliment.`,
  NURTURE: `This is a NURTURE-tier artist with massive potential. Be confident
and specific, reference what TRP saw and the matched archetype, and signal
genuine interest in developing the relationship over time.`,
  GUIDE: `This is a GUIDE-tier artist — real potential but not ready yet. Be
encouraging and offer a concrete growth path (using the growth path items
provided). Do not make hard promises or imply an offer is imminent.`,
  NOT_READY: `This is a NOT_READY-tier artist. Be soft and relationship-
preserving. Do not use rejection language. The tone is "let's keep building,
stay in touch" — leave the door open without overstating interest.`,
};

const DRAFT_MESSAGES_TOOL = {
  name: "draft_messages",
  description:
    "Submit 2-3 outreach message drafts in different tones for human review.",
  input_schema: {
    type: "object" as const,
    properties: {
      drafts: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            tone: {
              type: "string",
              enum: ["warm", "professional", "hype"],
            },
            content: { type: "string" },
          },
          required: ["tone", "content"],
        },
      },
    },
    required: ["drafts"],
  },
};

function topArchetype(evaluation: Evaluation): string | null {
  if (!evaluation.archetype_blend?.length) return null;
  const sorted = [...evaluation.archetype_blend].sort(
    (a, b) => b.percentage - a.percentage
  );
  return sorted[0].archetype;
}

/**
 * Drafts human-gated outreach messages. Nothing here is sent automatically.
 *
 * PASS-tier artists get no drafts by default (per TRP policy: never generate
 * a "you're not an artist" message). Pass `force: true` to override for a
 * specific manual case.
 */
export async function runOutreachPipeline(
  artist: Artist,
  evaluation: Evaluation,
  options: { force?: boolean } = {}
): Promise<OutreachDraft[]> {
  if (evaluation.tier === "PASS" && !options.force) {
    return [];
  }

  const guidance = TIER_GUIDANCE[evaluation.tier] ?? TIER_GUIDANCE.NOT_READY;
  const archetype = topArchetype(evaluation);

  const prompt = `
You are writing outreach message drafts on behalf of TRP.L (The Rap
Project Label) to an artist a scout has just evaluated. TRP's voice is
intelligent, culturally grounded, forward-looking, and curated — think
"Wired for hip-hop," never gossip, never corporate, never desperate.

Artist: ${artist.name}${artist.alias ? ` (aka ${artist.alias})` : ""}
Tier: ${TIER_LABELS[evaluation.tier] ?? evaluation.tier}
${archetype ? `Matched archetype: ${archetype} — ${evaluation.archetype_justification}` : ""}

${guidance}

${
  evaluation.growth_path?.length
    ? `Growth path notes (use for GUIDE-tier framing if relevant):\n- ${evaluation.growth_path.join("\n- ")}`
    : ""
}

Write 2-3 short outreach message drafts (a few sentences each, suitable for
Instagram DM or email), each in a different tone selected from: warm,
professional, hype. Every draft is a starting point for a human scout to
edit before sending — do not include placeholders like "[Name]"; write as
if addressed directly to ${artist.name}. Call the draft_messages tool with
your results.
`.trim();

  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1536,
    tools: [DRAFT_MESSAGES_TOOL],
    tool_choice: { type: "tool", name: "draft_messages" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a draft_messages tool call");
  }

  const input = toolUse.input as { drafts: OutreachDraft[] };
  return input.drafts ?? [];
}
