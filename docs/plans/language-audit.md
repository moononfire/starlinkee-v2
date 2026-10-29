# Audyt języków (P2)

## Reguła

| Odbiorca | Język | Helper |
|---|---|---|
| **Gość** (ekran płytki/skanu, mail do zgłaszającego) | cookie gościa (`lang_<płytka>`) → `plate_language` płytki → `en` | `guestLanguage()` |
| **Właściciel** (portal, maile do właściciela/lokalu, Stripe Checkout, maile płatności) | `customers.preferred_language` → `plate_language` → `en` | `ownerLanguage()` |
| Portal (UI) | cookie `lang` z przełącznika → `preferred_language` → `en` | `getPortalLanguage()` |
| Nowy klient | `preferred_language` = język płytki (quick-activate, Stripe), a bez płytki kraj faktury (DE/PL), inaczej `en` | `ownerLanguage()` / `languageFromCountry()` |

Teksty dla właściciela (portal, maile) istnieją tylko po `en/de/pl` (włoski ma 85 z 447 kluczy). Dlatego `ownerLanguage()` nigdy nie zwraca `it`, a płytka włoska → właściciel dostaje `en`. Dodanie `it` do `customers.preferred_language` (typ + constraint w DB) miałoby sens dopiero po przetłumaczeniu portalu i maili — patrz „Lista dla VB”.

## Tabela miejsc

| Miejsce | Do kogo | Było | Jest |
|---|---|---|---|
| `api/admin/plates/quick-activate` | tworzy klienta | `preferred_language: "pl"` na sztywno | `ownerLanguage(null, plate)` (przyczyna „płytka DE, maile PL”) |
| `api/portal/messages` → `sendReplyNotification` | **gość** | język właściciela | `guestLanguage(null, plate)` |
| `api/review/feedback` → `sendFeedbackNotification` | lokal (właściciel) | `preferred_language ?? "en"` | `ownerLanguage(customer, plate)` |
| `api/plate/setup` → `sendPlateSetupConfirmation` | właściciel | `preferred_language ?? plate_language` (bez walidacji) | `ownerLanguage(customer, plate)` |
| `api/portal/setup` → `sendPlateSetupConfirmation` | właściciel | `preferred_language` | `ownerLanguage(customer)` |
| `services/activation` → `sendPlateActivationCode` | właściciel | `preferred_language ?? "en"` | `ownerLanguage(customer)` |
| `api/plate/renew` → Stripe Checkout `locale` | właściciel | `preferred_language` | `ownerLanguage(customer, pierwsza płytka)` |
| `services/stripe` — mail potwierdzenia odnowienia | właściciel | `preferred_language ?? metadata ?? "en"` | `ownerLanguage(customer, metadata)` |
| `services/stripe` — nowy klient z odnowienia | tworzy klienta | `toCustomerLanguage(metadata)` | `ownerLanguage(null, metadata)` |
| `services/stripe` — nowy klient z faktury | tworzy klienta | `countryLanguage` (lokalny ternary) | `languageFromCountry()` |
| `api/signup` | właściciel | `ALLOWED_LANGUAGES` (en/de/pl) → `en` | bez zmian (już spójne) |
| Portal (`app/portal/**`, 13 stron) | właściciel | `getLanguage()` = tylko cookie → `en`; **`preferred_language` w ogóle nie był używany** | `getPortalLanguage()` |
| Ekran płytki / skanu | gość | `getLanguage(plate, plate_language, …)` | bez zmian (już jak `guestLanguage`) |
| `/verify` | niezalogowany | `getLanguage()` | bez zmian (brak klienta) |
| SMS do gościa (`api/portal/messages`) | gość | treść pisze właściciel, brak szablonu | bez zmian |
| Cron `expire-subscriptions` | — | nie wysyła maili | bez zmian |

## Poza zakresem / do decyzji VB

- Język gościa w mailu: dziś `plate_language`. Zapamiętanie języka, w którym gość faktycznie wysłał feedback, wymaga nowej kolumny (np. `reviews.guest_language`) i migracji na prod.
- Włoski dla właściciela: tłumaczenie ~360 kluczy portalu + szablonów maili, potem `it` w typie i constraintcie `customers.preferred_language`.
