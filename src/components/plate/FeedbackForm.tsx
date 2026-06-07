"use client";

import { useState } from "react";

interface Props {
  scanId: string;
  lang: string;
}

export default function FeedbackForm({ scanId, lang }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    await fetch("/api/review/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scanId,
        feedback_message: form.get("feedback_message"),
        user_name: form.get("user_name") || undefined,
        contact_email: form.get("contact_email") || undefined,
        contact_phone: form.get("contact_phone") || undefined,
      }),
    });

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Thank you!</p>
        <p className="text-gray-500 mt-1">We appreciate your feedback.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      <p className="text-gray-600 text-sm text-center">
        We&apos;re sorry to hear that. Please share your feedback.
      </p>

      <textarea
        name="feedback_message"
        required
        rows={4}
        placeholder="Your message..."
        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <input
        name="user_name"
        type="text"
        placeholder="Your name (optional)"
        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <input
        name="contact_email"
        type="email"
        placeholder="Email (optional)"
        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <input
        name="contact_phone"
        type="tel"
        placeholder="Phone (optional)"
        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Sending..." : "Send feedback"}
      </button>
    </form>
  );
}
