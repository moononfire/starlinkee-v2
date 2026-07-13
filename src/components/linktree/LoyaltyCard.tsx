"use client";

import { useState, useEffect, useRef } from "react";
import { t } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";

interface Props {
  slug: string;
  locationId: number;
  scanToken?: string;
  initialStamps: number | null;
  isAuthenticated: boolean;
  maxStamps: number;
  lang: string;
}

type Screen = "signin" | "card";

const ANDROID_PACKAGE = "com.starlinkee.app";
// TODO: switch to the Play Store listing once the app is published there —
// https://play.google.com/store/apps/details?id=com.starlinkee.app
const APP_FALLBACK_URL = "https://starlinkee.com/pl/pobierz-aplikacje";

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Android-only: launches the native app via its custom scheme if installed,
// otherwise Chrome falls back to APP_FALLBACK_URL automatically.
function buildAndroidAppLink(slug: string, scanToken: string | undefined, maxStamps: number): string {
  const params = new URLSearchParams({ maxStamps: String(maxStamps) });
  if (scanToken) params.set("scanToken", scanToken);
  return (
    `intent://loyalty/${slug}?${params.toString()}` +
    `#Intent;scheme=starlinkee;package=${ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(APP_FALLBACK_URL)};end`
  );
}

function OpenInAppButton({ slug, scanToken, maxStamps, lang }: { slug: string; scanToken?: string; maxStamps: number; lang: string }) {
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  if (!isAndroid) return null;

  return (
    <a
      href={buildAndroidAppLink(slug, scanToken, maxStamps)}
      className="block text-center border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700"
    >
      {t("open_in_app_button", lang)}
    </a>
  );
}

export default function LoyaltyCard({ slug, locationId, scanToken, initialStamps, isAuthenticated, maxStamps, lang }: Props) {
  const [screen, setScreen] = useState<Screen>(isAuthenticated ? "card" : "signin");
  const [stamps, setStamps] = useState(initialStamps ?? 0);
  const [rewardReady, setRewardReady] = useState((initialStamps ?? 0) >= maxStamps);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [claimed, setClaimed] = useState(false);
  const collectedRef = useRef(false);

  // A valid scanToken means we just arrived here from a real physical NFC
  // tap (via sign-in redirect or an already-logged-in repeat visit) — collect
  // the stamp immediately, no extra "confirm" click needed.
  useEffect(() => {
    if (screen !== "card" || !scanToken || collectedRef.current) return;
    collectedRef.current = true;
    collectStamp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, scanToken]);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ slug, locationId: String(locationId) });
    if (scanToken) params.set("scanToken", scanToken);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/l/${slug}/loyalty/auth/callback?${params.toString()}`,
      },
    });
    if (signInError || !data.url) {
      setLoading(false);
      setError(t("error_try_again", lang));
      return;
    }
    window.location.href = data.url;
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

  if (screen === "signin") {
    return (
      <div className="flex flex-col gap-4">
        <OpenInAppButton slug={slug} scanToken={scanToken} maxStamps={maxStamps} lang={lang} />
        <p className="text-sm text-gray-600">{t("loyalty_google_prompt", lang)}</p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? t("sending", lang) : t("sign_in_with_google", lang)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OpenInAppButton slug={slug} scanToken={scanToken} maxStamps={maxStamps} lang={lang} />

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

      {rewardReady && (
        <button
          onClick={claimReward}
          disabled={loading}
          className="bg-green-600 text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50"
        >
          {loading ? t("processing", lang) : `${t("claim_reward", lang)} 🎁`}
        </button>
      )}

      {loading && !rewardReady && (
        <p className="text-sm text-gray-500 text-center">{t("collecting", lang)}</p>
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
