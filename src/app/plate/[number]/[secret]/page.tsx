import { notFound, redirect } from "next/navigation";
import { getPlateByNumber, incrementPlateVisits } from "@/lib/db/plates";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { createScanRecord } from "@/lib/db/reviews";
import { createScanToken } from "@/lib/db/scan-tokens";
import { t } from "@/lib/translations";
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

  const lang = plate.plate_language;

  if (!plate.subscription_id) {
    return <InactivePage lang={lang} />;
  }

  const subscription = await getSubscriptionById(plate.subscription_id);
  if (!subscription) notFound();

  if (subscription.status === "inactive") {
    return <InactivePage lang={lang} />;
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

  const scanId = await createScanRecord(plate.plate_id);
  redirect(`/plate/${plate.plate_number}/scan/${scanId}`);
}

function InactivePage({ lang }: { lang: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "#f9fafb", color: "#111827" }}>
      <div className="max-w-sm w-full text-center">
        <p className="text-lg font-medium" style={{ color: "#1f2937" }}>
          {t("plate_inactive_title", lang)}
        </p>
        <p className="mt-2" style={{ color: "#374151" }}>{t("plate_inactive_exception", lang)}</p>
      </div>
    </main>
  );
}
