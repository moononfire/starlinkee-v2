"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/translations";
import { postDemoStep } from "@/lib/demoTour";
import ReviewConversation from "./ReviewConversation";
import type { ReviewMessage } from "@/lib/types";

interface Props {
  scanId: string;
  lang: string;
}

export default function FeedbackForm({ scanId, lang }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstMessage, setFirstMessage] = useState<ReviewMessage | null>(null);

  useEffect(() => {
    postDemoStep("low_rating_feedback");
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const feedbackMessage = form.get("feedback_message") as string;
    await fetch("/api/review/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scanId,
        feedback_message: feedbackMessage,
        user_name: form.get("user_name") || undefined,
        contact_email: form.get("contact_email") || undefined,
        contact_phone: form.get("contact_phone") || undefined,
      }),
    });

    // Optimistic first bubble — the server inserts the same message into
    // review_messages asynchronously (non-blocking), so we render it
    // immediately instead of racing the realtime broadcast on mount.
    setFirstMessage({
      message_id: -1,
      review_id: 0,
      sender: "reporter",
      body: feedbackMessage,
      created_at: new Date().toISOString(),
    });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="w-full flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">{t("thank_you_short", lang)}</p>
          <p className="text-gray-500 mt-1">{t("appreciate_feedback", lang)}</p>
        </div>
        <ReviewConversation
          scanId={scanId}
          lang={lang}
          initialMessages={firstMessage ? [firstMessage] : []}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      <p className="text-gray-600 text-sm text-center">
        {t("sorry_share_feedback", lang)}
      </p>

      <textarea
        name="feedback_message"
        required
        rows={4}
        placeholder={t("message_placeholder", lang)}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-black bg-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <input
        name="user_name"
        type="text"
        placeholder={t("name_optional", lang)}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <input
        name="contact_email"
        type="email"
        placeholder={t("email_optional_input", lang)}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <input
        name="contact_phone"
        type="tel"
        placeholder={t("phone_optional", lang)}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? t("sending_feedback", lang) : t("send_feedback_btn", lang)}
      </button>
    </form>
  );
}
