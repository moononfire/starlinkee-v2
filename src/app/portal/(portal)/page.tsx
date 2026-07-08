import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";

export default async function PortalIndexPage() {
  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  if (subscriptions.length === 0) {
    const lang = await getLanguage();
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {t("portal_no_subscriptions", lang)}
        </p>
        <a
          href="mailto:kontakt@starlinkee.pl"
          className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          kontakt@starlinkee.pl
        </a>
      </div>
    );
  }

  redirect(`/portal/${subscriptions[0].subscription_id}`);
}
