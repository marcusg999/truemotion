import { TIER_LABELS } from "@/lib/config";
import type { Tier } from "@/types";

const TIER_STYLES: Record<Tier, { bg: string; fg: string }> = {
  SIGN: { bg: "#34c759", fg: "#ffffff" },
  NURTURE: { bg: "#0a84ff", fg: "#ffffff" },
  GUIDE: { bg: "#ff9f0a", fg: "#ffffff" },
  NOT_READY: { bg: "#8e8e93", fg: "#ffffff" },
  PASS: { bg: "#ff453a", fg: "#ffffff" },
};

export function TierBadge({ tier, size = "md" }: { tier: Tier | string; size?: "sm" | "md" }) {
  const style = TIER_STYLES[tier as Tier] ?? TIER_STYLES.NOT_READY;
  const label = TIER_LABELS[tier] ?? tier;

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{ background: style.bg, color: style.fg }}
    >
      {label}
    </span>
  );
}
