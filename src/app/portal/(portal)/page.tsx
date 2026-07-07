import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";

export default async function PortalIndexPage() {
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

  if (subscriptions.length === 0) {
    const lang = await getLanguage();
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {t("portal_no_subscriptions", lang)}
        </p>
      </div>
    );
  }

  redirect(`/portal/${subscriptions[0].subscription_id}`);
}
