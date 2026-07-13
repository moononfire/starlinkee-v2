"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import type { Plate } from "@/lib/types";

interface Prediction {
  place_id: string;
  description: string;
}

interface PlaceDetails {
  name: string;
  address: string;
  website: string;
  google_review_link: string;
  place_id: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Pads the source image into a white square so a circular crop never clips it.
async function addWhitePadding(dataUrl: string, paddingPercent: number): Promise<string> {
  const img = await loadImage(dataUrl);
  const maxDim = Math.max(img.width, img.height);
  const pad = maxDim * (paddingPercent / 100);
  const size = maxDim + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, (size - img.width) / 2, (size - img.height) / 2);

  return canvas.toDataURL("image/png");
}

async function cropImage(imageSrc: string, crop: Area, round: boolean): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const MAX = 400;
  const scale = Math.min(1, MAX / Math.max(crop.width, crop.height));
  const outW = Math.round(crop.width * scale);
  const outH = Math.round(crop.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);

  if (round) {
    ctx.beginPath();
    ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.9
    );
  });
}

export default function QuickActivateForm({ plates }: { plates: Plate[] }) {
  const router = useRouter();
  const [plateId, setPlateId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ plateNumber: string; googleReviewLink: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Logo cropping
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [naturalAspect, setNaturalAspect] = useState(1);
  const [roundLogo, setRoundLogo] = useState(true);
  const [paddedImageSrc, setPaddedImageSrc] = useState<string | null>(null);
  const [padding, setPadding] = useState(10);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savedLogoIsRound, setSavedLogoIsRound] = useState(true);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // White padding is only relevant for the circular crop (avoids clipping corners).
  useEffect(() => {
    if (!rawImageSrc || !roundLogo) return;
    let cancelled = false;
    addWhitePadding(rawImageSrc, padding).then((padded) => {
      if (!cancelled) setPaddedImageSrc(padded);
    });
    return () => {
      cancelled = true;
    };
  }, [rawImageSrc, padding, roundLogo]);

  useEffect(() => {
    if (!rawImageSrc) return;
    let cancelled = false;
    loadImage(rawImageSrc).then((img) => {
      if (!cancelled) setNaturalAspect(img.width / img.height);
    });
    return () => {
      cancelled = true;
    };
  }, [rawImageSrc]);

  const cropperImageSrc = roundLogo ? paddedImageSrc : rawImageSrc;

  function handleToggleRound(round: boolean) {
    setRoundLogo(round);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

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
      setError("Nie udało się pobrać danych firmy z Google");
      return;
    }

    const details: PlaceDetails = await res.json();
    setSelectedPlace(details);
    setSearchQuery(details.name);
  }

  function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setPaddedImageSrc(null);
      setPadding(10);
      setRoundLogo(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setLogoBlob(null);
      setLogoPreview(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCancelCrop() {
    setRawImageSrc(null);
    setPaddedImageSrc(null);
    setCroppedAreaPixels(null);
  }

  async function handleConfirmCrop() {
    if (!cropperImageSrc || !croppedAreaPixels) return;
    const blob = await cropImage(cropperImageSrc, croppedAreaPixels, roundLogo);
    setLogoBlob(blob);
    setLogoPreview(URL.createObjectURL(blob));
    setSavedLogoIsRound(roundLogo);
    setRawImageSrc(null);
    setPaddedImageSrc(null);
    setCroppedAreaPixels(null);
  }

  function handleRemoveLogo() {
    setLogoBlob(null);
    setLogoPreview(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!plateId) {
      setError("Wybierz płytkę");
      return;
    }
    if (!selectedPlace) {
      setError("Wyszukaj i wybierz firmę w Google Places");
      return;
    }
    if (!email) {
      setError("Podaj adres e-mail klienta");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("plate_id", plateId);
      form.append("business_name", selectedPlace.name);
      form.append("business_address", selectedPlace.address);
      form.append("google_review_link", selectedPlace.google_review_link);
      form.append("google_places_id", selectedPlace.place_id);
      form.append("email", email);
      if (logoBlob) {
        form.append("logo", logoBlob, "logo.jpg");
        form.append("logo_is_round", String(savedLogoIsRound));
      }

      const res = await fetch("/api/admin/plates/quick-activate", {
        method: "POST",
        body: form,
      });
      const rawText = await res.text();
      let data: { error?: string; plateNumber?: string; googleReviewLink?: string } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        setError(`Serwer zwrócił nieoczekiwaną odpowiedź (status ${res.status})`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Coś poszło nie tak");
        return;
      }
      setSuccess({ plateNumber: data.plateNumber ?? "", googleReviewLink: data.googleReviewLink ?? "" });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-6 max-w-lg">
        <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
          Płytka {success.plateNumber} aktywowana.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Dane logowania do portalu zostały wysłane na e-mail administratora. Płytka po zeskanowaniu przekieruje
          bezpośrednio na:{" "}
          <a href={success.googleReviewLink} target="_blank" rel="noopener" className="text-blue-600 underline">
            opinię Google
          </a>
          .
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/admin/plates")}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Wróć do płytek
          </button>
          <button
            onClick={() => router.refresh()}
            className="px-5 py-2 rounded text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Aktywuj kolejną
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-6 max-w-lg">
      {plates.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">Brak dostępnych płytek (wszystkie przypisane)</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Płytka *</label>
          <select
            value={plateId}
            onChange={(e) => setPlateId(e.target.value)}
            required
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          >
            <option value="">— wybierz płytkę —</option>
            {plates.map((p) => (
              <option key={p.plate_id} value={p.plate_id}>
                {p.plate_number} ({p.plate_language})
              </option>
            ))}
          </select>
        </div>

        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Firma (Google Places) *
          </label>
          <input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Wyszukaj nazwę firmy..."
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loadingPlace && <p className="text-xs text-gray-400 mt-1">Ładowanie danych firmy...</p>}
          {showDropdown && predictions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg mt-1 max-h-56 overflow-auto">
              {predictions.map((p) => (
                <li
                  key={p.place_id}
                  onClick={() => handleSelectPlace(p)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
                >
                  {p.description}
                </li>
              ))}
            </ul>
          )}
          {selectedPlace && (
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPlace.address}</p>
              {selectedPlace.website ? (
                <a
                  href={selectedPlace.website}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-blue-600 underline break-all"
                >
                  {selectedPlace.website}
                </a>
              ) : (
                <p className="text-xs text-gray-400 italic">Brak strony internetowej w profilu Google</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo</label>

          {rawImageSrc && cropperImageSrc && (
            <div className="mb-3">
              <label className="flex items-center gap-2 mb-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={roundLogo}
                  onChange={(e) => handleToggleRound(e.target.checked)}
                  className="accent-blue-600"
                />
                Zrób logo w kółku
              </label>

              <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
                <Cropper
                  image={cropperImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={roundLogo ? 1 : naturalAspect}
                  cropShape={roundLogo ? "round" : "rect"}
                  showGrid={!roundLogo}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-20">Powiększenie</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
              </div>
              {roundLogo && (
                <>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-20">Białe pole</span>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={padding}
                      onChange={(e) => setPadding(Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-xs text-gray-400 w-8 text-right">{padding}%</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Dodaj biały margines dookoła zdjęcia, żeby przy wycinaniu w koło nic ważnego się nie ucięło.
                  </p>
                </>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmCrop}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Zatwierdź kadrowanie
                </button>
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}

          {!rawImageSrc && (
            <div className="flex items-center gap-3">
              {logoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Logo"
                  className={
                    savedLogoIsRound
                      ? "h-14 w-14 object-cover rounded-full border border-gray-200 dark:border-gray-700"
                      : "max-h-14 w-auto object-contain rounded border border-gray-200 dark:border-gray-700"
                  }
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {logoPreview ? "Zmień logo" : "Dodaj logo"}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  Usuń
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            E-mail klienta *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
            placeholder="np. adres znaleziony na stronie firmy"
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={plates.length === 0 || loading}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Aktywowanie..." : "Aktywuj płytkę (33 dni)"}
          </button>
          <a
            href="/admin/plates"
            className="px-5 py-2 rounded text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Anuluj
          </a>
        </div>
      </form>
    </div>
  );
}
