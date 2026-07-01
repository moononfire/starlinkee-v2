"use client";

import { useState, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";

interface Props {
  locationId: number;
  locationName: string;
  currentLogoLink: string | null;
}

async function cropImage(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const outputSize = Math.min(crop.width, crop.height, 400);
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);

  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.85
    );
  });
}

export default function LogoUpload({ locationId, locationName, currentLogoLink }: Props) {
  const [logoLink, setLogoLink] = useState(currentLogoLink);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCancelCrop() {
    setImageSrc(null);
    setCroppedAreaPixels(null);
  }

  async function handleConfirmCrop() {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setError(null);

    try {
      const blob = await cropImage(imageSrc, croppedAreaPixels);
      const file = new File([blob], "logo.jpg", { type: "image/jpeg" });

      const form = new FormData();
      form.append("location_id", String(locationId));
      form.append("logo", file);

      const res = await fetch("/api/portal/logo", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Nie udało się przesłać logo");
      } else {
        setLogoLink(data.logo_link);
      }
    } catch {
      setError("Nie udało się przyciąć obrazka");
    } finally {
      setUploading(false);
      setImageSrc(null);
      setCroppedAreaPixels(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const res = await fetch("/api/portal/logo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_id: locationId }),
    });

    setDeleting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Nie udało się usunąć logo");
      return;
    }

    setLogoLink(null);
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">
        {locationName}
      </p>

      {imageSrc && (
        <div className="mb-4">
          <div className="relative w-full h-72 bg-gray-900 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Zoom</span>
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

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? "Przesyłanie..." : "Zapisz logo"}
            </button>
            <button
              type="button"
              onClick={handleCancelCrop}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {!imageSrc && (
        <>
          {logoLink ? (
            <div className="flex items-center gap-4 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoLink}
                alt={locationName}
                className="h-16 w-16 object-cover rounded-full border border-gray-200 dark:border-gray-700"
              />
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
              >
                {deleting ? "Usuwanie..." : "Usuń logo"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Brak logo
            </p>
          )}

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {logoLink ? "Zmień logo" : "Dodaj logo"}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              PNG lub JPEG, max 5 MB
            </span>
          </div>
        </>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
