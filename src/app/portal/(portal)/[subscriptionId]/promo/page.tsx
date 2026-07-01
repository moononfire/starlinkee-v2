import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { getLeadsByLocationId } from "@/lib/db/leads";
import { updatePromoSettings } from "./actions";
import PromoPreviewEditor from "./PromoPreviewEditor";
import PromoContactsTable from "./PromoContactsTable";
import SavedToast from "../../SavedToast";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function PromoPortalPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const { saved } = await searchParams;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

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
  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  if (!sub.location?.has_promo_enabled) {
    redirect(`/portal/${subscriptionId}`);
  }

  const location = sub.location;
  const leads = await getLeadsByLocationId(location.location_id);
  const locationName = location.location_name;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/portal/${subscriptionId}`}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          ← {locationName}
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Promocja</h2>
      </div>

      <form action={updatePromoSettings}>
        <input type="hidden" name="subscription_id" value={subscriptionId} />
        <input type="hidden" name="location_id" value={location.location_id} />
        <PromoPreviewEditor
          initialDescription={location.promo_description ?? ""}
          initialBannerText={location.promo_banner_text ?? ""}
          initialSmsText={location.promo_sms_text ?? ""}
          logoLink={location.logo_link}
          locationName={locationName}
        />
      </form>

      <PromoContactsTable leads={leads} />

      <SavedToast show={saved === "1"} />
    </div>
  );
}
