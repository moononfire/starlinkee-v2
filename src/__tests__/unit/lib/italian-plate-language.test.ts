import { describe, it, expect, vi, beforeEach } from "vitest";
import translationsJson from "@/lib/translations.json";
import { t } from "@/lib/translations";
import { PLATE_LANGUAGES } from "@/lib/languages";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookieValue === undefined ? undefined : { value: cookieValue }) }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import { getLanguage } from "@/lib/language";
import { visibleSwitcherLanguages } from "@/components/LanguageSwitcher";

const PLATE_SCREEN_KEYS = [
  "appreciate_feedback", "conversation_reply_placeholder", "conversation_send_btn", "email_required_input",
  "message_placeholder", "name_optional", "phone_optional", "plate_unavailable_title", "plate_unavailable_message",
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
const LINKTREE_KEYS = [
  "back_button", "check_messages", "claim_code_btn", "collect_promo_btn", "collect_promo_default",
  "collect_your_promo", "consent_required", "consent_text", "coupon_already_used", "coupon_code_label",
  "download_app_link", "email_optional_placeholder", "leave_review", "link_expired", "loyalty_app_prompt",
  "loyalty_card_link", "open_in_app_button", "opening_app", "phone_already_claimed",
  "portal_linktree_preview_hint", "portal_loyalty_card_text_placeholder", "portal_tab_menu", "portal_tab_wifi",
  "portal_wifi_copy", "portal_wifi_copy_success", "portal_wifi_qr_title", "processing", "promo_sent_sms",
  "scan_nfc_for_promo", "sending", "show_to_staff", "something_went_wrong", "your_promo", "your_promo_coupon",
  "portal_promo_sms_placeholder",
];

beforeEach(() => {
  cookieValue = undefined;
});

describe("Italian translations", () => {
  const it_ = (translationsJson as Record<string, Record<string, string>>).it;

  it.each([...PLATE_SCREEN_KEYS, ...SETUP_FORM_KEYS, ...LINKTREE_KEYS])("has a non-empty Italian text for %s", (key) => {
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

describe("/l/* pages with Italian", () => {
  it("keeps it for an Italian-only location instead of falling back to en", async () => {
    expect(await getLanguage("slug", "en", ["it"])).toBe("it");
  });
  it("honours an it cookie when it is active for the location", async () => {
    cookieValue = "it";
    expect(await getLanguage("slug", "pl", ["pl", "it"])).toBe("it");
  });
  it("ignores an it cookie when the location did not activate it", async () => {
    cookieValue = "it";
    expect(await getLanguage("slug", "pl", ["pl", "en"])).toBe("pl");
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

describe("default page language", () => {
  it("is English for a location without plates", async () => {
    const { firstPlateLanguage } = await import("@/lib/languages");
    const plateLanguage = firstPlateLanguage([]);
    expect(plateLanguage).toBe("en");
    expect(await getLanguage("slug", plateLanguage, ["pl", "en", "de"])).toBe("en");
  });
  it("uses the first plate's language when there is one", async () => {
    const { firstPlateLanguage } = await import("@/lib/languages");
    expect(firstPlateLanguage([{ plate_language: "de" }])).toBe("de");
  });
});
