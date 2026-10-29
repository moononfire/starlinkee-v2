# Plan: język włoski (it) na ekranach płytki

Paczka: `qitem-20261025141024-6f1807859c8825a1` (od VB przez intake). Planner: plan-planner, 2026-10-25.

## Cel i co znaczy "gotowe"

Klient końcowy, który skanuje płytkę lokalu z włączonym włoskim, widzi po włosku wszystkie ekrany przed opinią Google: ocenę gwiazdkami, formularz uwag, podziękowanie, wątek z odpowiedzią właściciela oraz ekran płytki nieaktywnej (odnowienie). Przełącznik języka pokazuje IT z flagą. Inne powierzchnie się nie zmieniają: portal właściciela, linktree `/l/*`, admin i maile.

## Kluczowa decyzja projektowa (domyślna, bez blokowania VB)

`SUPPORTED_LANGUAGES` (en/de/pl) **zostaje bez zmian**. Ta lista steruje też portalem: językiem UI właściciela, przełącznikiem w `portal/(portal)/layout.tsx` i `/verify`, polami treści per język w `LinktreeLinksEditor` i `PromoPreviewEditor`. Te pola mają w DB kolumny tylko `pl`/`_en`/`_de`, więc dopisanie tam `it` dałoby edytory bez kolumn i portal po włosku w ok. 95% z angielskim fallbackiem.

Zamiast tego w `src/lib/languages.ts` dodaj drugą listę, np.:

```ts
export const SUPPORTED_LANGUAGES = ["en", "de", "pl"] as const;        // portal, linktree, treści w DB
export const PLATE_LANGUAGES = [...SUPPORTED_LANGUAGES, "it"] as const; // ekrany płytki
export type PlateLanguage = (typeof PLATE_LANGUAGES)[number];
```

Jak włoski trafia do klienta:
1. **Ustawienie lokalu.** W portalu (`settings/LocationSettings.tsx` i akcja `updateActiveLanguages` w `settings/[subscriptionId]/actions.ts:260`) przełączniki iterują po `PLATE_LANGUAGES`. Etykieta IT ma dopisek, że dotyczy tylko ekranu płytki (nowy klucz tłumaczenia dla en/de/pl). `active_languages` może więc zawierać `it`.
2. **Domyślny język płytki.** `plate_language = 'it'` dla płytek drukowanych na rynek włoski, ustawiany przez import w adminie (`admin/plates/import`). To fallback w `getLanguage`, gdy nie ma cookie.

Strony `/l/*` (linktree, wifi, promo, loyalty, claim) **odfiltrowują `it`**: do `getLanguage` i `LanguageSwitcher` przekazują `location.active_languages` przecięte z `SUPPORTED_LANGUAGES`. Jeśli lokal ma tylko `it`, a przecięcie jest puste, `getLanguage` już teraz zwraca `"en"` (`language.ts:20-21`). Sprawdź, że przełącznik nie renderuje się wtedy pusty ani dziwnie.

Jeśli VB woli, żeby włoski objął też linktree, to osobna paczka: kolumny `_it` w DB, edytory w portalu i ok. 35 kluczy `/l`. Nie robić tego w tej paczce.

## Zmiany (pliki)

