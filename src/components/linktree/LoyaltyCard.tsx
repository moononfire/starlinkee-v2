"use client";

import { useState } from "react";
import { t } from "@/lib/translations";

interface Props {
  slug: string;
  scanToken?: string;
  initialStamps: number | null;
  isAuthenticated: boolean;
  maxStamps: number;
  lang: string;
}

type Screen = "phone" | "otp" | "card";

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function LoyaltyCard({ slug, scanToken, initialStamps, isAuthenticated, maxStamps, lang }: Props) {
  const [screen, setScreen] = useState<Screen>(isAuthenticated ? "card" : "phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stamps, setStamps] = useState(initialStamps ?? 0);
  const [rewardReady, setRewardReady] = useState((initialStamps ?? 0) >= maxStamps);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [claimed, setClaimed] = useState(false);

  async function requestOtp() {
    if (!phone) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/loyalty/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, slug }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("otp_failed", lang));
      return;
    }
    setScreen("otp");
  }

  async function verifyOtp() {
    if (!code) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/loyalty/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, slug }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t("invalid_code", lang));
      return;
    }
    const data = await res.json();
    setStamps(data.stamps ?? 0);
    setRewardReady(data.reward_ready ?? false);
    setScreen("card");
  }

  async function collectStamp() {
    setLoading(true);
    setError(null);
    setCooldownSeconds(null);
    const res = await fetch("/api/loyalty/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanToken }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.status === 429 && data.error === "cooldown") {
      setCooldownSeconds(data.remaining_seconds);
      return;
    }
    if (res.status === 403 && data.error === "scan_required") {
      setError(t("loyalty_rescan_required", lang));
      return;
    }
    if (!res.ok) {
      setError(data.error ?? t("error_try_again", lang));
      return;
    }
    setStamps(data.stamps);
    setRewardReady(data.reward_ready);
  }

  async function claimReward() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/loyalty/claim", { method: "POST" });
    setLoading(false);
    if (!res.ok) return;
    setClaimed(true);
    setStamps(0);
    setRewardReady(false);
  }

  const MAX = maxStamps;

  if (screen === "phone") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">{t("loyalty_phone_prompt", lang)}</p>
        <input
          type="tel"
          placeholder="+48 600 000 000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full text-black bg-white placeholder-gray-500"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={requestOtp}
          disabled={loading || !phone}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? t("sending", lang) : t("send_sms_code", lang)}
        </button>
      </div>
    );
  }

  if (screen === "otp") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">{t("otp_prompt", lang).replace("{phone}", phone)}</p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="1234"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full tracking-widest text-center text-lg text-black bg-white placeholder-gray-500"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={verifyOtp}
          disabled={loading || code.length < 4}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? t("verifying", lang) : t("confirm", lang)}
        </button>
        <button
          onClick={() => setScreen("phone")}
          className="text-sm text-gray-500 underline"
        >
          {t("change_number", lang)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {claimed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          {t("reward_claimed", lang)}
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: MAX }, (_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-full border-2 flex items-center justify-center text-lg transition-colors ${
              i < stamps
                ? "bg-black border-black text-white"
                : "border-gray-300 text-transparent"
            }`}
          >
            ★
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600 text-center">
        {stamps} / {MAX} {t("stamps_label", lang)}
      </p>

      {rewardReady ? (
        <button
          onClick={claimReward}
          disabled={loading}
          className="bg-green-600 text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50"
        >
          {loading ? t("processing", lang) : `${t("claim_reward", lang)} 🎁`}
        </button>
      ) : (
        <button
          onClick={collectStamp}
          disabled={loading || !!cooldownSeconds}
          className="bg-black text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50"
        >
          {loading ? t("collecting", lang) : t("collect_stamp", lang)}
        </button>
      )}

      {cooldownSeconds && (
        <p className="text-sm text-amber-600 text-center">
          {t("next_stamp_available", lang).replace("{time}", formatRemaining(cooldownSeconds))}
        </p>
      )}

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
