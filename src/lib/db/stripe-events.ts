import { createAdminClient } from "../supabase/admin";

/** A "processing" claim older than this is assumed dead (function timed out) and may be retried. */
const STALE_PROCESSING_MS = 5 * 60_000;

/**
 * claimed     - this delivery owns the event and must process it
 * done        - already processed: acknowledge with 2xx
 * in_progress - another delivery is processing it right now: do NOT acknowledge
 *               (respond non-2xx so Stripe retries later; if that attempt dies
 *               or times out, the retry will find it stale/failed and take over)
 */
export type ClaimResult = "claimed" | "done" | "in_progress";

/**
 * Atomically claims a Stripe event for processing. Stripe delivers at least
 * once; a previously failed or stale claim may be taken over.
 */
export async function claimStripeEvent(eventId: string): Promise<ClaimResult> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("stripe_events").insert({ event_id: eventId, status: "processing" });
  if (!error) return "claimed";
  if (error.code !== "23505") throw new Error(`Failed to claim Stripe event: ${error.message}`);

  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data: retried, error: retryError } = await supabase
    .from("stripe_events")
    .update({ status: "processing", error: null, updated_at: now })
    .eq("event_id", eventId)
    .or(`status.eq.failed,and(status.eq.processing,updated_at.lt.${staleBefore})`)
    .select("event_id");
  if (retryError) throw new Error(`Failed to re-claim Stripe event: ${retryError.message}`);
  if ((retried?.length ?? 0) > 0) return "claimed";

  const { data: current } = await supabase.from("stripe_events").select("status").eq("event_id", eventId).single();
  return current?.status === "done" ? "done" : "in_progress";
}

export async function markStripeEventDone(eventId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("stripe_events")
    .update({ status: "done", error: null, updated_at: new Date().toISOString() })
    .eq("event_id", eventId);
}

export async function markStripeEventFailed(eventId: string, message: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("stripe_events")
    .update({ status: "failed", error: message.slice(0, 1000), updated_at: new Date().toISOString() })
    .eq("event_id", eventId);
}