1. `src/lib/languages.ts`: `PLATE_LANGUAGES` i `PlateLanguage` jak wyżej.
2. `src/lib/language.ts`, `getLanguage`: walidacja względem `PLATE_LANGUAGES` zamiast `SUPPORTED_LANGUAGES`. Domyślne `allowedLanguages` zostaje `SUPPORTED_LANGUAGES`, więc portal (`getLanguage()` bez argumentów) nigdy nie zwróci `it`. Typ zwracany: `PlateLanguage`. Sprawdź tsc w miejscach, które oczekują `Language`; tam, gdzie wynik idzie do treści w DB (`promo-i18n.ts`), `it` i tak nie dotrze dzięki filtrowi z pkt 6.
3. `src/lib/translations.ts`: lista dozwolonych języków w `t()` ma być z `PLATE_LANGUAGES`, nie wpisana na sztywno `["en","de","pl"]`. Dzisiaj `t("x","it")` od razu spada na `en`.
4. `src/lib/translations.json`: nowa sekcja `"it"` **tylko z kluczami ekranów płytki** (lista niżej). Brakujące klucze spadają na `en` przez istniejący fallback w `t()`.
5. `src/components/LanguageSwitcher.tsx`: dodaj `{ code: "it", label: "IT" }`, ale **domyślnie (bez `availableLanguages`) pokazuj tylko `SUPPORTED_LANGUAGES`**. Inaczej IT pojawi się w portalu i na `/verify`. Ekrany płytki przekazują listę jawnie.
6. Strony `/l/*` (`l/[slug]/page.tsx`, `wifi`, `promo`, `promo/claim/[token]`, `loyalty`, `components/linktree/LinktreeProfile.tsx`): filtr `active_languages ∩ SUPPORTED_LANGUAGES` przed `getLanguage` i przełącznikiem. Najlepiej jeden helper w `languages.ts`, np. `linktreeLanguages(active)`.
7. `src/app/plate/[number]/[secret]/page.tsx:31,118`: `getLanguage(plate.plate_number, plate.plate_language, PLATE_LANGUAGES)`, a `InactivePage` ma przekazywać `availableLanguages={PLATE_LANGUAGES}`, bo dziś nie przekazuje nic. Ekran nieaktywny nie ma lokalu, więc pokazuje wszystkie 4 języki.
8. `src/app/plate/[number]/scan/[scanId]/page.tsx:42,75,106`: bez zmian logiki, bo filtr po `location.active_languages` już tam jest. Sprawdź tylko, czy typy się zgadzają.
9. `src/components/flags.tsx`: `FlagIT` (pionowo: zielony `#009246`, biały, czerwony `#ce2b37`) i wpis `it` w `FLAG_MAP`.
10. `src/lib/types.ts:94`: `active_languages` jako `PlateLanguage[]`. `src/lib/db/locations.ts:262` bez zmian.
11. Migracja (tylko plik, **nie uruchamiać** na żadnej bazie), np. `supabase/migrations/20261025000000_italian_plate_language.sql`:
    - `customer_locations_active_languages_valid`: `drop` i `add` z `array['pl','en','de','it']`;
    - check na `plates.plate_language` (inline z `initial_schema.sql:56`, nazwa auto, prawdopodobnie `plates_plate_language_check`; sprawdź nazwę i użyj `drop constraint if exists`) z `'it'`;
    - `customers.preferred_language` **bez zmian** (maile i portal właściciela).
12. Admin: `admin/plates/import` przyjmie `it` po migracji. Opcjonalnie walidacja wejścia do `PLATE_LANGUAGES` z czytelnym błędem. W innych miejscach admina `plate_language` jest tylko wyświetlane.

## Klucze do przetłumaczenia (sekcja `it`)

Ekrany oceny, uwag i podziękowania, z `src/app/plate/**`, `RatingStars`, `FeedbackForm` i `ReviewConversation` (18):
`appreciate_feedback conversation_reply_placeholder conversation_send_btn email_required_input message_placeholder name_optional phone_optional plate_inactive_exception plate_inactive_title plate_renew_button_monthly plate_renew_button_yearly plate_renew_description proxy_page_title send_feedback_btn sending_feedback sorry_share_feedback thank_you_short we_will_be_in_touch`

Formularz konfiguracji płytki (`PlateSetupForm`, widzi go właściciel na płytce `pending`, w języku płytki) (16):
`setup_form_activation_code setup_form_activation_code_hint setup_form_business_name setup_form_business_name_hint setup_form_choose_file setup_form_google_search setup_form_google_search_hint setup_form_google_selected setup_form_logo setup_form_logo_hint setup_form_no_file setup_form_submit setup_form_submitting setup_form_support_email setup_form_support_email_hint setup_form_title`

Nowy klucz etykiety w portalu: np. `portal_lang_it_plate_only` dla en/de/pl. Przed tłumaczeniem przejrzyj komponenty jeszcze raz pod kątem kluczy składanych dynamicznie i tekstów wpisanych na sztywno; mój grep znalazł tylko wywołania `t("…")` z literałem.

