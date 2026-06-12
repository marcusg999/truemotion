export function SetupNotice({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="border rounded p-6 max-w-2xl mx-auto mt-12">
      <h1 className="text-lg font-semibold mb-2">True Motion isn&apos;t configured yet</h1>
      <p className="text-sm text-black/70 dark:text-white/70 mb-3">
        This app needs Supabase and Anthropic credentials before it can store
        artists or run evaluations. Copy{" "}
        <code className="px-1 rounded bg-black/10 dark:bg-white/10">.env.example</code> to{" "}
        <code className="px-1 rounded bg-black/10 dark:bg-white/10">.env.local</code>,
        fill in the values, run the SQL in{" "}
        <code className="px-1 rounded bg-black/10 dark:bg-white/10">
          supabase/migrations/0001_init.sql
        </code>{" "}
        against your Supabase project, and restart the dev server.
      </p>
      <pre className="text-xs bg-black/5 dark:bg-white/5 rounded p-3 overflow-x-auto">
        {message}
      </pre>
    </div>
  );
}
