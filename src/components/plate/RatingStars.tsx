"use client";

import { useEffect, useState } from "react";
import FeedbackForm from "./FeedbackForm";
import { t } from "@/lib/translations";
import { postDemoStep } from "@/lib/demoTour";

interface Props {
  scanId: string;
  googleReviewLink: string;
  lang: string;
}

export default function RatingStars({ scanId, googleReviewLink, lang }: Props) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  // A back/forward navigation can restore this exact DOM from the browser's
  // bfcache instead of asking the server for the page again. Force a real
  // reload so the server re-checks whether this scan already has a rating
  // (otherwise a visitor could rate 1 star, hit "back", and re-roll 5 stars
  // straight to Google without physically rescanning the plate).
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleRate(rating: number) {
    if (submitted || loading) return;
    setLoading(true);
    setSelected(rating);
    postDemoStep("rating_selected", { rating });

    const res = await fetch("/api/plate/rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId, rating }),
    });

    setLoading(false);
    setSubmitted(true);

    if (res.status === 409) {
      const { rating: existingRating } = await res.json();
      setSelected(existingRating);
      setAlreadyRated(true);
      return;
    }

    if (!res.ok) return;
    const { redirectToGoogle } = await res.json();

    if (redirectToGoogle && googleReviewLink) {
      postDemoStep("high_rating_redirect", { rating });
      window.location.href = googleReviewLink;
    } else {
      setShowFeedback(true);
    }
  }

  if (showFeedback) {
    return <FeedbackForm scanId={scanId} lang={lang} />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            disabled={submitted || loading}
            className="text-5xl transition-transform hover:scale-110 disabled:cursor-default"
            aria-label={`${star} star`}
          >
            <span
              className={
                star <= (hovered || selected)
                  ? "text-yellow-400"
                  : "text-gray-300"
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>
      {loading && (
        <p className="text-sm text-gray-400">...</p>
      )}
      {alreadyRated && (
        <>
          <p className="text-sm text-gray-500 text-center">
            {t("already_rated_message", lang).replace("{stars}", String(selected))}
          </p>
          <button
            onClick={() => setShowFeedback(true)}
            className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            {t("continue_to_contact_btn", lang)}
          </button>
        </>
      )}
    </div>
  );
}
