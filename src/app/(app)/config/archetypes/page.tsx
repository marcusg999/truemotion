import Link from "next/link";
import { getArchetypes } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { ArchetypesManager } from "@/components/ArchetypesManager";
import { SetupNotice } from "@/components/SetupNotice";
import { ChevronLeftIcon } from "@/components/icons";
import { redirect } from "next/navigation";

export default async function ArchetypesConfigPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  let archetypes;
  try {
    archetypes = await getArchetypes();
  } catch (err) {
    return <SetupNotice error={err} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/config"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Scoring config
      </Link>

      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Archetypes</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Archetypes are used by the evaluation pipeline to classify artists.
          Changes take effect on the next evaluation run.
        </p>
      </div>

      <ArchetypesManager initial={archetypes} />
    </div>
  );
}
