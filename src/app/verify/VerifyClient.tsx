"use client";

import { useState, useEffect } from "react";
import { t } from "@/lib/translations";

interface VerifyResult {
  valid: boolean;
  locationName: string;
  promoText: string;
  isUsed: boolean;
  usedAt: string | null;
}

interface Props {
  initialCode: string;
  lang: string;
}

export default function VerifyClient({ initialCode, lang }: Props) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) {
      handleVerify(initialCode.toUpperCase());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVerify(codeToCheck?: string) {
    const c = codeToCheck ?? code;
    if (!c) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError(null);

    const res = await fetch("/api/promo/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c }),
    });

    setLoading(false);

    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (!res.ok) {
      setError(t("something_went_wrong", lang));
      return;
    }

    const data: VerifyResult = await res.json();
    setResult(data);
  }

  async function handleActivate() {
    setActivating(true);
    setError(null);

    const res = await fetch("/api/promo/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    setActivating(false);

    if (res.status === 409) {
      setResult((prev) => (prev ? { ...prev, isUsed: true, usedAt: new Date().toISOString() } : prev));
      return;
    }
    if (!res.ok) {
      setError(t("activate_failed", lang));
      return;
    }

    setResult((prev) => (prev ? { ...prev, isUsed: true, usedAt: new Date().toISOString() } : prev));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t("code_placeholder", lang)}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
          maxLength={8}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 bg-white placeholder-gray-400 w-full font-mono tracking-widest uppercase"
        />
        <button
          onClick={() => handleVerify()}
          disabled={loading || code.length < 8}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
        >
          {loading ? "..." : t("check_btn", lang)}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {notFound && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 text-sm font-medium">{t("invalid_coupon", lang)}</p>
        </div>
      )}

      {result && result.isUsed && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-600 text-sm font-medium">{t("coupon_used", lang)}</p>
          {result.usedAt && (
            <p className="text-gray-400 text-xs mt-1">
              {new Date(result.usedAt).toLocaleString(lang === "pl" ? "pl-PL" : lang === "de" ? "de-DE" : "en-GB")}
            </p>
          )}
        </div>
      )}

      {result && !result.isUsed && (
        <div className="flex flex-col gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-800 font-semibold text-lg">{result.locationName}</p>
            {result.promoText && (
              <p className="text-green-700 text-sm mt-2">{result.promoText}</p>
            )}
            <p className="text-green-600 text-xs mt-3 font-medium">{t("coupon_valid", lang)}</p>
          </div>

          <button
            onClick={handleActivate}
            disabled={activating}
            className="bg-black text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50"
          >
            {activating ? t("processing", lang) : t("mark_as_used", lang)}
          </button>
        </div>
      )}
    </div>
  );
}
