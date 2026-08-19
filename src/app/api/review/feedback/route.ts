import { NextRequest, NextResponse } from "next/server";
import { updateFeedback, getReviewByScanId } from "@/lib/db/reviews";
import { getPlateByNumber } from "@/lib/db/plates";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { getCustomerById } from "@/lib/db/customers";
import { sendFeedbackNotification } from "@/lib/email";
import { insertMessage } from "@/lib/db/review-messages";
import { broadcastToChannel } from "@/lib/realtime/broadcast";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { scanId, feedback_message, user_name, contact_email, contact_phone } = body;

  if (!scanId || !feedback_message?.trim()) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await updateFeedback(scanId, { feedback_message, user_name, contact_email, contact_phone });

    // Send notification email to the venue's support email
    await sendNotification(scanId, feedback_message, user_name, contact_email, contact_phone).catch((err) => {
      console.error("[sendNotification] Nie udało się wysłać powiadomienia:", err);
    });

    // Seed the message thread
    seedThread(scanId, feedback_message).catch(() => {});
  } catch (err) {
    console.error("[Feedback POST] Główny błąd:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function seedThread(scanId: string, message: string) {
  const review = await getReviewByScanId(scanId);
  if (!review) return;

  const created = await insertMessage(review.review_id, "reporter", message);
  await broadcastToChannel(`review:${scanId}`, "new_message", {
    message_id: created.message_id,
    sender: created.sender,
    body: created.body,
    created_at: created.created_at,
  });

  const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
  const { data: plate } = await supabase
    .from("plates")
    .select("subscription_id")
    .eq("plate_id", review.plate_id)
    .single();
  if (!plate?.subscription_id) return;

  await broadcastToChannel(`review-portal:${plate.subscription_id}`, "thread_updated", {
    review_id: review.review_id,
    last_message_at: created.created_at,
    last_message_sender: created.sender,
  });
}

async function sendNotification(
  scanId: string,
  message: string,
  userName?: string,
  contactEmail?: string,
  contactPhone?: string
) {
  console.log("[sendNotification] Start dla scanId:", scanId);
  const review = await getReviewByScanId(scanId);
  if (!review) {
    console.log("[sendNotification] PRZERWANO: Nie znaleziono opinii (review) w bazie.");
    return;
  }

  const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
  const { data: plate, error: plateError } = await supabase
    .from("plates")
    .select("plate_number, subscription_id")
    .eq("plate_id", review.plate_id)
    .single();

  if (plateError) {
    console.error("[sendNotification] PRZERWANO: Błąd pobierania płytki:", plateError);
    return;
  }
  if (!plate?.subscription_id) {
    console.log("[sendNotification] PRZERWANO: Płytka nie ma przypisanej subskrypcji.");
    return;
  }

  const location = await getLocationBySubscriptionId(plate.subscription_id);
  if (!location) {
    console.log("[sendNotification] PRZERWANO: Nie znaleziono lokalizacji dla subskrypcji:", plate.subscription_id);
    return;
  }
  if (!location.support_email) {
    console.log("[sendNotification] PRZERWANO: Lokalizacja NIE MA ustawionego 'support_email'.");
    return;
  }

  const subscription = await getSubscriptionById(plate.subscription_id);
  const customer = subscription ? await getCustomerById(subscription.customer_id) : null;

  console.log(`[sendNotification] Znalazłem support_email: ${location.support_email}. Wywołuję sendFeedbackNotification...`);
  await sendFeedbackNotification(location.support_email, customer?.preferred_language ?? "en", {
    locationName: location.location_name,
    rating: review.rating ?? 0,
    message,
    userName,
    contactEmail,
    contactPhone,
  });
}
