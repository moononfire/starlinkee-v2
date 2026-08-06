import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalSession } from "@/lib/portal-session";
import { portalLogoutAction } from "./actions";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import UserMenu from "./UserMenu";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/portal" className="hover:opacity-80 transition-opacity flex items-center">
            <img src="/logo-black.webp" alt="Starlinkee" className="h-10 w-auto block dark:hidden" />
            <img src="/logo-white.webp" alt="Starlinkee" className="h-10 w-auto hidden dark:block" />
          </Link>
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
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
    </div>
  );
}
