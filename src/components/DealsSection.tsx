"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DealPayment, DealSplit, DealStatus, DealWithLedger, PaymentType } from "@/types";

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
  passed: "#ff453a",
};

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  advance: "Advance",
  royalty: "Royalty",
  milestone: "Milestone",
  other: "Other",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

function ledgerTotals(payments: DealPayment[]) {
  const expected = payments.reduce((s, p) => s + p.amount, 0);
  const received = payments.filter((p) => p.received_date).reduce((s, p) => s + p.amount, 0);
  return { expected, received, outstanding: expected - received };
}

interface Props {
  artistId: string;
  initialDeals: DealWithLedger[];
}

export function DealsSection({ artistId, initialDeals }: Props) {
  const router = useRouter();
  const [deals, setDeals] = useState(initialDeals);
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealLoading, setDealLoading] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  const [dTitle, setDTitle] = useState("");
  const [dStatus, setDStatus] = useState<DealStatus>("prospecting");
  const [dValue, setDValue] = useState("");
  const [dCommission, setDCommission] = useState("");
  const [dNotes, setDNotes] = useState("");

  async function addDeal() {
    if (!dTitle.trim()) return;
    setDealLoading(true);
    setDealError(null);
    try {
      const res = await fetch(`/api/artists/${artistId}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dTitle.trim(),
          status: dStatus,
          deal_value: dValue ? Number(dValue) : null,
          commission_pct: dCommission ? Number(dCommission) : null,
          notes: dNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDeals((prev) => [{ ...data.deal, deal_payments: [], deal_splits: [] }, ...prev]);
      setDTitle(""); setDStatus("prospecting"); setDValue(""); setDCommission(""); setDNotes("");
      setShowDealForm(false);
      router.refresh();
    } catch (err) {
      setDealError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDealLoading(false);
    }
  }

  async function updateDealStatus(dealId: string, status: DealStatus) {
    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, ...data.deal } : d));
      router.refresh();
    }
  }

  async function deleteDeal(dealId: string) {
    if (!confirm("Delete this deal and all its payments?")) return;
    const res = await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    if (res.ok) {
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      router.refresh();
    }
  }

  async function addPayment(dealId: string, payment: Omit<DealPayment, "id" | "deal_id" | "created_at">) {
    const res = await fetch(`/api/deals/${dealId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payment),
    });
    const data = await res.json();
    if (res.ok) {
      setDeals((prev) => prev.map((d) => d.id === dealId
        ? { ...d, deal_payments: [...d.deal_payments, data.payment] }
        : d
      ));
      router.refresh();
    }
  }

  async function markPaymentReceived(dealId: string, paymentId: string) {
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ received_date: new Date().toISOString().split("T")[0] }),
    });
    const data = await res.json();
    if (res.ok) {
      setDeals((prev) => prev.map((d) => d.id === dealId
        ? { ...d, deal_payments: d.deal_payments.map((p) => p.id === paymentId ? data.payment : p) }
        : d
      ));
      router.refresh();
    }
  }

  async function deletePayment(dealId: string, paymentId: string) {
    const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    if (res.ok) {
      setDeals((prev) => prev.map((d) => d.id === dealId
        ? { ...d, deal_payments: d.deal_payments.filter((p) => p.id !== paymentId) }
        : d
      ));
      router.refresh();
    }
  }

  async function addSplit(dealId: string, name: string, split_pct: number) {
    const res = await fetch(`/api/deals/${dealId}/splits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, split_pct }),
    });
    const data = await res.json();
    if (res.ok) {
      setDeals((prev) => prev.map((d) => d.id === dealId
        ? { ...d, deal_splits: [...d.deal_splits, data.split] }
        : d
      ));
      router.refresh();
    }
  }

  async function deleteSplit(dealId: string, splitId: string) {
    const res = await fetch(`/api/splits/${splitId}`, { method: "DELETE" });
    if (res.ok) {
      setDeals((prev) => prev.map((d) => d.id === dealId
        ? { ...d, deal_splits: d.deal_splits.filter((s) => s.id !== splitId) }
        : d
      ));
      router.refresh();
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-label">Deals</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowDealForm((v) => !v)}>
          {showDealForm ? "Cancel" : "+ Add deal"}
        </button>
      </div>

      {showDealForm && (
        <div className="surface-card p-4 mb-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input className="input w-full" value={dTitle} onChange={(e) => setDTitle(e.target.value)} placeholder="e.g. Album deal" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select className="input w-full" value={dStatus} onChange={(e) => setDStatus(e.target.value as DealStatus)}>
                {Object.entries(DEAL_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Deal value ($)</label>
              <input type="number" className="input w-full" value={dValue} onChange={(e) => setDValue(e.target.value)} placeholder="e.g. 50000" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Commission (%)</label>
              <input type="number" className="input w-full" value={dCommission} onChange={(e) => setDCommission(e.target.value)} placeholder="e.g. 20" min="0" max="100" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea className="input w-full h-16 resize-none" value={dNotes} onChange={(e) => setDNotes(e.target.value)} placeholder="Optional" />
          </div>
          {dealError && <p className="text-xs text-red-500">{dealError}</p>}
          <button className="btn btn-primary btn-sm" onClick={addDeal} disabled={dealLoading || !dTitle.trim()}>
            {dealLoading ? "Saving…" : "Save deal"}
          </button>
        </div>
      )}

      {deals.length === 0 && !showDealForm && (
        <p className="text-sm text-[var(--muted)]">No deals yet.</p>
      )}

      <div className="space-y-3">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onStatusChange={(s) => updateDealStatus(deal.id, s)}
            onDelete={() => deleteDeal(deal.id)}
            onAddPayment={(p) => addPayment(deal.id, p)}
            onMarkPaymentReceived={(pid) => markPaymentReceived(deal.id, pid)}
            onDeletePayment={(pid) => deletePayment(deal.id, pid)}
            onAddSplit={(name, pct) => addSplit(deal.id, name, pct)}
            onDeleteSplit={(sid) => deleteSplit(deal.id, sid)}
          />
        ))}
      </div>
    </section>
  );
}

function DealCard({
  deal,
  onStatusChange,
  onDelete,
  onAddPayment,
  onMarkPaymentReceived,
  onDeletePayment,
  onAddSplit,
  onDeleteSplit,
}: {
  deal: DealWithLedger;
  onStatusChange: (s: DealStatus) => void;
  onDelete: () => void;
  onAddPayment: (p: Omit<DealPayment, "id" | "deal_id" | "created_at">) => void;
  onMarkPaymentReceived: (id: string) => void;
  onDeletePayment: (id: string) => void;
  onAddSplit: (name: string, pct: number) => void;
  onDeleteSplit: (id: string) => void;
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSplitForm, setShowSplitForm] = useState(false);
  const [pType, setPType] = useState<PaymentType>("advance");
  const [pAmount, setPAmount] = useState("");
  const [pExpected, setPExpected] = useState("");
  const [sName, setSName] = useState("");
  const [sPct, setSPct] = useState("");

  const { expected, received, outstanding } = ledgerTotals(deal.deal_payments);
  const projectedCommission = deal.deal_value && deal.commission_pct
    ? deal.deal_value * deal.commission_pct / 100
    : null;

  function submitPayment() {
    if (!pAmount) return;
    onAddPayment({
      payment_type: pType,
      amount: Number(pAmount),
      expected_date: pExpected || null,
      received_date: null,
      notes: null,
    });
    setPType("advance"); setPAmount(""); setPExpected("");
    setShowPaymentForm(false);
  }

  function submitSplit() {
    if (!sName.trim() || !sPct) return;
    onAddSplit(sName.trim(), Number(sPct));
    setSName(""); setSPct("");
    setShowSplitForm(false);
  }

  return (
    <details className="surface-card overflow-hidden group">
      <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center gap-3">
        <span
          className="text-[10px] font-semibold rounded px-1.5 py-0.5 shrink-0"
          style={{
            background: "var(--surface-2)",
            color: DEAL_STATUS_COLOR[deal.status],
            border: "1px solid var(--border)",
          }}
        >
          {DEAL_STATUS_LABELS[deal.status]}
        </span>
        <span className="font-semibold text-sm">{deal.title}</span>
        {deal.deal_value && (
          <span className="text-xs text-[var(--muted)]">{fmt(deal.deal_value)}</span>
        )}
        {deal.commission_pct && (
          <span className="text-xs text-[var(--muted)]">{deal.commission_pct}% commission</span>
        )}
        {expected > 0 && (
          <span className="text-xs ml-auto text-[var(--muted)]">
            {fmt(received)} / {fmt(expected)} received
          </span>
        )}
      </summary>

      <div className="px-4 pb-4 pt-3 border-t border-[var(--border)] space-y-4">
        {/* Status selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Status:</span>
          <select
            className="input text-xs py-0.5 h-auto"
            value={deal.status}
            onChange={(e) => onStatusChange(e.target.value as DealStatus)}
          >
            {Object.entries(DEAL_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={onDelete} className="ml-auto text-xs text-[var(--muted)] hover:text-red-500">Delete deal</button>
        </div>

        {/* Ledger summary */}
        {(projectedCommission !== null || expected > 0) && (
          <div className="grid grid-cols-3 gap-3 text-center">
            {projectedCommission !== null && (
              <div className="rounded-xl bg-[var(--surface-2)] p-2">
                <p className="text-[10px] text-[var(--muted)] mb-0.5">Projected commission</p>
                <p className="text-sm font-semibold">{fmt(projectedCommission)}</p>
              </div>
            )}
            {expected > 0 && (
              <>
                <div className="rounded-xl bg-[var(--surface-2)] p-2">
                  <p className="text-[10px] text-[var(--muted)] mb-0.5">Received</p>
                  <p className="text-sm font-semibold" style={{ color: "#30d158" }}>{fmt(received)}</p>
                </div>
                <div className="rounded-xl bg-[var(--surface-2)] p-2">
                  <p className="text-[10px] text-[var(--muted)] mb-0.5">Outstanding</p>
                  <p className="text-sm font-semibold" style={{ color: outstanding > 0 ? "#ff9f0a" : "#30d158" }}>{fmt(outstanding)}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Payments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Payments</span>
            <button className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setShowPaymentForm((v) => !v)}>
              {showPaymentForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showPaymentForm && (
            <div className="rounded-xl bg-[var(--surface-2)] p-3 mb-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium mb-1">Type</label>
                  <select className="input text-xs py-1 h-auto w-full" value={pType} onChange={(e) => setPType(e.target.value as PaymentType)}>
                    {Object.entries(PAYMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1">Amount ($)</label>
                  <input type="number" className="input text-xs py-1 h-auto w-full" value={pAmount} onChange={(e) => setPAmount(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium mb-1">Expected date</label>
                <input type="date" className="input text-xs py-1 h-auto w-full" value={pExpected} onChange={(e) => setPExpected(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={submitPayment} disabled={!pAmount}>Add payment</button>
            </div>
          )}

          {deal.deal_payments.length === 0 && !showPaymentForm && (
            <p className="text-xs text-[var(--muted)]">No payments logged.</p>
          )}

          <div className="space-y-1.5">
            {deal.deal_payments.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="text-[var(--muted)] shrink-0">{PAYMENT_TYPE_LABELS[p.payment_type]}</span>
                <span className="font-medium">{fmt(p.amount)}</span>
                {p.expected_date && <span className="text-[var(--muted)]">exp {p.expected_date}</span>}
                {p.received_date
                  ? <span style={{ color: "#30d158" }}>✓ received {p.received_date}</span>
                  : <button onClick={() => onMarkPaymentReceived(p.id)} className="text-[var(--muted)] hover:text-[var(--foreground)]">Mark received</button>
                }
                <button onClick={() => onDeletePayment(p.id)} className="ml-auto text-[var(--muted)] hover:text-red-500">×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Splits */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Team splits</span>
            <button className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setShowSplitForm((v) => !v)}>
              {showSplitForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showSplitForm && (
            <div className="rounded-xl bg-[var(--surface-2)] p-3 mb-2 flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-medium mb-1">Name</label>
                <input className="input text-xs py-1 h-auto w-full" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="e.g. Alice" />
              </div>
              <div className="w-24">
                <label className="block text-[10px] font-medium mb-1">Split %</label>
                <input type="number" className="input text-xs py-1 h-auto w-full" value={sPct} onChange={(e) => setSPct(e.target.value)} placeholder="50" min="0" max="100" />
              </div>
              <button className="btn btn-primary btn-sm" onClick={submitSplit} disabled={!sName.trim() || !sPct}>Add</button>
            </div>
          )}

          {deal.deal_splits.length === 0 && !showSplitForm && (
            <p className="text-xs text-[var(--muted)]">No splits defined.</p>
          )}

          <div className="space-y-1.5">
            {deal.deal_splits.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium">{s.name}</span>
                <span className="text-[var(--muted)]">{s.split_pct}%</span>
                {received > 0 && (
                  <span className="text-[var(--muted)]">= {fmt(received * s.split_pct / 100)}</span>
                )}
                <button onClick={() => onDeleteSplit(s.id)} className="ml-auto text-[var(--muted)] hover:text-red-500">×</button>
              </div>
            ))}
          </div>
        </div>

        {deal.notes && (
          <p className="text-xs text-[var(--muted)] italic">{deal.notes}</p>
        )}
      </div>
    </details>
  );
}
