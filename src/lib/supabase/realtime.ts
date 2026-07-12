import { createClient } from "./client";

export interface ReviewMessagePayload {
  message_id: number;
  sender: "reporter" | "owner";
  body: string;
  created_at: string;
}

export interface ThreadUpdatedPayload {
  review_id: number;
  last_message_at: string;
  last_message_sender: "reporter" | "owner";
}

export function subscribeToReviewChannel(
  scanId: string,
  onMessage: (payload: ReviewMessagePayload) => void
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`review:${scanId}`)
    .on("broadcast", { event: "new_message" }, ({ payload }) => onMessage(payload as ReviewMessagePayload))
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPortalChannel(
  subscriptionId: number,
  onThreadUpdate: (payload: ThreadUpdatedPayload) => void
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`review-portal:${subscriptionId}`)
    .on("broadcast", { event: "thread_updated" }, ({ payload }) => onThreadUpdate(payload as ThreadUpdatedPayload))
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
