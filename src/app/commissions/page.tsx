import Link from "next/link";
import { listDealsWithArtist } from "@/lib/data";
import { SetupNotice } from "@/components/SetupNotice";
import type { DealStatus } from "@/types";

const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  prospecting: "Prospecting",
  negotiating: "Negotiating",
  closed: "Closed",
  passed: "Passed",
};

const DEAL_STATUS_COLOR: Record<DealStatus, string> = {
  prospecting: "#ff9f0a",
  negotiating: "#0a84ff",
  closed: "#30d158",
  passed: "#8e8e93",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

export default async function CommissionsPage() {
  let deals;
  try {
    deals = await listDealsWithArtist();
  } catch (err) {
    return <SetupNotice error={err} />;
  }

  const activeDeals = deals.filter((d) => d.status !== "passed");
  const totalExpected = deals.flatMap((d) => d.deal_payments).reduce((s, p) => s + p.amount, 0);
  const totalReceived = deals.flatMap((d) => d.deal_payments).filter((p) => p.received_date).reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = totalExpected - totalReceived;
  const openDealValue = activeDeals.reduce((s, d) => s + (d.deal_value ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Commissions</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          {activeDeals.length} active deal{activeDeals.length !== 1 ? "s" : ""} · {deals.length} total
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-card p-4 text-center">
          <p className="text-xl font-bold">{fmt(openDealValue)}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] mt-1">Open deal value</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-xl font-bold">{fmt(totalExpected)}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] mt-1">Expected</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-xl font-bold" style={{ color: "#30d158" }}>{fmt(totalReceived)}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] mt-1">Received</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-xl font-bold" style={{ color: totalOutstanding > 0 ? "#ff9f0a" : "#30d158" }}>
            {fmt(totalOutstanding)}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] mt-1">Outstanding</p>
        </div>
      </div>

      {deals.length === 0 && (
        <div className="surface-card p-10 text-center text-[var(--muted)]">
          <p className="mb-2">No deals yet.</p>
          <p className="text-sm">Add a deal from any artist profile to start tracking commissions.</p>
        </div>
      )}

      {/* Deal table */}
      {deals.length > 0 && (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Artist</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Deal</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Value</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Commission</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Received</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const expected = deal.deal_payments.reduce((s, p) => s + p.amount, 0);
                  const received = deal.deal_payments.filter((p) => p.received_date).reduce((s, p) => s + p.amount, 0);
                  const outstanding = expected - received;
                  const projectedCommission = deal.deal_value && deal.commission_pct
                    ? deal.deal_value * deal.commission_pct / 100
                    : null;

                  return (
                    <tr key={deal.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-4 py-3">
                        {deal.artists ? (
                          <Link href={`/artists/${deal.artists.id}`} className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
                            {deal.artists.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">{deal.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-semibold rounded px-1.5 py-0.5"
                          style={{
                            background: "var(--surface-2)",
                            color: DEAL_STATUS_COLOR[deal.status],
                            border: "1px solid var(--border)",
                          }}
                        >
                          {DEAL_STATUS_LABELS[deal.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--muted)]">
                        {deal.deal_value ? fmt(deal.deal_value) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--muted)]">
                        {projectedCommission ? fmt(projectedCommission) : deal.commission_pct ? `${deal.commission_pct}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: received > 0 ? "#30d158" : "var(--muted)" }}>
                        {expected > 0 ? fmt(received) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: outstanding > 0 ? "#ff9f0a" : "var(--muted)" }}>
                        {expected > 0 ? fmt(outstanding) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
