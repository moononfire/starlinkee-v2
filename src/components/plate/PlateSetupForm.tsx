"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/translations";

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(new File([blob], "logo.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

interface Props {
  plateNumber: string;
  plateSecret: string;
  lang: string;
}

interface Prediction {
  place_id: string;
  description: string;
}

interface PlaceDetails {
  name: string;
  address: string;
  google_review_link: string;
  place_id: string;
}

const LANGUAGES = [
  { code: "pl", label: "PL" },
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
] as const;

export default function PlateSetupForm({ plateNumber, plateSecret, lang }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState(lang);

  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setSelectedPlace(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/google/autocomplete?input=${encodeURIComponent(value)}`);
      if (!res.ok) return;
      const data = await res.json();
      setPredictions(data.predictions ?? []);
      setShowDropdown(true);
    }, 300);
  }

  async function handleSelectPlace(prediction: Prediction) {
    setShowDropdown(false);
    setSearchQuery(prediction.description);
    setLoadingPlace(true);

    const res = await fetch(`/api/google/place-details?place_id=${encodeURIComponent(prediction.place_id)}`);
    setLoadingPlace(false);

    if (!res.ok) {
      setError("Failed to load business details");
      return;
    }

    const details: PlaceDetails = await res.json();
    setSelectedPlace(details);
    setSearchQuery(details.name);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedPlace) {
      setError(t("setup_form_google_search", currentLang));
      return;
    }

    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    form.append("plateNumber", plateNumber);
    form.append("plateSecret", plateSecret);
    form.append("google_business_name", selectedPlace.name);
    form.append("google_business_address", selectedPlace.address);
    form.append("google_review_link", selectedPlace.google_review_link);
    form.append("google_places_id", selectedPlace.place_id);

    const rawLogo = form.get("logo") as File | null;
    if (rawLogo && rawLogo.size > 0) {
      try {
        const compressed = await compressImage(rawLogo);
        form.set("logo", compressed, "logo.jpg");
      } catch {
        // compression failed — upload original
      }
    }

    const res = await fetch("/api/plate/setup", {
      method: "POST",
      body: form,
    });

    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Something went wrong");
      return;
    }

    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6"
      style={{ backgroundColor: "#f9fafb", color: "#111827" }}>
      <div className="flex justify-end w-full max-w-md mb-3">
        <div className="flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setCurrentLang(l.code)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                currentLang === l.code
                  ? { backgroundColor: "#1f2937", color: "#ffffff" }
                  : { backgroundColor: "#ffffff", color: "#374151", border: "1px solid #d1d5db" }
              }
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md w-full">
        <div className="rounded-2xl shadow-sm p-8" style={{ backgroundColor: "#ffffff" }}>
          <h1 className="text-xl font-semibold mb-6" style={{ color: "#1f2937" }}>
            {t("setup_form_title", currentLang)}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-base font-semibold mb-0.5" style={{ color: "#111827" }}>
                {t("setup_form_business_name", currentLang)} *
              </label>
              <p className="text-xs mb-2" style={{ color: "#6b7280" }}>
                {t("setup_form_business_name_hint", currentLang)}
              </p>
              <input
                name="location_name"
                required
                type="text"
                className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                style={{ border: "1px solid #d1d5db", color: "#111827", backgroundColor: "#ffffff" }}
              />
            </div>

            <div ref={dropdownRef} className="relative">
              <label className="block text-base font-semibold mb-0.5" style={{ color: "#111827" }}>
                {t("setup_form_google_search", currentLang)} *
              </label>
              <p className="text-xs mb-2" style={{ color: "#6b7280" }}>
                {t("setup_form_google_search_hint", currentLang)}
              </p>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                style={{ border: "1px solid #d1d5db", color: "#111827", backgroundColor: "#ffffff" }}
                autoComplete="off"
              />

              {showDropdown && predictions.length > 0 && (
                <ul
                  className="absolute z-10 w-full mt-1 rounded-lg shadow-lg overflow-hidden"
                  style={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db" }}
                >
                  {predictions.map((p) => (
                    <li key={p.place_id}>
                      <button
                        type="button"
                        onClick={() => handleSelectPlace(p)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                        style={{ color: "#374151" }}
                      >
                        {p.description}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {loadingPlace && (
              <p className="text-sm" style={{ color: "#6b7280" }}>Loading business details...</p>
            )}

            {selectedPlace && (
              <div className="rounded-lg p-4" style={{ backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "#6b7280" }}>
                  {t("setup_form_google_selected", currentLang)}
                </p>
                <p className="text-sm font-semibold" style={{ color: "#1f2937" }}>
                  {selectedPlace.name}
                </p>
                <p className="text-sm mt-1" style={{ color: "#4b5563" }}>
                  {selectedPlace.address}
                </p>
                <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
                  <iframe
                    title="Map"
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedPlace.name + ", " + selectedPlace.address)}&output=embed&z=15`}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-base font-semibold mb-0.5" style={{ color: "#111827" }}>
                {t("setup_form_support_email", currentLang)} *
              </label>
              <p className="text-xs mb-2" style={{ color: "#6b7280" }}>
                {t("setup_form_support_email_hint", currentLang)}
              </p>
              <input
                name="support_email"
                required
                type="email"
                className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                style={{ border: "1px solid #d1d5db", color: "#111827", backgroundColor: "#ffffff" }}
              />
            </div>

            <div>
              <label className="block text-base font-semibold mb-0.5" style={{ color: "#111827" }}>
                {t("setup_form_logo", currentLang)}
              </label>
              <p className="text-xs mb-2" style={{ color: "#6b7280" }}>
                {t("setup_form_logo_hint", currentLang)}
              </p>
              <input
                ref={fileInputRef}
                name="logo"
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => setLogoFileName(e.target.files?.[0]?.name ?? null)}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}
                >
                  {t("setup_form_choose_file", currentLang)}
                </button>
                {logoFileName ? (
                  <span className="text-sm truncate" style={{ color: "#374151" }}>{logoFileName}</span>
                ) : (
                  <span className="text-sm" style={{ color: "#9ca3af" }}>{t("setup_form_no_file", currentLang)}</span>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !selectedPlace}
              className="w-full py-3 rounded-lg font-medium disabled:opacity-50 transition-colors mt-2"
              style={{ backgroundColor: "#1f2937", color: "#ffffff" }}
            >
              {loading ? t("setup_form_submitting", currentLang) : t("setup_form_submit", currentLang)}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
