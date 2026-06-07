"use client";

import { useState } from "react";

interface Props {
  token: string;
  isUsed: boolean;
  bannerText: string;
}

export default function ClaimClient({ token, isUsed: initialIsUsed, bannerText }: Props) {
  const [isUsed, setIsUsed] = useState(initialIsUsed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/promo/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLoading(false);

    if (res.status === 409) {
      setIsUsed(true);
      return;
    }
    if (!res.ok) {
      setError("Coś poszło nie tak. Spróbuj ponownie.");
      return;
    }
    setIsUsed(true);
  }

  if (isUsed) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-500 text-sm font-medium">Ten kupon został już wykorzystany.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 text-center">
        <p className="text-amber-900 font-semibold text-lg">{bannerText || "Twoja promocja"}</p>
        <p className="text-amber-700 text-sm mt-2">Pokaż ten ekran obsłudze, żeby aktywować kupon.</p>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button
        onClick={handleActivate}
        disabled={loading}
        className="bg-black text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50"
      >
        {loading ? "Aktywuję..." : "Aktywuj kupon"}
      </button>
    </div>
  );
}
