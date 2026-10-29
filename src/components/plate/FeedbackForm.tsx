"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/translations";
import { postDemoStep } from "@/lib/demoTour";
import { isSafeGoogleReviewUrl } from "@/lib/urls";

interface Props {
  scanId: string;
  lang: string;
  googleReviewLink?: string | null;
}

export default function FeedbackForm({ scanId, lang, googleReviewLink }: Props) {
  const googleLink = googleReviewLink && isSafeGoogleReviewUrl(googleReviewLink) ? googleReviewLink : null;
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    postDemoStep("low_rating_feedback");
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const feedbackMessage = form.get("feedback_message") as string;
    try {
      const res = await fetch("/api/review/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          feedback_message: feedbackMessage,
          user_name: form.get("user_name") || undefined,
          contact_email: form.get("contact_email") || undefined,
          contact_phone: form.get("contact_phone") || undefined,
          language: lang,
        }),
      });
      // 409: feedback for this scan was already saved. Anything else that is not ok means it was NOT saved:
      // keep the form (and the typed text) and say so instead of pretending it was sent.
      if (res.ok || res.status === 409) {
        setAlreadySent(res.status === 409);
        setSubmitted(true);
      } else {
        setError(t("feedback_send_failed", lang));
      }
    } catch {
      setError(t("feedback_send_failed", lang));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">{t("thank_you_short", lang)}</p>
          {alreadySent ? (
            <p className="text-gray-500 mt-1">{t("feedback_already_sent", lang)}</p>
          ) : (
            <>
              <p className="text-gray-500 mt-1">{t("appreciate_feedback", lang)}</p>
              <p className="text-gray-500 mt-1">{t("we_will_be_in_touch", lang)}</p>
            </>
          )}
        </div>
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
        required
        placeholder={t("email_required_input", lang)}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <input
        name="contact_phone"
        type="tel"
        placeholder={t("phone_optional", lang)}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm text-black bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      {error && (
        <p role="alert" className="text-center text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? t("sending_feedback", lang) : t("send_feedback_btn", lang)}
      </button>

      {googleLink && (
        <p className="text-center text-xs">
          <a
            href={googleLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {t("prefer_google_review_link", lang)}
          </a>
        </p>
      )}
    </form>
  );
}
