import Link from "next/link";
import { getScoringConfig } from "@/lib/data";
import { ScoringConfigForm } from "@/components/ScoringConfigForm";
import { SetupNotice } from "@/components/SetupNotice";
import { ChevronLeftIcon } from "@/components/icons";
import { getSessionUser } from "@/lib/auth";

export default async function ConfigPage() {
  const [config, user] = await Promise.all([
    getScoringConfig().catch(() => null),
    getSessionUser(),
  ]);

  if (!config) {
    try { await getScoringConfig(); } catch (err) { return <SetupNotice error={err} />; }
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
      <ScoringConfigForm initial={config!} />
      {user?.role === "admin" && (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Archetypes</h2>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                Create, edit, and remove the artist archetypes used in evaluations.
              </p>
            </div>
            <Link href="/config/archetypes" className="btn btn-secondary btn-sm">
              Manage
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
