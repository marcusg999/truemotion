import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentType } from "@/types";

const VALID_TYPES: PaymentType[] = ["advance", "royalty", "milestone", "other"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let payment_type: PaymentType, amount: number, expected_date: string | null, received_date: string | null, notes: string | undefined;

  try {
    const body = await request.json();
    payment_type = body.payment_type ?? "advance";
    amount = Number(body.amount);
    expected_date = body.expected_date || null;
    received_date = body.received_date || null;
    notes = body.notes?.trim() || undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!VALID_TYPES.includes(payment_type)) return NextResponse.json({ error: "Invalid payment_type" }, { status: 400 });
  if (!amount || isNaN(amount)) return NextResponse.json({ error: "amount required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("deal_payments")
    .insert({ deal_id: id, payment_type, amount, expected_date, received_date, notes: notes ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payment: data }, { status: 201 });
}
