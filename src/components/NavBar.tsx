import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--background)]/80 border-b border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="h-7 w-7 rounded-xl flex items-center justify-center text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            T
          </span>
          <span className="text-[15px] font-semibold tracking-tight">True Motion</span>
          <span className="hidden sm:inline text-xs text-[var(--muted)]">· TRP.L A&amp;R</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className="btn btn-ghost btn-sm">
              Pipeline
            </Link>
            <Link href="/artists/new" className="btn btn-ghost btn-sm">
              New artist
            </Link>
            <Link href="/config/profiles" className="btn btn-ghost btn-sm">
              Profiles
            </Link>
            <Link href="/config" className="btn btn-ghost btn-sm">
              Config
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
