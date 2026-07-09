"use client";

import { useState } from "react";
import { t } from "@/lib/translations";

interface Props {
  slug: string;
  bannerText: string;
  scanToken?: string;
  lang: string;
}

type Screen = "form" | "success";

export default function PromoForm({ slug, bannerText, scanToken, lang }: Props) {
  const [screen, setScreen] = useState<Screen>("form");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentError, setShowConsentError] = useState(false);

  if (!scanToken) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-600 text-sm font-medium">
          {t("scan_nfc_for_promo", lang)}
        </p>
      </div>
    );
  }

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
      body: JSON.stringify({ phone, email: email || null, agreed, slug, scanToken, lang }),
    });

    setLoading(false);

    if (res.status === 409) {
      setError(t("phone_already_claimed", lang));
      return;
    }
    if (res.status === 403) {
      setError(t("link_expired", lang));
      return;
    }
    if (!res.ok) {
      setError(t("something_went_wrong", lang));
      return;
    }

    setScreen("success");
  }

  if (screen === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-green-800 font-medium">{t("promo_sent_sms", lang)}</p>
        <p className="text-green-700 text-sm mt-1">{t("check_messages", lang)}</p>
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
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-black bg-white placeholder-gray-500 w-full"
        />
        <input
          type="email"
          placeholder={t("email_optional_placeholder", lang)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-black bg-white placeholder-gray-500 w-full"
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
            {t("consent_text", lang)}
          </label>
          {showConsentError && (
            <p className="text-red-500 text-xs mt-1">{t("consent_required", lang)}</p>
          )}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !phone}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? t("sending", lang) : t("collect_promo_btn", lang)}
        </button>
      </form>
    </div>
  );
}
