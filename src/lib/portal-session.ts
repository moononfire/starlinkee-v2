import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import type { PortalSubscription } from "@/lib/db/portal";
import type { Customer } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export interface PortalSession {
  user: User | null;
  customer: Customer | null;
  subscriptions: PortalSubscription[];
}

/**
 * Deduplicated per request via React cache(): the portal layout and every
 * nested page/layout can call this without re-running auth + DB queries.
 */
export const getPortalSession = cache(async (): Promise<PortalSession> => {
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
  if (!user?.email) return { user: null, customer: null, subscriptions: [] };

  const customer = await getCustomerByEmail(user.email);
  if (!customer) return { user, customer: null, subscriptions: [] };

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  return { user, customer, subscriptions };
});
