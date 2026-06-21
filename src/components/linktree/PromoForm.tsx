"use client";

import { useState } from "react";

interface Props {
  slug: string;
  bannerText: string;
}

type Screen = "form" | "success";

export default function PromoForm({ slug, bannerText }: Props) {
  const [screen, setScreen] = useState<Screen>("form");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentError, setShowConsentError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setShowConsentError(true);
      return;
    }
    setShowConsentError(false);
    if (!phone) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/promo/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, email: email || null, agreed, slug }),
    });

    setLoading(false);

    if (res.status === 409) {
      setError("Ten numer telefonu już odebrał tę promocję.");
      return;
    }
    if (!res.ok) {
      setError("Coś poszło nie tak. Spróbuj ponownie.");
      return;
    }

    setScreen("success");
  }

  if (screen === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-green-800 font-medium">Link do promocji został wysłany SMS-em!</p>
        <p className="text-green-700 text-sm mt-1">Sprawdź swoją skrzynkę wiadomości.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {bannerText && (
        <p className="text-sm text-gray-700 font-medium">{bannerText}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="tel"
          placeholder="+48 600 000 000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 bg-white placeholder-gray-400 w-full"
        />
        <input
          type="email"
          placeholder="Email (opcjonalnie)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 bg-white placeholder-gray-400 w-full"
        />
        <div>
          <label className={`flex items-start gap-2 text-sm cursor-pointer ${showConsentError ? "text-red-500" : "text-gray-600"}`}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setShowConsentError(false);
              }}
              className="mt-0.5 shrink-0 accent-gray-800"
            />
            Zgadzam się na przetwarzanie danych osobowych w celach marketingowych.
          </label>
          {showConsentError && (
            <p className="text-red-500 text-xs mt-1">To pole jest wymagane.</p>
          )}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !phone}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Wysyłam..." : "Odbierz promocję"}
        </button>
      </form>
    </div>
  );
}
