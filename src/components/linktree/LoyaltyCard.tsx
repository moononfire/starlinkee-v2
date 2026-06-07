"use client";

import { useState } from "react";

interface Props {
  slug: string;
  initialStamps: number | null;
  isAuthenticated: boolean;
}

type Screen = "phone" | "otp" | "card";

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function LoyaltyCard({ slug, initialStamps, isAuthenticated }: Props) {
  const [screen, setScreen] = useState<Screen>(isAuthenticated ? "card" : "phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stamps, setStamps] = useState(initialStamps ?? 0);
  const [rewardReady, setRewardReady] = useState((initialStamps ?? 0) >= 10);
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
      setError("Nie udało się wysłać kodu. Spróbuj ponownie.");
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
      setError("Nieprawidłowy kod. Spróbuj ponownie.");
      return;
    }
    setScreen("card");
  }

  async function collectStamp() {
    setLoading(true);
    setError(null);
    setCooldownSeconds(null);
    const res = await fetch("/api/loyalty/collect", { method: "POST" });
    const data = await res.json();
    setLoading(false);

    if (res.status === 429 && data.error === "cooldown") {
      setCooldownSeconds(data.remaining_seconds);
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Błąd. Spróbuj ponownie.");
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

  const MAX = 10;

  if (screen === "phone") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">Podaj numer telefonu, żeby dołączyć do programu lojalnościowego.</p>
        <input
          type="tel"
          placeholder="+48 600 000 000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border rounded-lg px-4 py-2 text-sm w-full"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={requestOtp}
          disabled={loading || !phone}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Wysyłam..." : "Wyślij kod SMS"}
        </button>
      </div>
    );
  }

  if (screen === "otp") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">Wpisz 4-cyfrowy kod wysłany na {phone}.</p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="1234"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="border rounded-lg px-4 py-2 text-sm w-full tracking-widest text-center text-lg"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={verifyOtp}
          disabled={loading || code.length < 4}
          className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Weryfikuję..." : "Potwierdź"}
        </button>
        <button
          onClick={() => setScreen("phone")}
          className="text-sm text-gray-500 underline"
        >
          Zmień numer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {claimed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          Nagroda odebrana! Karta została zresetowana.
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
        {stamps} / {MAX} pieczątek
      </p>

      {rewardReady ? (
        <button
          onClick={claimReward}
          disabled={loading}
          className="bg-green-600 text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50"
        >
          {loading ? "Przetwarzam..." : "Odbierz nagrodę 🎁"}
        </button>
      ) : (
        <button
          onClick={collectStamp}
          disabled={loading || !!cooldownSeconds}
          className="bg-black text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50"
        >
          {loading ? "Zbieram..." : "Zbierz pieczątkę"}
        </button>
      )}

      {cooldownSeconds && (
        <p className="text-sm text-amber-600 text-center">
          Następna pieczątka dostępna za {formatRemaining(cooldownSeconds)}
        </p>
      )}

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
    </div>
  );
}
