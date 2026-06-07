import { notFound, redirect } from "next/navigation";
import { getPlateByNumber } from "@/lib/db/plates";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { createScanRecord } from "@/lib/db/reviews";
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

  // status === "active" — register scan and redirect
  const scanId = await createScanRecord(plate.plate_id);
  redirect(`/plate/${plate.plate_number}/scan/${scanId}`);
}

function InactivePage({ lang }: { lang: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-sm w-full text-center">
        <p className="text-lg font-medium text-gray-700">
          {t("plate_inactive_title", lang)}
        </p>
        <p className="mt-2 text-gray-500">{t("plate_inactive_exception", lang)}</p>
      </div>
    </main>
  );
}
