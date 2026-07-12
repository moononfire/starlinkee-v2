import { createAdminClient } from "../supabase/admin";
import type { ReviewMessage } from "../types";

export async function listMessagesByReviewId(reviewId: number): Promise<ReviewMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("review_messages")
    .select("*")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list messages: ${error.message}`);
  return data ?? [];
}

export async function listMessagesByScanId(scanId: string): Promise<ReviewMessage[]> {
  const supabase = createAdminClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("review_id")
    .eq("scan_id", scanId)
    .single();
  if (!review) return [];
  return listMessagesByReviewId(review.review_id);
}

export async function insertMessage(
  reviewId: number,
  sender: "reporter" | "owner",
  body: string
): Promise<ReviewMessage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("review_messages")
    .insert({ review_id: reviewId, sender, body })
    .select()
    .single();
  if (error) throw new Error(`Failed to insert message: ${error.message}`);
  return data;
}

export async function markOwnerRead(reviewId: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reviews")
    .update({ owner_last_read_at: new Date().toISOString() })
    .eq("review_id", reviewId);
  if (error) throw new Error(`Failed to mark thread read: ${error.message}`);
}

export async function markReporterRead(scanId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reviews")
    .update({ reporter_last_read_at: new Date().toISOString() })
    .eq("scan_id", scanId);
  if (error) throw new Error(`Failed to mark thread read: ${error.message}`);
}

export interface ReviewThreadSummary {
  review_id: number;
  scan_id: string;
  plate_number: string;
  user_name: string | null;
  contact_email: string | null;
  rating: number | null;
  last_message_body: string;
  last_message_at: string;
  last_message_sender: "reporter" | "owner";
  unread_count: number;
}

interface ReviewThreadRow {
  review_id: number;
  scan_id: string;
  user_name: string | null;
  contact_email: string | null;
  rating: number | null;
  owner_last_read_at: string | null;
  plates: { plate_number: string; subscription_id: number } | null;
}

export async function listThreadsBySubscriptionId(subscriptionId: number): Promise<ReviewThreadSummary[]> {
  const supabase = createAdminClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("review_id, scan_id, user_name, contact_email, rating, owner_last_read_at, plates!inner(plate_number, subscription_id)")
    .eq("plates.subscription_id", subscriptionId)
    .not("feedback_time", "is", null)
    .returns<ReviewThreadRow[]>();
  if (error) throw new Error(`Failed to list threads: ${error.message}`);
  if (!reviews || reviews.length === 0) return [];

  const reviewIds = reviews.map((r) => r.review_id);
  const { data: messages, error: messagesError } = await supabase
    .from("review_messages")
    .select("*")
    .in("review_id", reviewIds)
    .order("created_at", { ascending: true });
  if (messagesError) throw new Error(`Failed to list messages: ${messagesError.message}`);

  const messagesByReview = new Map<number, ReviewMessage[]>();
  for (const message of messages ?? []) {
    const list = messagesByReview.get(message.review_id) ?? [];
    list.push(message);
    messagesByReview.set(message.review_id, list);
  }

  const threads = reviews.map((row): ReviewThreadSummary | null => {
    const threadMessages = messagesByReview.get(row.review_id) ?? [];
    const lastMessage = threadMessages[threadMessages.length - 1];
    if (!lastMessage) return null;
    const ownerLastReadAt = row.owner_last_read_at as string | null;
    const unreadCount = threadMessages.filter(
      (m) => m.sender === "reporter" && (!ownerLastReadAt || m.created_at > ownerLastReadAt)
    ).length;
    return {
      review_id: row.review_id,
      scan_id: row.scan_id,
      plate_number: row.plates?.plate_number ?? "?",
      user_name: row.user_name,
      contact_email: row.contact_email,
      rating: row.rating,
      last_message_body: lastMessage.body,
      last_message_at: lastMessage.created_at,
      last_message_sender: lastMessage.sender,
      unread_count: unreadCount,
    };
  });

  return threads
    .filter((t): t is ReviewThreadSummary => t !== null)
    .sort((a, b) => (a.last_message_at < b.last_message_at ? 1 : -1));
}

export async function getUnreadThreadCountBySubscriptionId(subscriptionId: number): Promise<number> {
  const threads = await listThreadsBySubscriptionId(subscriptionId);
  return threads.filter((t) => t.unread_count > 0).length;
}
