import Link from "next/link";
import { getScoringConfig } from "@/lib/data";
import { ScoringConfigForm } from "@/components/ScoringConfigForm";
import { SetupNotice } from "@/components/SetupNotice";
import { ChevronLeftIcon } from "@/components/icons";

export default async function ConfigPage() {
  let config;
  try {
    config = await getScoringConfig();
  } catch (err) {
    return <SetupNotice error={err} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:hidden"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Pipeline
      </Link>
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Scoring configuration</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Axis weights and tier bands are configurable, not hardcoded. Editing
          these changes how future evaluations roll up into a composite score
          and tier.
        </p>
      </div>
      <ScoringConfigForm initial={config} />
    </div>
  );
}
