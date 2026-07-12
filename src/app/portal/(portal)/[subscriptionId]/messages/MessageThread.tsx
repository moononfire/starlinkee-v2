"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/translations";
import { subscribeToReviewChannel } from "@/lib/supabase/realtime";
import type { ReviewMessage } from "@/lib/types";
import type { ReviewThreadSummary } from "@/lib/db/review-messages";

interface Props {
  thread: ReviewThreadSummary;
  lang: string;
  onSent: (reviewId: number, lastMessageAt: string) => void;
}

export default function MessageThread({ thread, lang, onSent }: Props) {
  const [messages, setMessages] = useState<ReviewMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/review/messages?scanId=${thread.scan_id}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => {});

    fetch("/api/portal/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: thread.review_id }),
    }).catch(() => {});

    const unsubscribe = subscribeToReviewChannel(thread.scan_id, (payload) => {
      setMessages((prev) =>
        prev.some((m) => m.message_id === payload.message_id) ? prev : [...prev, { ...payload, review_id: thread.review_id }]
      );
    });
    return unsubscribe;
  }, [thread.review_id, thread.scan_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);

    const res = await fetch("/api/portal/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: thread.review_id, body: draft.trim() }),
    });

    if (res.ok) {
      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
      setDraft("");
      onSent(thread.review_id, message.created_at);
    }
    setSending(false);
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((m) => (
          <div
            key={m.message_id}
            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
              m.sender === "owner"
                ? "self-end bg-blue-600 text-white"
                : "self-start bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            }`}
          >
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder={t("portal_messages_reply_placeholder", lang)}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors self-end"
        >
          {t("portal_messages_send", lang)}
        </button>
      </form>
    </div>
  );
}
