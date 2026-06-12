import { CONFIDENCE_FIELDS } from "@/lib/config";
import type { Artist } from "@/types";

/**
 * Confidence reflects how much signal we actually have on this artist.
 * A high composite score built on one Instagram handle should not read
 * the same as one built on a fully-populated profile.
 */
export function computeConfidence(artist: Partial<Artist>): {
  confidence: number;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  for (const field of CONFIDENCE_FIELDS) {
    const value = (artist as Record<string, unknown>)[field];

    const isMissing =
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (isMissing) {
      missingFields.push(field);
    }
  }

  const filled = CONFIDENCE_FIELDS.length - missingFields.length;
  const confidence = Math.round((filled / CONFIDENCE_FIELDS.length) * 100);

  return { confidence, missingFields };
}
