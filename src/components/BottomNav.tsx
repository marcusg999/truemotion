"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, PlusCircleIcon, QueueIcon, SlidersIcon } from "@/components/icons";

const TABS = [
  { href: "/", label: "Pipeline", icon: HomeIcon },
  { href: "/artists/new", label: "New", icon: PlusCircleIcon },
  { href: "/queue", label: "Queue", icon: QueueIcon },
  { href: "/config", label: "Config", icon: SlidersIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-xl pb-safe">
      <div className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
              style={{ color: active ? "var(--accent)" : "var(--muted)" }}
            >
              <Icon className="h-6 w-6" filled={active} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
