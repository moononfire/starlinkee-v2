import { ownerLanguage } from "@/lib/languages";
import { generateActivationCode, hashActivationCode, formatActivationCode } from "../activation-code";
import { getSubscriptionById, setActivationCodeHash } from "../db/subscriptions";
import { listPlateNumbersBySubscription } from "../db/plates";
import { getCustomerById } from "../db/customers";
import { sendPlateActivationCode } from "../email";

/**
 * Called whenever a plate is assigned to a subscription. Issues a fresh
 * activation code (replacing any earlier one), stores only its hash and emails
 * the plain code to the customer. Anonymous plate setup requires this code,
 * since the plate secret alone is printed on the plate and was leaked.
 *
 * Never throws: assignment must not fail because the email did. Returns false
 * when the code could not be issued or delivered (an admin can re-assign to retry).
 */
export async function issueActivationCode(subscriptionId: number): Promise<boolean> {
  try {
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription || subscription.status !== "pending") return false;

    const customer = await getCustomerById(subscription.customer_id);
    if (!customer?.email) return false;

    const code = generateActivationCode();
    await setActivationCodeHash(subscriptionId, hashActivationCode(code));

    const plateNumbers = await listPlateNumbersBySubscription(subscriptionId);
    await sendPlateActivationCode(customer.email, ownerLanguage(customer), {
      plateNumbers,
      code: formatActivationCode(code),
    });
    return true;
  } catch (err) {
    console.error("[activation] failed to issue activation code:", err);
    return false;
  }
}
