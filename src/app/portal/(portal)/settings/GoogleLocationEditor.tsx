"use client";

import { useState, useRef, useEffect } from "react";
import { updateGoogleLocation } from "./actions";
import { t } from "@/lib/translations";

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
  locationId: number;
  locationName: string;
  currentBusinessName: string | null;
  currentBusinessAddress: string | null;
  saved?: boolean;
  lang: string;
}

export default function GoogleLocationEditor({
  locationId,
  locationName,
  currentBusinessName,
  currentBusinessAddress,
  saved,
  lang,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [pending, setPending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

    if (!res.ok) return;

    const details: PlaceDetails = await res.json();
    setSelectedPlace(details);
    setSearchQuery(details.name);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPlace) return;
    setPending(true);
    const formData = new FormData();
    formData.set("location_id", String(locationId));
    formData.set("google_business_name", selectedPlace.name);
    formData.set("google_business_address", selectedPlace.address);
    formData.set("google_review_link", selectedPlace.google_review_link);
    formData.set("google_places_id", selectedPlace.place_id);
    await updateGoogleLocation(formData);
    setPending(false);
    setEditing(false);
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{locationName}</p>

      {!editing ? (
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {currentBusinessName ? (
              <>
                <p className="font-medium text-gray-900 dark:text-gray-100">{currentBusinessName}</p>
                {currentBusinessAddress && (
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">{currentBusinessAddress}</p>
                )}
              </>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">{t("portal_no_location_configured", lang)}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {t("portal_saved_toast", lang)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            >
              {t("portal_change", lang)}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("portal_search_google_maps_label", lang)}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => predictions.length > 0 && setShowDropdown(true)}
              placeholder={t("portal_search_placeholder_short", lang)}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("portal_loading_data", lang)}</p>
          )}

          {selectedPlace && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-3 text-sm">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPlace.name}</p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">{selectedPlace.address}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!selectedPlace || pending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {pending ? t("portal_saving", lang) : t("portal_save", lang)}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setSearchQuery(""); setSelectedPlace(null); setPredictions([]); }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            >
              {t("portal_cancel", lang)}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
