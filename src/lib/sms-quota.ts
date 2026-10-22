import { createAdminClient } from "./supabase/admin";

// Every customer gets this many free SMS credits per month — used both for
// review replies sent by SMS (to reviewers who only left a phone number)
// and, in the future, marketing email sends.
export const MONTHLY_SMS_LIMIT = 100;

export interface SmsQuota {
  used: number;
  limit: number;
  resetAt: string;
}

interface QuotaRow {
  sms_credits_used: number;
  sms_credits_reset_at: string;
}

function isDue(resetAt: string): boolean {
  return new Date(resetAt) <= new Date();
}

function nextReset(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function getSmsQuota(customerId: number): Promise<SmsQuota> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("sms_credits_used, sms_credits_reset_at")
    .eq("customer_id", customerId)
    .single<QuotaRow>();

  if (!data || isDue(data.sms_credits_reset_at)) {
    return { used: 0, limit: MONTHLY_SMS_LIMIT, resetAt: data?.sms_credits_reset_at ?? nextReset() };
  }
  return { used: data.sms_credits_used, limit: MONTHLY_SMS_LIMIT, resetAt: data.sms_credits_reset_at };
}

/**
 * Consumes one SMS credit for the customer, lazily rolling the monthly
 * window forward if it has elapsed. Returns false (no credit consumed) once
 * the customer has used all their credits for the current month.
 */
export async function consumeSmsCredit(customerId: number): Promise<boolean> {
  const supabase = createAdminClient();

  // Compare-and-swap on the counter we read: a concurrent consumer that got in
  // first changes it, our update matches no row, and we re-read and try again.
  // (A plain read-then-write let parallel replies overshoot the monthly limit.)
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase
      .from("customers")
      .select("sms_credits_used, sms_credits_reset_at")
      .eq("customer_id", customerId)
      .single<QuotaRow>();
    if (!data) return false;

    const due = isDue(data.sms_credits_reset_at);
    const used = due ? 0 : data.sms_credits_used;
    if (used >= MONTHLY_SMS_LIMIT) return false;

    const { data: updated, error } = await supabase
      .from("customers")
      .update({
        sms_credits_used: used + 1,
        ...(due ? { sms_credits_reset_at: nextReset() } : {}),
      })
      .eq("customer_id", customerId)
      .eq("sms_credits_used", data.sms_credits_used)
      .eq("sms_credits_reset_at", data.sms_credits_reset_at)
      .select("customer_id");
    if (error) throw new Error(`Failed to update SMS credits: ${error.message}`);
    if ((updated?.length ?? 0) > 0) return true;
  }
  return false;
}
