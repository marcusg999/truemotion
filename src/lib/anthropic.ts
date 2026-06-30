import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  client = new Anthropic({ apiKey });
  return client;
}

export const MODEL_EXTRACTION =
  process.env.MODEL_EXTRACTION || "claude-haiku-4-5-20251001";

export const MODEL_SCORING =
  process.env.MODEL_SCORING || "claude-sonnet-4-6";

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || MODEL_SCORING;
