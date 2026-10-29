import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertMessage, listThreadsBySubscriptionId, markOwnerRead } from "@/lib/db/review-messages";
import { broadcastToChannel } from "@/lib/realtime/broadcast";
import { sendReplyNotification } from "@/lib/email";
import { guestLanguage } from "@/lib/languages";
import { sendSms } from "@/lib/sms";
import { consumeSmsCredit } from "@/lib/sms-quota";

export async function GET(request: NextRequest) {
  const { customer, subscriptions } = await getPortalSession();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptionId = Number(request.nextUrl.searchParams.get("subscriptionId"));
  if (!subscriptionId || !subscriptions.some((s) => s.subscription_id === subscriptionId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const threads = await listThreadsBySubscriptionId(subscriptionId);
  return NextResponse.json({ threads });
}

export async function POST(request: NextRequest) {
  const { customer, subscriptions } = await getPortalSession();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await request.json().catch(() => null);
  const { reviewId, body } = parsed ?? {};
  if (!reviewId || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const review = await getReviewForOwner(reviewId, subscriptions.map((s) => s.subscription_id));
  if (!review) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await insertMessage(reviewId, "owner", body.trim());
  await markOwnerRead(reviewId);

  broadcastToChannel(`review:${review.scan_id}`, "new_message", {
    message_id: created.message_id,
    sender: created.sender,
    body: created.body,
    created_at: created.created_at,
  }).catch(() => {});
  broadcastToChannel(`review-portal:${review.subscription_id}`, "thread_updated", {
    review_id: reviewId,
    last_message_at: created.created_at,
    last_message_sender: created.sender,
  }).catch(() => {});

  let smsQuotaExceeded = false;

  if (review.contact_email) {
    // The reporter is a guest: write in the language they used, else the plate's, never the owner's.
    await sendReplyNotification(review.contact_email, guestLanguage(review.guest_language, { plate_language: review.plate_language }), {
      locationName: review.location_name ?? "",
      message: created.body,
      scanUrl: buildScanUrl(review.plate_number, review.scan_id),
    }).catch(() => {});
  } else if (review.contact_phone) {
    const hasCredit = await consumeSmsCredit(customer.customer_id);
    if (hasCredit) {
      const text = review.location_name
        ? `${review.location_name}: ${created.body}`
        : created.body;
      await sendSms(review.contact_phone, text).catch(() => {});
    } else {
      smsQuotaExceeded = true;
    }
  }

  return NextResponse.json({ message: created, smsQuotaExceeded });
}

export async function PATCH(request: NextRequest) {
  const { customer, subscriptions } = await getPortalSession();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await request.json().catch(() => null);
  const { reviewId } = parsed ?? {};
  if (!reviewId) return NextResponse.json({ error: "Missing reviewId" }, { status: 400 });

  const review = await getReviewForOwner(reviewId, subscriptions.map((s) => s.subscription_id));
  if (!review) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await markOwnerRead(reviewId);
  return NextResponse.json({ success: true });
}

interface OwnerReviewRow {
  review_id: number;
  scan_id: string;
  subscription_id: number | null;
  guest_language: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  plates: { plate_number: string; plate_language: string } | null;
  subscriptions: { customer_locations: { location_name: string }[] | null } | null;
}

// The owner of a thread is the subscription the review was created under (reviews.subscription_id),
// not whoever holds the plate today (F12).
async function getReviewForOwner(reviewId: number, ownedSubscriptionIds: number[]) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      "review_id, scan_id, subscription_id, guest_language, contact_email, contact_phone, plates!inner(plate_number, plate_language), subscriptions(customer_locations(location_name))"
    )
    .eq("review_id", reviewId)
    .returns<OwnerReviewRow[]>()
    .single();

  if (!data?.subscription_id || !ownedSubscriptionIds.includes(data.subscription_id) || !data.plates) {
    return null;
  }

  return {
    review_id: data.review_id,
    scan_id: data.scan_id,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    subscription_id: data.subscription_id,
    plate_number: data.plates.plate_number,
    plate_language: data.plates.plate_language,
    guest_language: data.guest_language,
    location_name: data.subscriptions?.customer_locations?.[0]?.location_name ?? null,
  };
}

function buildScanUrl(plateNumber: string, scanId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/plate/${plateNumber}/scan/${scanId}`;
}
