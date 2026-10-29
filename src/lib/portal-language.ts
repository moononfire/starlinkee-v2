import { cookies } from "next/headers";
import { getPortalSession } from "@/lib/portal-session";
import { ownerLanguage, SUPPORTED_LANGUAGES, type Language } from "@/lib/languages";

/**
 * Portal UI language: the owner's switcher choice (cookie) wins, otherwise the customer's
 * preferred_language (then English). Replaces a bare getLanguage(), which ignored the customer.
 */
export async function getPortalLanguage(): Promise<Language> {
  const jar = await cookies();
  const chosen = jar.get("lang")?.value;
  if (chosen && SUPPORTED_LANGUAGES.includes(chosen as Language)) return chosen as Language;
  const { customer } = await getPortalSession();
  return ownerLanguage(customer);
}
