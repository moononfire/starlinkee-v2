import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCustomerByEmail } from "@/lib/db/portal";
import { portalLogoutAction } from "./actions";
import PortalNav from "./PortalNav";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PortalNav
        customerName={customer.customer_name}
        customerEmail={customer.email}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
