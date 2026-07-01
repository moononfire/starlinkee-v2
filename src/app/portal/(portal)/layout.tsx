import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { portalLogoutAction } from "./actions";
import ThemeToggle from "@/components/ThemeToggle";
import SubscriptionSidebar, {
  type SidebarSubscription,
} from "./settings/SubscriptionSidebar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/portal/login");
  }

  const customer = await getCustomerByEmail(user.email);

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Brak konta
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Nie znaleziono konta klienta powiązanego z adresem{" "}
            <strong>{user.email}</strong>. Skontaktuj się z nami, jeśli
            uważasz, że to błąd.
          </p>
          <form action={portalLogoutAction}>
            <button
              type="submit"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Wyloguj
            </button>
          </form>
        </div>
      </div>
    );
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);

  const sidebarSubs: SidebarSubscription[] = subscriptions.map((s) => ({
    subscription_id: s.subscription_id,
    subscription_name: s.subscription_name,
    status: s.status,
    locationName: s.location?.location_name ?? null,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
            Starlinkee
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
              {customer.customer_name}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
              {customer.email}
            </span>
            <form action={portalLogoutAction}>
              <button
                type="submit"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Wyloguj
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 items-start">
          {sidebarSubs.length > 0 && (
            <aside className="w-52 shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-3">
                <SubscriptionSidebar subscriptions={sidebarSubs} />
              </div>
            </aside>
          )}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      <ThemeToggle />
    </div>
  );
}
