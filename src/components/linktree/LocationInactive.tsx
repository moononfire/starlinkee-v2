import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import { getLanguage } from "@/lib/language";
import { firstPlateLanguage } from "@/lib/languages";
import { t } from "@/lib/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { CustomerLocation } from "@/lib/types";

/**
 * Neutral screen for any /l/<slug> page of a venue whose subscription is not active. Like the plate's
 * inactive page: no hint about expiry, no links to the venue's modules, and nothing that mentions a plate secret.
 */
export default async function LocationInactive({ location, slug }: { location: CustomerLocation; slug: string }) {
  const plates = await getPlatesBySubscriptionId(location.subscription_id);
  const lang = await getLanguage(slug, firstPlateLanguage(plates), location.active_languages);

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#f9fafb", color: "#111827" }}>
      <div className="max-w-sm w-full text-center">
        <div className="mb-4 flex justify-center">
          <LanguageSwitcher currentLang={lang} scopeKey={slug} availableLanguages={location.active_languages} />
        </div>
        <p className="text-lg font-medium" style={{ color: "#1f2937" }}>
          {t("plate_unavailable_title", lang)}
        </p>
        <p className="mt-2" style={{ color: "#374151" }}>{t("plate_unavailable_message", lang)}</p>
      </div>
    </main>
  );
}