Ton: jak w wersji pl/en (krótko, uprzejmie, forma "Lei" lub neutralna, spójnie w całej sekcji). Miejsca niepewne oznacz w `docs/plans/italian-review.md` (klucz, tekst IT i powód), bo JSON nie ma komentarzy. Native speaker powinien przejrzeć całość przed włączeniem pierwszego klienta.

## Poza zakresem (świadomie)

- Maile. `sendReplyNotification` (odpowiedź właściciela do klienta końcowego) używa dziś `customer.preferred_language` właściciela, a nie języka klienta (`api/portal/messages/route.ts:53`). Włoski wymagałby zapisu języka skanującego w `reviews` (nowa kolumna). Do backlogu.
- Treści per język w DB (promo, linki i banery linktree): `promo-i18n.ts` zostaje.
- Język `zh` w `translations.json` jest nieosiągalny i zostaje bez zmian.
- `<html lang="en">` w root layout to istniejący stan.
- Aplikacja mobilna dostaje `plate_language` z `api/mobile/plates/[plate_number]`. Ryzyko: nie wiem, jak zachowa się przy `it`. Builder niech sprawdzi tylko, czy po stronie v2 nic się nie sypie, i wpisze to w raport.

## Testy

- `translations.test.ts`: każdy klucz z dwóch list powyżej istnieje w `it` i nie jest pusty (lista kluczy jako stała w teście). `t("nieistniejacy_w_it_klucz","it")` zwraca tekst `en`, a `t(key,"it")` zwraca tekst IT, nie EN.
- `getLanguage` (mock `cookies`): cookie `it` z `allowed` zawierającym `it` daje `it`; bez argumentów (portal) daje fallback; `plate_language='it'` i brak cookie daje `it`.
- Helper filtra `/l`: `["it"]` daje `[]` i potem `en`; `["pl","it"]` daje `["pl"]`.
- `LanguageSwitcher`: bez `availableLanguages` brak IT, z `PLATE_LANGUAGES` jest IT. Test renderu, jeśli projekt ma setup do komponentów, a jeśli nie, test czystej funkcji wyciągniętej z komponentu.
- Rozszerz istniejący `plate-scan-page.test.ts` o przypadek `active_languages: ["it"]`.
- Bramki: `npx tsc --noEmit`, `npm test`, `npm run build`.

## Git

- Gałąź `feat/italian` od aktualnego `dev`. Uwaga: `dev` **jest** gałęzią head PR #7 (security, base `master`), więc `feat/italian` będzie zawierać te commity jako bazę. Nie commituj na `dev`, żeby nie dorzucić niczego do PR #7. Merge dopiero po PR #7.
- Commity lokalne, **bez push i merge**.
- Konflikty z security: `RatingStars.tsx` i strona scan były zmieniane w PR #7. Pracuj na wersji z `dev`.

## Rozszerzenie: linktree

Paczka `qitem-20261025141727-d0d99c3c73c6c6b0`, decyzja VB z 2026-10-25: włoski także na `/l/*`. Ta sekcja **zastępuje** w części "Kluczowa decyzja" fragment o odfiltrowaniu `it` na `/l/*`. Punkt "Poza zakresem → treści per język w DB" też już nie obowiązuje. Stan bazowy to `feat/italian` z `84b1990` (włoski na płytce) i `49cf9dd` (domyślne `en`). Kontynuuj na tej gałęzi.

### Model po zmianie

- `SUPPORTED_LANGUAGES` (en/de/pl) to teraz **tylko język UI portalu właściciela**: przełącznik w portalu, `/verify` i `getLanguage()` bez argumentów. `customers.preferred_language` i maile się nie zmieniają.
- `PLATE_LANGUAGES` (en/de/pl/it) to wszystko, co widzi klient końcowy: płytka, `/l/*` i treści per język w DB. Komentarze w `languages.ts` i `LanguageSwitcher.tsx` mówią dziś "Italian on plate screens only" i trzeba je poprawić. Zmiana nazwy na `PUBLIC_LANGUAGES` jest opcjonalna i zależy od decyzji buildera. Jeśli ją robisz, to w osobnym commicie.
- `linktreeLanguages()` usuń, albo niech zwraca `PLATE_LANGUAGES ∩ active`. Strony `/l/*` (`page.tsx`, `wifi`, `promo`, `promo/claim/[token]`, `loyalty`, `LinktreeProfile.tsx`) mają przekazywać `location.active_languages` bez filtra. `/l/[slug]/menu` i `/l/[slug]/review` tylko przekierowują i nie mają tekstów.
- `active_languages`: constraint w DB już przyjmuje `it` dzięki migracji `20261025000000`. W portalu przełącznik IT w `LocationSettings.tsx` już jest; usuń tylko dopisek "tylko ekran płytki" (klucz `portal_lang_it_plate_only` albo jego odpowiednik usuń lub zmień). Admin nie ma edycji `active_languages`, więc nic tam nie dodawaj, bo to poza zakresem.

