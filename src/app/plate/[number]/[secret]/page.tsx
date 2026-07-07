import { notFound, redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getPlateByNumber, incrementPlateVisits } from "@/lib/db/plates";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { createScanRecord } from "@/lib/db/reviews";
import { createScanToken } from "@/lib/db/scan-tokens";
import { t } from "@/lib/translations";
import { getLanguage } from "@/lib/language";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PlateSetupForm from "@/components/plate/PlateSetupForm";

interface Props {
  params: Promise<{ number: string; secret: string }>;
}

export default async function PlatePage({ params }: Props) {
  const { number, secret } = await params;

  const plate = await getPlateByNumber(number);
  if (!plate) notFound();

  // Strict secret key validation
  if (secret !== plate.secret_key) notFound();

  const lang = await getLanguage(plate.plate_number, plate.plate_language);

  if (!plate.subscription_id) {
    return <InactivePage lang={lang} plateNumber={plate.plate_number} plateSecret={plate.secret_key} />;
  }

  const subscription = await getSubscriptionById(plate.subscription_id);
  if (!subscription) notFound();

  if (subscription.status === "inactive") {
    return <InactivePage lang={lang} plateNumber={plate.plate_number} plateSecret={plate.secret_key} />;
  }

  if (subscription.status === "pending") {
    return (
      <PlateSetupForm
        plateNumber={plate.plate_number}
        plateSecret={plate.secret_key}
        lang={lang}
      />
    );
  }

  // Physical scan — always increment plate visits
  incrementPlateVisits(plate.plate_id).catch(() => {});

  const location = await getLocationBySubscriptionId(plate.subscription_id);

  if (
    location &&
    location.scan_redirect_mode === "linktree" &&
    location.has_linktree_access &&
    location.linktree_slug
  ) {
    const scanToken = await createScanToken(location.location_id);
    redirect(`/l/${location.linktree_slug}?scan=${scanToken}`);
  }

  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? null;
  const userAgent = headersList.get("user-agent") ?? null;
  const deviceId = cookieStore.get("_did")?.value ?? null;

  const scanId = await createScanRecord(plate.plate_id, { ip_address: ip, user_agent: userAgent, device_id: deviceId });
  redirect(`/plate/${plate.plate_number}/scan/${scanId}`);
}

function InactivePage({
  lang,
  plateNumber,
  plateSecret,
}: {
  lang: string;
  plateNumber?: string;
  plateSecret?: string;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "#f9fafb", color: "#111827" }}>
      <div className="max-w-sm w-full text-center">
        <div className="mb-4 flex justify-center">
          <LanguageSwitcher currentLang={lang} scopeKey={plateNumber} />
        </div>
        <p className="text-lg font-medium" style={{ color: "#1f2937" }}>
          {t("plate_inactive_title", lang)}
        </p>
        <p className="mt-2" style={{ color: "#374151" }}>{t("plate_inactive_exception", lang)}</p>

        {plateNumber && plateSecret && (
          <div className="mt-6">
            <p className="mb-3 text-sm" style={{ color: "#374151" }}>
              {t("plate_renew_description", lang)}
            </p>
            <form action="/api/plate/renew" method="POST">
              <input type="hidden" name="plateNumber" value={plateNumber} />
              <input type="hidden" name="plateSecret" value={plateSecret} />
              <input type="hidden" name="interval" value="month" />
              <button
                type="submit"
                className="w-full rounded-lg px-4 py-3 font-medium text-white"
                style={{ backgroundColor: "#111827" }}
              >
                {t("plate_renew_button_monthly", lang)}
              </button>
            </form>
            <form action="/api/plate/renew" method="POST" className="mt-3">
              <input type="hidden" name="plateNumber" value={plateNumber} />
              <input type="hidden" name="plateSecret" value={plateSecret} />
              <input type="hidden" name="interval" value="year" />
              <button
                type="submit"
                className="w-full rounded-lg px-4 py-3 font-medium"
                style={{ backgroundColor: "#e5e7eb", color: "#111827" }}
              >
                {t("plate_renew_button_yearly", lang)}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
