"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/translations";
import { subscribeToReviewChannel } from "@/lib/supabase/realtime";
import type { ReviewMessage } from "@/lib/types";

interface Props {
  scanId: string;
  lang: string;
  initialMessages: ReviewMessage[];
}

export default function ReviewConversation({ scanId, lang, initialMessages }: Props) {
  const [messages, setMessages] = useState<ReviewMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/review/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId }),
    }).catch(() => {});

    const unsubscribe = subscribeToReviewChannel(scanId, (payload) => {
      setMessages((prev) => {
        if (prev.some((m) => m.message_id === payload.message_id)) return prev;
        // Replace the optimistic placeholder (negative id) for the same
        // message instead of appending a duplicate bubble.
        const optimisticIndex = prev.findIndex(
          (m) => m.message_id < 0 && m.sender === payload.sender && m.body === payload.body
        );
        const next = { ...payload, review_id: 0 };
        if (optimisticIndex !== -1) {
          const copy = [...prev];
          copy[optimisticIndex] = next;
          return copy;
        }
        return [...prev, next];
      });
    });
    return unsubscribe;
  }, [scanId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);

    const res = await fetch("/api/review/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId, body: draft.trim() }),
    });

    if (res.ok) {
      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
      setDraft("");
    }
    setSending(false);
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.message_id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.sender === "reporter"
                ? "self-end bg-gray-800 text-white"
                : "self-start bg-gray-100 text-gray-800"
            }`}
          >
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("conversation_reply_placeholder", lang)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {t("conversation_send_btn", lang)}
        </button>
      </form>
    </div>
  );
}
