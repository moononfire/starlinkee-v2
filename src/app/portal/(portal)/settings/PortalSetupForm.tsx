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
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
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

interface Props {
  subscriptionId: number;
  lang: string;
}

export default function PortalSetupForm({ subscriptionId, lang }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const res = await fetch(
      `/api/google/place-details?place_id=${encodeURIComponent(prediction.place_id)}`
    );
    setLoadingPlace(false);
    if (!res.ok) {
      setError(t("portal_setup_error_place", lang));
      return;
    }
    const details: PlaceDetails = await res.json();
    setSelectedPlace(details);
    setSearchQuery(details.name);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedPlace) {
      setError(t("portal_setup_select_place", lang));
      return;
    }

    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    form.set("subscription_id", String(subscriptionId));
    form.set("google_business_name", selectedPlace.name);
    form.set("google_business_address", selectedPlace.address);
    form.set("google_review_link", selectedPlace.google_review_link);
    form.set("google_places_id", selectedPlace.place_id);

    const rawLogo = form.get("logo") as File | null;
    if (rawLogo && rawLogo.size > 0) {
      try {
        const compressed = await compressImage(rawLogo);
        form.set("logo", compressed, "logo.jpg");
      } catch {
        // compression failed — upload original
      }
    }

    const res = await fetch("/api/portal/setup", { method: "POST", body: form });
    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? t("portal_setup_generic_error", lang));
      return;
    }

    router.refresh();
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4">
          <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
            {t("portal_setup_badge", lang)}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("portal_setup_intro", lang)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("portal_setup_location_name_label", lang)}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("portal_setup_location_name_desc", lang)}
          </p>
          <input
            name="location_name"
            required
            type="text"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div ref={dropdownRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("portal_setup_google_maps_label", lang)}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("portal_setup_google_maps_desc", lang)}
          </p>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => predictions.length > 0 && setShowDropdown(true)}
            placeholder={t("portal_setup_search_placeholder", lang)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />

          {showDropdown && predictions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
              {predictions.map((p) => (
                <li key={p.place_id}>
                  <button
                    type="button"
                    onClick={() => handleSelectPlace(p)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {p.description}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {loadingPlace && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("portal_setup_loading_place", lang)}
          </p>
        )}

        {selectedPlace && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-sm">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPlace.name}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5">{selectedPlace.address}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("portal_setup_support_email_label", lang)}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("portal_setup_support_email_desc", lang)}
          </p>
          <input
            name="support_email"
            required
            type="email"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("portal_setup_logo_label", lang)}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("portal_setup_logo_desc", lang)}
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
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t("portal_choose_file", lang)}
            </button>
            {logoFileName ? (
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {logoFileName}
              </span>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500">{t("portal_no_file", lang)}</span>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !selectedPlace}
          className="w-full py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300 text-white dark:text-gray-900"
        >
          {loading ? t("portal_activating", lang) : t("portal_activate_subscription", lang)}
        </button>
      </form>
    </div>
  );
}