### Treści per język w DB, migracja addytywna (tylko plik, NIE uruchamiać)

Nowy plik, np. `supabase/migrations/20261025000100_italian_content_columns.sql`, z samymi `add column if not exists … text`, nullable i bez default:
- `customer_location_links.title_it`;
- `customer_locations`: `promo_description_it`, `promo_banner_text_it`, `promo_sms_text_it`, `loyalty_card_text_it`, `loyalty_reward_text_it`, `loyalty_banner_text_it`, `wifi_banner_text_it`, `menu_banner_text_it`, `review_banner_text_it` (9 pól; to pełna lista par `_en`/`_de` z migracji).

Jeśli builder znajdzie w kodzie dodatkowe pola z `_de`, na przykład w widokach lub RPC, niech je dopisze. Mój grep po `supabase/migrations` znalazł tylko te 10.

Fallback dla `it`: **it, potem en, potem pl, potem de** (dla linków jeszcze `title`). Turysta częściej zrozumie EN niż PL. Lokale bez włoskich tekstów działają jak dziś, tylko w kolejności zastępczej. Dla istniejących języków kolejność się nie zmienia.

### Pliki do zmiany

Odczyt (klient końcowy):
1. `src/lib/promo-i18n.ts` `getModuleText`: czyta `${field}_it` i dodaje gałąź `if (lang === "it") return it || en || pl || de;`. Z tej funkcji korzystają banery w `LinktreeProfile`, promo, claim i SMS promo.
2. `src/components/linktree/LinktreeProfile.tsx:21-23`, wybór tytułu linku: gałąź `it`.
3. `src/app/l/[slug]/loyalty/page.tsx:32-35`: własny fallback dla `loyalty_card_text` dostaje gałąź `it`. Najprościej zastąpić go wywołaniem `getModuleText(location, lang, "loyalty_card_text")`, bo kolejność dla en/de/pl jest identyczna. Sprawdź to przed zamianą.
4. `src/app/api/promo/send/route.ts:70-72`: SMS idzie w języku odwiedzającego, a przy `it` dostaje `promo_sms_text_it` albo `t("portal_promo_sms_placeholder","it")`. Waliduj `lang` do `PLATE_LANGUAGES`, bo dziś przyjmuje dowolny string. **Długość SMS:** włoski tekst domyślny trzymaj w limicie znaków podobnym do pl/en i bez znaków spoza GSM-7, jeśli pl/en ich unikają. Akcenty à è é ì ò ù są w GSM-7; inne znaki psują segmentację.

Zapis (portal i admin):
5. `src/lib/types.ts`: pola `_it` w `CustomerLocation` i w typie linku (`title_it`).
6. `src/lib/db/locations.ts:221-250` (typ update) i `:279` (`upsertLocationLinks`) dostają pola `_it`.
7. `settings/[subscriptionId]/actions.ts:115-139` (linki: `title_it`) i `:175-199` (banery: `if (b.it !== undefined) updates.<pole>_it = b.it || null`).
8. `[subscriptionId]/promo/actions.ts:92-98` i `[subscriptionId]/loyalty/actions.ts:84-102`: pola `_it`.
9. Edytory w portalu, które czytają `location.*_it` do `LocalizedText` i iterują po `PLATE_LANGUAGES ∩ active_languages`, a nie po `SUPPORTED_LANGUAGES`:
   - `LinktreeSettings.tsx:88-128` z `LinktreeLinksEditor.tsx`;
   - `promo/page.tsx:75-85` z `PromoPreviewEditor.tsx`;
   - `loyalty/page.tsx:76-83` z `LoyaltyPreviewEditor.tsx`.

   `LocalizedText = Record<Language, string>` zmień na klucze `PlateLanguage`. Ukryte inputy `hiddenInputsFor` muszą objąć `it`, inaczej zapis z innej zakładki językowej wyczyści włoski tekst.
