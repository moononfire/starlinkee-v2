import { getSubscriptionById } from "./db/subscriptions";
import { getLocationById } from "./db/locations";

/**
 * Public linktree pages and their APIs (promo, loyalty, wifi, menu, review) are paid for by the subscription:
 * they work only while it is `active`. Same rule and same lazy expiry as the plate scan page
 * (`getSubscriptionById` flips a past-due subscription to inactive on read).
 */
export async function isLocationActive(location: { subscription_id: number }): Promise<boolean> {
  const subscription = await getSubscriptionById(location.subscription_id);
  return subscription?.status === "active";
}

export async function isLocationActiveById(locationId: number): Promise<boolean> {
  const location = await getLocationById(locationId);
  return location ? isLocationActive(location) : false;
}

/** JSON body the public/mobile APIs answer with (HTTP 403) for a venue whose subscription is not active. */
export const SUBSCRIPTION_INACTIVE = { error: "subscription_inactive" } as const;
