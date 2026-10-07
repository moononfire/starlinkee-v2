import type { ReviewMessage } from "./types";

// The thread only becomes visible to the reporter once the owner has replied
// (which is also when the reporter gets the email link back to this page).
export function hasOwnerReply(messages: Pick<ReviewMessage, "sender">[]): boolean {
  return messages.some((m) => m.sender === "owner");
}