10. **`src/app/admin/places/[id]/LocationEditForm.tsx:29-74` to ryzyko utraty danych.** `upsertLocationLinks` robi delete i insert wszystkich linków, więc zapis linków w adminie bez `title_it` skasuje włoskie tytuły ustawione w portalu. Dodaj `title_it` do stanu, inputów i payloadu admina (UI admina jest po polsku, wystarczy kolumna "IT"). Analogicznie sprawdź, czy admin zapisuje banery lub teksty promo, i nie nadpisuj `_it` nullem.

### Tłumaczenia UI (`translations.json` → `it`)

Klucze używane na `/l/*` i w `components/linktree/*` (34, z grepa wywołań `t("…")`):
`back_button check_messages claim_code_btn collect_promo_btn collect_promo_default collect_your_promo consent_required consent_text coupon_already_used coupon_code_label download_app_link email_optional_placeholder leave_review link_expired loyalty_app_prompt loyalty_card_link open_in_app_button opening_app phone_already_claimed portal_linktree_preview_hint portal_loyalty_card_text_placeholder portal_tab_menu portal_tab_wifi portal_wifi_copy portal_wifi_copy_success portal_wifi_qr_title processing promo_sent_sms scan_nfc_for_promo sending show_to_staff something_went_wrong your_promo your_promo_coupon`

Do tego `portal_promo_sms_placeholder` (domyślny SMS). Placeholdery edytorów w portalu w `editLang=it` (`t("portal_…_placeholder", editLang)`) też tłumacz, jeśli są wywoływane z `editLang`, bo właściciel widzi je w zakładce IT jako podpowiedź treści dla klienta. `portal_linktree_preview_hint` to tekst podglądu w portalu, ale na liście jest, bo przechodzi przez komponent linktree.

`consent_text` i `consent_required` to zgoda marketingowa (RODO) przy promo. **Obowiązkowo oznacz je w `italian-review.md` do weryfikacji**, bo tekst zgody ma znaczenie prawne.

### Poza zakresem (bez zmian)

- Panel właściciela po polsku i jego UI w en/de/pl.
- Maile do klientów końcowych: `sendPromoEmail` jest dziś na sztywno po angielsku, `sendReplyNotification` idzie w języku właściciela. Spójność nie wymaga zmian, bo klient końcowy i tak dziś nie dostaje maili w swoim języku. Do backlogu.
- `zh`.

### Testy (dopisać)

- `getModuleText`: `it` zwraca `_it`; przy pustym `_it` wynik to en, potem pl, potem de. Kolejność dla en/de/pl pozostaje bez zmian (regresja).
- Tytuł linku: `it` z fallbackiem.
- Ukryte inputy edytorów: zapis z zakładki `pl` przenosi wartość `_it`. Test czystej funkcji `hiddenInputsFor` (wyciągniętej z komponentu) albo test akcji.
- `promo/send`: nieznany `lang` daje `en`, a `it` daje tekst SMS po włosku.
- Kompletność: każdy klucz z listy 34 i z `portal_promo_sms_placeholder` istnieje w `it`. Rozszerz stałą z testu płytki.
- Strony `/l/*` z `active_languages: ["it"]` dają `it`, nie `en`. Odwróć istniejący test helpera `linktreeLanguages`, jeśli zostaje.
- Bramki: `npx tsc --noEmit`, `npm test`, `npm run build`.

### Git

Dalej `feat/italian`, osobne commity: (1) migracja i typy, (2) odczyt z fallbackiem, (3) zapis w portalu i adminie, (4) tłumaczenia i testy. Bez push i merge. Po zakończeniu handoff do `review-reviewer@starlinkee-v2-conveyor`; w reviewerze wiszą już 2 qitemy dla tej gałęzi, wspomnij o nich. Qitem "domyślny język en" zostaje bez zmian.
