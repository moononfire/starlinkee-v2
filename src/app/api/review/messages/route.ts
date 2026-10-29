import { NextRequest, NextResponse } from "next/server";
import { getReviewByScanId } from "@/lib/db/reviews";
import { insertMessage, listMessagesByScanId, markReporterRead } from "@/lib/db/review-messages";
import { broadcastToChannel } from "@/lib/realtime/broadcast";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { getCustomerById } from "@/lib/db/customers";
import { sendGuestReplyNotification } from "@/lib/email";
import { ownerLanguage } from "@/lib/languages";
import { rateLimitPersistent } from "@/lib/rate-limit-persistent";

// At most one "guest replied" email per thread in this window, so a chatty guest cannot flood the owner.
const REPLY_MAIL_WINDOW_MS = 15 * 60_000;

// The reporter has no account — the scanId (already a de facto bearer
// token elsewhere: getReviewByScanId/updateFeedback) is their credential
// for reading and continuing this thread.

export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get("scanId");
  if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

  const messages = await listMessagesByScanId(scanId);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const parsed = await request.json().catch(() => null);
  const { scanId, body } = parsed ?? {};
  if (!scanId || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const review = await getReviewByScanId(scanId);
  if (!review || !review.feedback_time) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const created = await insertMessage(review.review_id, "reporter", body.trim());

  broadcastToChannel(`review:${scanId}`, "new_message", {
    message_id: created.message_id,
    sender: created.sender,
    body: created.body,
    created_at: created.created_at,
  }).catch(() => {});

  await notifyPortal(review.subscription_id, review.review_id, created.created_at, created.sender).catch(() => {});
  await emailOwner(review.plate_id, review.subscription_id, review.review_id, created.body).catch((err) =>
    console.error("[review messages] owner email failed:", err)
  );

  return NextResponse.json({ message: created });
}

export async function PATCH(request: NextRequest) {
  const { scanId } = await request.json();
  if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

  await markReporterRead(scanId);
  return NextResponse.json({ success: true });
}

async function notifyPortal(
  subscriptionId: number | null,
  reviewId: number,
  lastMessageAt: string,
  lastMessageSender: "reporter" | "owner"
) {
  // The thread belongs to the subscription the review was created under (F12).
  if (!subscriptionId) return;

  await broadcastToChannel(`review-portal:${subscriptionId}`, "thread_updated", {
    review_id: reviewId,
    last_message_at: lastMessageAt,
    last_message_sender: lastMessageSender,
  });
}

/** F7: the owner's portal is usually closed, so a guest's reply must also reach them by email. */
async function emailOwner(plateId: number, subscriptionId: number | null, reviewId: number, message: string) {
  if (!subscriptionId) return;
  const supabase = createAdminClient();
  const { data: plate } = await supabase.from("plates").select("plate_language").eq("plate_id", plateId).single();

  const location = await getLocationBySubscriptionId(subscriptionId);
  if (!location?.support_email) return;

  // Checked last, so a reply that has nobody to notify does not use up the window.
  if (!(await rateLimitPersistent(`guest-reply-mail:${reviewId}`, 1, REPLY_MAIL_WINDOW_MS))) return;

  const subscription = await getSubscriptionById(subscriptionId);
  const customer = subscription ? await getCustomerById(subscription.customer_id) : null;

  await sendGuestReplyNotification(location.support_email, ownerLanguage(customer, plate), {
    locationName: location.location_name,
    message,
    subscriptionId,
  });
}
