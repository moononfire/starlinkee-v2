import { NextRequest, NextResponse } from "next/server";
import { getReviewByScanId } from "@/lib/db/reviews";
import { insertMessage, listMessagesByScanId, markReporterRead } from "@/lib/db/review-messages";
import { broadcastToChannel } from "@/lib/realtime/broadcast";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { scanId, body } = await request.json();
  if (!scanId || !body?.trim()) {
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

  await notifyPortal(review.plate_id, review.review_id, created.created_at, created.sender).catch(() => {});

  return NextResponse.json({ message: created });
}

export async function PATCH(request: NextRequest) {
  const { scanId } = await request.json();
  if (!scanId) return NextResponse.json({ error: "Missing scanId" }, { status: 400 });

  await markReporterRead(scanId);
  return NextResponse.json({ success: true });
}

async function notifyPortal(
  plateId: number,
  reviewId: number,
  lastMessageAt: string,
  lastMessageSender: "reporter" | "owner"
) {
  const supabase = createAdminClient();
  const { data: plate } = await supabase
    .from("plates")
    .select("subscription_id")
    .eq("plate_id", plateId)
    .single();
  if (!plate?.subscription_id) return;

  await broadcastToChannel(`review-portal:${plate.subscription_id}`, "thread_updated", {
    review_id: reviewId,
    last_message_at: lastMessageAt,
    last_message_sender: lastMessageSender,
  });
}
