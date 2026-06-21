import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateScanRedirectMode } from "./actions";
import LogoUpload from "./LogoUpload";

export default async function PortalSettingsPage() {
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
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const allLocations = subscriptions
    .filter((s) => s.location)
    .map((s) => s.location!);
  const locationsWithLinktree = allLocations
    .filter((l) => l.has_linktree_access && l.linktree_slug);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Ustawienia
      </h1>

      {allLocations.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Logo firmy
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Logo wyświetlane na stronie po zeskanowaniu płytki i na Twoim profilu Linktree.
          </p>
          <div className="space-y-6">
            {allLocations.map((location) => (
              <LogoUpload
                key={location.location_id}
                locationId={location.location_id}
                locationName={location.location_name}
                currentLogoLink={location.logo_link}
              />
            ))}
          </div>
        </section>
      )}

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Tryb skanowania płytki
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Wybierz, co się dzieje gdy klient skanuje Twoją płytkę Starlinkee.
        </p>

        {locationsWithLinktree.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nie masz aktywnego pakietu Linktree. Po aktywacji będziesz mógł
            wybrać tryb przekierowania.
          </p>
        ) : (
          <div className="space-y-6">
            {locationsWithLinktree.map((location) => (
              <form
                key={location.location_id}
                action={updateScanRedirectMode}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <input
                  type="hidden"
                  name="location_id"
                  value={location.location_id}
                />
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {location.location_name}
                </p>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="scan_redirect_mode"
                      value="review"
                      defaultChecked={location.scan_redirect_mode === "review"}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Bezpośrednio do opinii
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Klient od razu widzi stronę z oceną i może zostawić
                        opinię Google.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="scan_redirect_mode"
                      value="linktree"
                      defaultChecked={location.scan_redirect_mode === "linktree"}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Linktree
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Klient widzi Twój Linktree z listą linków (opinia,
                        menu, rezerwacje itp.).
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Zapisz
                </button>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
