import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ChevronLeftIcon } from "@/components/icons";
import { UsersManager } from "@/components/UsersManager";

export default async function UsersConfigPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  return (
    <div className="space-y-6">
      <Link
        href="/config"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Config
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Invite team members and KOLs, or update their roles.
        </p>
      </div>

      <UsersManager />
    </div>
  );
}
