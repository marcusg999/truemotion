import Link from "next/link";
import { ArtistForm } from "@/components/ArtistForm";
import { ChevronLeftIcon } from "@/components/icons";

export default function NewArtistPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Pipeline
      </Link>
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">New artist</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Manual input first — record what a scout knows now. Anything left
          blank lowers confidence on the evaluation, but won&apos;t block it.
        </p>
      </div>
      <ArtistForm />
    </div>
  );
}
