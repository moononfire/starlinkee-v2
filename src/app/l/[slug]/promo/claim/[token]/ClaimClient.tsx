"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "react-qr-code";
import { t } from "@/lib/translations";

const CLAIM_WINDOW_SECONDS = 15 * 60;

interface Props {
  token: string;
  isUsed: boolean;
  bannerText: string;
  couponCode: string;
  claimedAt: string | null;
  lang: string;
}

function secondsLeft(claimedAt: string | null): number {
  if (!claimedAt) return 0;
  const elapsed = (Date.now() - new Date(claimedAt).getTime()) / 1000;
  return Math.max(0, Math.round(CLAIM_WINDOW_SECONDS - elapsed));
}

export default function ClaimClient({ token, isUsed, bannerText, couponCode, claimedAt: initialClaimedAt, lang }: Props) {
  const [claimedAt, setClaimedAt] = useState(initialClaimedAt);
  const [remaining, setRemaining] = useState(() => secondsLeft(initialClaimedAt));
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?code=${couponCode}`;

  useEffect(() => {
    if (!claimedAt) return;
    const interval = setInterval(() => setRemaining(secondsLeft(claimedAt)), 1000);
    return () => clearInterval(interval);
  }, [claimedAt]);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    setError(null);

    const res = await fetch("/api/promo/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    setClaiming(false);

    if (!res.ok) {
      setError(t("something_went_wrong", lang));
      return;
    }

    const data: { claimedAt: string } = await res.json();
    setClaimedAt(data.claimedAt);
    setRemaining(secondsLeft(data.claimedAt));
  }, [token, lang]);

  if (isUsed) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-500 text-sm font-medium">{t("coupon_already_used", lang)}</p>
      </div>
    );
  }

  const isActive = remaining > 0;

  if (!isActive) {
    return (
      <div className="flex flex-col gap-4 items-center">
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 text-center w-full">
          <p className="text-amber-900 font-semibold text-lg">{bannerText || t("your_promo", lang)}</p>
        </div>

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="bg-black text-white rounded-lg px-6 py-3 font-medium disabled:opacity-50 w-full"
        >
          {claiming ? t("processing", lang) : t("claim_code_btn", lang)}
        </button>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    );
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 text-center">
        <p className="text-amber-900 font-semibold text-lg">{bannerText || t("your_promo", lang)}</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t("coupon_code_label", lang)}</p>
        <p className="text-3xl font-mono font-bold tracking-widest text-gray-900">{couponCode}</p>

        <div className="bg-white p-3 rounded-xl border border-gray-100">
          <QRCode value={verifyUrl} size={180} />
        </div>

        <div className="bg-gray-900 text-white rounded-full px-4 py-1.5 text-sm font-mono font-semibold tabular-nums">
          {timeLabel}
        </div>
      </div>

      <p className="text-sm text-gray-600 text-center">
        {t("show_to_staff", lang)}
      </p>
    </div>
  );
}
