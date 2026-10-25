import { describe, it, expect, vi, beforeEach } from "vitest";
import translationsJson from "@/lib/translations.json";
import { t } from "@/lib/translations";
import { SUPPORTED_LANGUAGES, PLATE_LANGUAGES, linktreeLanguages } from "@/lib/languages";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import { getLanguage } from "@/lib/language";
import { visibleSwitcherLanguages } from "@/components/LanguageSwitcher";

const PLATE_SCREEN_KEYS = [
  "appreciate_feedback", "conversation_reply_placeholder", "conversation_send_btn", "email_required_input",
  "message_placeholder", "name_optional", "phone_optional", "plate_inactive_exception", "plate_inactive_title",
  "plate_renew_button_monthly", "plate_renew_button_yearly", "plate_renew_description", "proxy_page_title",
  "send_feedback_btn", "sending_feedback", "sorry_share_feedback", "thank_you_short", "we_will_be_in_touch",
];
const SETUP_FORM_KEYS = [
  "setup_form_activation_code", "setup_form_activation_code_hint", "setup_form_business_name",
  "setup_form_business_name_hint", "setup_form_choose_file", "setup_form_google_search",
  "setup_form_google_search_hint", "setup_form_google_selected", "setup_form_logo", "setup_form_logo_hint",
  "setup_form_no_file", "setup_form_submit", "setup_form_submitting", "setup_form_support_email",
  "setup_form_support_email_hint", "setup_form_title",
];

beforeEach(() => {
  cookieValue = undefined;
});

describe("Italian translations", () => {
  const it_ = (translationsJson as Record<string, Record<string, string>>).it;

  it.each([...PLATE_SCREEN_KEYS, ...SETUP_FORM_KEYS])("has a non-empty Italian text for %s", (key) => {
    expect(it_[key]?.trim().length).toBeGreaterThan(0);
  });

  it("returns the Italian text, not English, for a translated key", () => {
    expect(t("thank_you_short", "it")).toBe("Grazie!");
    expect(t("thank_you_short", "it")).not.toBe(t("thank_you_short", "en"));
  });

  it("falls back to English for a key that has no Italian text", () => {
    expect(it_["portal_password_title"]).toBeUndefined();
    expect(t("portal_password_title", "it")).toBe(t("portal_password_title", "en"));
  });

  it("labels the plate-only Italian toggle in every portal language", () => {
    for (const l of SUPPORTED_LANGUAGES) expect(t("portal_lang_it_plate_only", l)).not.toBe("portal_lang_it_plate_only");
  });
});

describe("getLanguage with Italian", () => {
  it("accepts an it cookie when the allowed list contains it", async () => {
    cookieValue = "it";
    expect(await getLanguage("P1", "en", PLATE_LANGUAGES)).toBe("it");
  });

  it("never returns it for the portal (default allowed list)", async () => {
    cookieValue = "it";
    expect(await getLanguage()).toBe("en");
    expect(await getLanguage(undefined, "it")).toBe("en");
  });

  it("uses plate_language it as the default when there is no cookie", async () => {
    expect(await getLanguage("P1", "it", PLATE_LANGUAGES)).toBe("it");
  });

  it("honours a location whose active languages include it", async () => {
    expect(await getLanguage("P1", "it", ["pl", "it"])).toBe("it");
  });
});

describe("linktreeLanguages", () => {
  it("drops it", () => {
    expect(linktreeLanguages(["pl", "it"])).toEqual(["pl"]);
  });
  it("gives an empty list for an Italian-only location, which getLanguage turns into en", async () => {
    expect(linktreeLanguages(["it"])).toEqual([]);
    expect(await getLanguage("slug", "it", linktreeLanguages(["it"]))).toBe("en");
  });
});

describe("LanguageSwitcher visibility", () => {
  it("hides IT by default (portal, /verify)", () => {
    expect(visibleSwitcherLanguages().map((l) => l.code)).toEqual(["en", "de", "pl"]);
  });
  it("shows IT when the plate languages are passed", () => {
    expect(visibleSwitcherLanguages(PLATE_LANGUAGES).map((l) => l.code)).toContain("it");
  });
  it("shows only the location's active languages", () => {
    expect(visibleSwitcherLanguages(["it", "pl"]).map((l) => l.code)).toEqual(["pl", "it"]);
  });
});
