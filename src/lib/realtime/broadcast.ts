// Server-side fire-and-forget broadcast over the Supabase Realtime REST
// endpoint. Deliberately plain fetch, not a websocket channel — Route
// Handlers don't keep a socket alive, and delivery is best-effort (the DB
// row is always the source of truth; a missed broadcast just means the
// client falls back to its next fetch/poll).
export async function broadcastToChannel(
  topic: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: [{ topic, event, payload }] }),
  });
}
