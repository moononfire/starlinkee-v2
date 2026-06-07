"use client";

import { useState } from "react";
import FeedbackForm from "./FeedbackForm";

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

  async function handleRate(rating: number) {
    if (submitted || loading) return;
    setLoading(true);
    setSelected(rating);

    const res = await fetch("/api/plate/rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId, rating }),
    });

    setLoading(false);
    setSubmitted(true);

    if (!res.ok) return;
    const { redirectToGoogle } = await res.json();

    if (redirectToGoogle && googleReviewLink) {
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
    </div>
  );
}
