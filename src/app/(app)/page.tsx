import Link from "next/link";
import { ArtistsList } from "@/components/ArtistsList";
import { listArtistsWithLatestEvaluation } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import { PlusCircleIcon } from "@/components/icons";

export default async function DashboardPage() {
  let items;
  try {
    items = await listArtistsWithLatestEvaluation();
  } catch (err) {
    return <SetupNotice error={err} />;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Pipeline</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Every artist a scout has entered, with their latest evaluation,
            archetype blend, and tier.
          </p>
        </div>
        <Link href="/artists/new" className="btn btn-primary hidden sm:inline-flex">
          <PlusCircleIcon className="h-4 w-4" filled />
          New artist
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="surface-card p-10 text-center text-[var(--muted)]">
          <p className="mb-3">No artists yet.</p>
          <Link href="/artists/new" className="btn btn-primary">
            Add the first one
          </Link>
        </div>
      ) : (
        <ArtistsList items={items} />
      )}
    </div>
  );
}
