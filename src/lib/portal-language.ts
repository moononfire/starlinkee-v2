import { cookies } from "next/headers";
import { getPortalSession } from "@/lib/portal-session";
import { ownerLanguage, SUPPORTED_LANGUAGES, type Language } from "@/lib/languages";

/**
 * Portal UI language: a signed-in owner gets the customer's preferred_language (then English), which the
 * portal switcher writes, so it is the same on every device and in every e-mail. The `lang` cookie only
 * decides when there is no customer behind the session.
 */
export async function getPortalLanguage(): Promise<Language> {
  const { customer } = await getPortalSession();
  if (customer) return ownerLanguage(customer);
  const jar = await cookies();
  const chosen = jar.get("lang")?.value;
  if (chosen && SUPPORTED_LANGUAGES.includes(chosen as Language)) return chosen as Language;
  return ownerLanguage(null);
}
