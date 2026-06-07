import { NextRequest, NextResponse } from "next/server";
import { updateFeedback, getReviewByScanId } from "@/lib/db/reviews";
import { getPlateByNumber } from "@/lib/db/plates";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { sendFeedbackNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { scanId, feedback_message, user_name, contact_email, contact_phone } = body;

  if (!scanId || !feedback_message?.trim()) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await updateFeedback(scanId, { feedback_message, user_name, contact_email, contact_phone });

    // Send notification email to the venue's support email (non-blocking)
    sendNotification(scanId, feedback_message, user_name, contact_email, contact_phone).catch(() => {});
  } catch {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function sendNotification(
  scanId: string,
  message: string,
  userName?: string,
  contactEmail?: string,
  contactPhone?: string
) {
  const review = await getReviewByScanId(scanId);
  if (!review) return;

  // Get plate → subscription → location to find support_email
  const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
  const { data: plate } = await supabase
    .from("plates")
    .select("plate_number, subscription_id")
    .eq("plate_id", review.plate_id)
    .single();

  if (!plate?.subscription_id) return;

  const location = await getLocationBySubscriptionId(plate.subscription_id);
  if (!location?.support_email) return;

  await sendFeedbackNotification(location.support_email, {
    locationName: location.location_name,
    rating: review.rating ?? 0,
    message,
    userName,
    contactEmail,
    contactPhone,
  });
}
