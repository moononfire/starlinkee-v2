import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertMessage, listThreadsBySubscriptionId, markOwnerRead } from "@/lib/db/review-messages";
import { broadcastToChannel } from "@/lib/realtime/broadcast";
import { sendReplyNotification } from "@/lib/email";
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

  const { reviewId, body } = await request.json();
  if (!reviewId || !body?.trim()) {
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
    sendReplyNotification(review.contact_email, customer.preferred_language, {
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
      sendSms(review.contact_phone, text).catch(() => {});
    } else {
      smsQuotaExceeded = true;
    }
  }

  return NextResponse.json({ message: created, smsQuotaExceeded });
}

export async function PATCH(request: NextRequest) {
  const { customer, subscriptions } = await getPortalSession();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await request.json();
  if (!reviewId) return NextResponse.json({ error: "Missing reviewId" }, { status: 400 });

  const review = await getReviewForOwner(reviewId, subscriptions.map((s) => s.subscription_id));
  if (!review) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await markOwnerRead(reviewId);
  return NextResponse.json({ success: true });
}

interface OwnerReviewRow {
  review_id: number;
  scan_id: string;
  contact_email: string | null;
  contact_phone: string | null;
  plates: {
    plate_number: string;
    subscription_id: number;
    subscriptions: { customer_locations: { location_name: string }[] | null } | null;
  } | null;
}

async function getReviewForOwner(reviewId: number, ownedSubscriptionIds: number[]) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      "review_id, scan_id, contact_email, contact_phone, plates!inner(plate_number, subscription_id, subscriptions(customer_locations(location_name)))"
    )
    .eq("review_id", reviewId)
    .returns<OwnerReviewRow[]>()
    .single();

  if (!data?.plates?.subscription_id || !ownedSubscriptionIds.includes(data.plates.subscription_id)) {
    return null;
  }

  return {
    review_id: data.review_id,
    scan_id: data.scan_id,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    subscription_id: data.plates.subscription_id,
    plate_number: data.plates.plate_number,
    location_name: data.plates.subscriptions?.customer_locations?.[0]?.location_name ?? null,
  };
}

function buildScanUrl(plateNumber: string, scanId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/plate/${plateNumber}/scan/${scanId}`;
}
