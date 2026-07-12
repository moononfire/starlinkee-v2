"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/translations";
import { subscribeToPortalChannel } from "@/lib/supabase/realtime";
import type { ReviewThreadSummary } from "@/lib/db/review-messages";
import MessageThread from "./MessageThread";

interface Props {
  subscriptionId: number;
  initialThreads: ReviewThreadSummary[];
  lang: string;
}

const DATE_LOCALES: Record<string, string> = { en: "en-US", de: "de-DE", pl: "pl-PL" };

function formatTime(iso: string, lang: string): string {
  const locale = DATE_LOCALES[lang] ?? "en-US";
  return new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MessagesInbox({ subscriptionId, initialThreads, lang }: Props) {
  const [threads, setThreads] = useState<ReviewThreadSummary[]>(initialThreads);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(initialThreads[0]?.review_id ?? null);

  useEffect(() => {
    const unsubscribe = subscribeToPortalChannel(subscriptionId, (payload) => {
      setThreads((prev) => {
        const isOpen = payload.review_id === selectedReviewId;
        const updated = prev.map((th) =>
          th.review_id === payload.review_id
            ? {
                ...th,
                last_message_at: payload.last_message_at,
                last_message_sender: payload.last_message_sender,
                unread_count:
                  payload.last_message_sender === "reporter" && !isOpen ? th.unread_count + 1 : th.unread_count,
              }
            : th
        );
        return [...updated].sort((a, b) => (a.last_message_at < b.last_message_at ? 1 : -1));
      });
    });
    return unsubscribe;
  }, [subscriptionId, selectedReviewId]);

  function handleSelect(reviewId: number) {
    setSelectedReviewId(reviewId);
    setThreads((prev) => prev.map((th) => (th.review_id === reviewId ? { ...th, unread_count: 0 } : th)));
  }

  function handleSent(reviewId: number, lastMessageAt: string) {
    setThreads((prev) => {
      const updated = prev.map((th) =>
        th.review_id === reviewId ? { ...th, last_message_at: lastMessageAt, last_message_sender: "owner" as const } : th
      );
      return [...updated].sort((a, b) => (a.last_message_at < b.last_message_at ? 1 : -1));
    });
  }

  const selectedThread = threads.find((th) => th.review_id === selectedReviewId) ?? null;

  if (threads.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
        {t("portal_messages_empty", lang)}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex h-[70vh] overflow-hidden">
      <div className="w-full sm:w-80 shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        {threads.map((th) => (
          <button
            key={th.review_id}
            onClick={() => handleSelect(th.review_id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
              th.review_id === selectedReviewId ? "bg-gray-50 dark:bg-gray-700/50" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {th.user_name || th.contact_email || th.plate_number}
              </span>
              <span className="text-xs text-gray-400 shrink-0">{formatTime(th.last_message_at, lang)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{th.last_message_body}</span>
              {th.unread_count > 0 && (
                <span className="shrink-0 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {th.unread_count}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 hidden sm:flex">
        {selectedThread ? (
          <MessageThread key={selectedThread.review_id} thread={selectedThread} lang={lang} onSent={handleSent} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {t("portal_messages_no_thread_selected", lang)}
          </div>
        )}
      </div>
    </div>
  );
}
