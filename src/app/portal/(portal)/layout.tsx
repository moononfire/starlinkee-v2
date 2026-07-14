import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { portalLogoutAction } from "./actions";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import UserMenu from "./UserMenu";
import SubscriptionSidebar, {
  type SidebarSubscription,
} from "./settings/SubscriptionSidebar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, customer, subscriptions } = await getPortalSession();

  if (!user?.email) {
    redirect("/portal/login");
  }

  const lang = await getLanguage();

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {t("portal_no_account_title", lang)}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("portal_no_account_message", lang)}{" "}
            <strong>{user.email}</strong>. {t("portal_no_account_contact", lang)}
          </p>
          <form action={portalLogoutAction}>
            <button
              type="submit"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("portal_logout", lang)}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const sidebarSubs: SidebarSubscription[] = subscriptions.map((s) => ({
    subscription_id: s.subscription_id,
    subscription_name: s.subscription_name,
    status: s.status,
    locationName: s.location?.location_name ?? null,
  }));

  // Przy jednym lokalu przełącznik nic nie wnosi — chowamy go.
  const showSidebar = sidebarSubs.length > 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
            Starlinkee
          </span>
          <div className="flex items-center gap-4">
            <LanguageSwitcher currentLang={lang} />
            <UserMenu
              name={customer.customer_name}
              email={customer.email}
              lang={lang}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
          {showSidebar && (
            <aside className="lg:w-52 lg:shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-2 lg:p-3">
                <SubscriptionSidebar subscriptions={sidebarSubs} lang={lang} />
              </div>
            </aside>
          )}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
