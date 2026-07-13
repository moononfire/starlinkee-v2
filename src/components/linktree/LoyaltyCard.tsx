"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/translations";

interface Props {
  slug: string;
  scanToken?: string;
  maxStamps: number;
  lang: string;
}

const ANDROID_PACKAGE = "com.starlinkee.app";
// TODO: switch to the Play Store / App Store listing once the app is
// published there — https://play.google.com/store/apps/details?id=com.starlinkee.app
function appFallbackUrl(lang: string): string {
  return `https://starlinkee.com/${lang}/pobierz-aplikacje`;
}

// The loyalty card itself only lives in the mobile app now — one phone
// number verified by SMS OTP is the single source of truth for a card,
// which a web-only login (Google or otherwise) can't guarantee since a
// customer could always sign in with a fresh account. This page is just a
// bridge to the app.
function buildAndroidAppLink(slug: string, scanToken: string | undefined, maxStamps: number, lang: string): string {
  const params = new URLSearchParams({ maxStamps: String(maxStamps) });
  if (scanToken) params.set("scanToken", scanToken);
  return (
    `intent://loyalty/${slug}?${params.toString()}` +
    `#Intent;scheme=starlinkee;package=${ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(appFallbackUrl(lang))};end`
  );
}

function buildIosAppLink(slug: string, scanToken: string | undefined, maxStamps: number): string {
  const params = new URLSearchParams({ maxStamps: String(maxStamps) });
  if (scanToken) params.set("scanToken", scanToken);
  return `starlinkee://loyalty/${slug}?${params.toString()}`;
}

export default function LoyaltyCard({ slug, scanToken, maxStamps, lang }: Props) {
  const [openAppHref, setOpenAppHref] = useState(appFallbackUrl(lang));
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const href = isAndroid
      ? buildAndroidAppLink(slug, scanToken, maxStamps, lang)
      : /iPhone|iPad|iPod/i.test(ua)
        ? buildIosAppLink(slug, scanToken, maxStamps)
        : appFallbackUrl(lang);
    setOpenAppHref(href);

    // A scanToken means we just arrived from a real NFC tap — jump straight
    // into the app instead of making the customer tap the button. Android's
    // intent:// links fall back gracefully to the download page when the
    // app isn't installed; iOS custom schemes don't (they show an error), so
    // only auto-open on Android and leave the button as the iOS path.
    if (isAndroid && scanToken && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      window.location.href = href;
    }
  }, [slug, scanToken, maxStamps, lang]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 text-center">{t("loyalty_app_prompt", lang)}</p>
      <a
        href={openAppHref}
        className="bg-black text-white rounded-lg px-4 py-3 text-sm font-medium text-center"
      >
        {t("open_in_app_button", lang)}
      </a>
      <a href={appFallbackUrl(lang)} className="text-center text-sm text-gray-500 underline">
        {t("download_app_link", lang)}
      </a>
    </div>
  );
}
