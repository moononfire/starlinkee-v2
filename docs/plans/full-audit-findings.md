# P5 — pełny audyt poprawności: findings (review-reviewer, 2026-10-29)

Zakres: skan, oceny, opinie, wątek wiadomości, portal, admin, NFC/mobile API, loyalty, płatności i odnowienia, maile, języki, cron.
Tryb: tylko do odczytu, kod na HEAD `90fa779` (przed P1) + przegląd P1 `65a27fa`. Uruchomione lokalnie: `npm run test:e2e:local` (lokalny Supabase 127.0.0.1:56321) 9/9, unit P1 15/15, `tsc` czysty.
Nie dubluję `docs/security-audit/` (bezpieczeństwo jest tam). Tu są błędy działania, które widzi gość, właściciel albo admin.

Waga: **H** = gość albo właściciel traci dane/pieniądze lub płytka przestaje działać; **M** = zły ekran, zły język albo zła informacja w typowej ścieżce; **L** = przypadek brzegowy, kosmetyka.
Weryfikacja: „kod” = prześledzone w źródle (plik:linia); „e2e” = przejście w przeglądarce Playwright na lokalnym Supabase.

## Podsumowanie

| # | Obszar | Problem | Waga | Pakiet |
|---|---|---|---|---|
| F1 | Opinie | Formularz opinii pokazuje „Dziękujemy” także przy błędzie zapisu | H | naprawczy |
| F2 | Języki | Płytka IT na nowym lokalu wyświetla się po **polsku** | H | P2 |
| F3 | Odnowienia | Odnowienie miesięczne: dzień przerwy w miesiącach 31-dniowych + mail „odnowiono” co miesiąc | H | P4/naprawczy |
| F4 | Odnowienia | Dwa otwarte Checkouty = dwie płatne subskrypcje Stripe | M | P4/naprawczy |
| F5 | Odnowienia | Brak samodzielnej rezygnacji z odnowienia miesięcznego | M | decyzja VB |
| F6 | Portal | E-mail klienta z wielkimi literami: po zalogowaniu portal jest pusty | H | naprawczy |
| F7 | Wiadomości | Odpowiedź gościa w wątku nie wysyła maila do właściciela | M | naprawczy |
| F8 | Oceny | 5★ bez linku Google → szczęśliwy gość widzi „Przykro nam…” i formularz skargi | M | naprawczy |
| F9 | Oceny | Wyścig ocen: dwie karty mogą zapisać 1★ i 5★ (re-roll) | L | naprawczy |
| F10 | Oceny | Ocena niecałkowita / zły JSON → 500 zamiast 400 | L | naprawczy |
| F11 | Linktree | Promo/loyalty/wifi/menu na `/l/<slug>` działają po wygaśnięciu subskrypcji | M | decyzja VB |
| F12 | Wiadomości | Wątki i dane gości idą za płytką, nie za subskrypcją | L | decyzja VB |
| F13 | Admin | Quick-activate i przypisanie płytki nie są atomowe; `assignPlateToSubscription` połyka błąd | M | naprawczy |
| F14 | Portal | Wygasła subskrypcja wygląda w portalu na aktywną do crona (do 24 h), a odnowienie zwraca 403 | L | naprawczy |
| F15 | UI | Brak klucza `processing` → na przycisku widać dosłownie „processing” | L | naprawczy |
| F16 | Maile | Maile nie mają `it`; mail do gościa idzie w języku właściciela | M | P2 |
| F17 | Kod | Nieaktualny komentarz w stronie skanu (ekran odnowienia) | L | przy okazji |

---

## F1 — Formularz opinii ignoruje błąd zapisu (H)
- **Miejsce:** `src/components/plate/FeedbackForm.tsx:23-43`.
- **Scenariusz:** `handleSubmit` nie sprawdza `res.ok`. 400 (np. pusty mail po stronie serwera), 409, 500 (błąd DB) albo brak sieci: gość widzi „Dziękujemy, odezwiemy się”, a skarga nie trafia do bazy ani do właściciela. Przy wyjątku `fetch` (offline) `setLoading(false)` się nie wykona i przycisk zostaje zablokowany na „Wysyłanie…”.
- **Weryfikacja:** kod; `/api/review/feedback` zwraca 400/409/500 (`src/app/api/review/feedback/route.ts:15-35`), a klient wynik pomija.
- **Poprawka:** `try/catch` wokół fetch; przy `!res.ok` (poza 409, gdzie można pokazać „już wysłano”) zostaw formularz z treścią i pokaż błąd (nowy klucz pl/en/de/it). E2e: route mock 500 → widoczny błąd, tekst w textarea zostaje.

## F2 — Płytka IT pokazuje się po polsku (H, P2)
- **Miejsce:** `src/lib/db/locations.ts:132` (`createLocation` zapisuje na sztywno `active_languages: ["pl","en","de"]`, domyślna wartość w DB jest ta sama), `src/lib/language.ts:17-21`.
- **Scenariusz:** płytka `plate_language='it'`, lokal założony przez setup albo quick-activate. Na stronie skanu `getLanguage(plate, 'it', ['pl','en','de'])`: `it` nie jest na liście dozwolonych, więc wynikiem jest **pierwszy dozwolony = `pl`**. Włoski gość widzi ocenę po polsku, dopóki właściciel sam nie włączy IT w portalu. To samo spotka płytkę DE, jeśli właściciel odznaczy DE: fallback idzie na `pl`, a nie na `en`.
- **Weryfikacja:** kod (powyższe linie, `scan/[scanId]/page.tsx:43`).
- **Poprawka:** przy tworzeniu lokalu `active_languages` ma zawierać `plate_language` płytki (np. `[plate_language, 'en', …]` bez duplikatów); w `getLanguage` przy fallbacku spoza listy preferować `en`, jeśli jest dozwolony, zamiast `allowed[0]`. E2e: płytka IT z domyślnym lokalem → tekst po włosku.

## F3 — Odnowienie miesięczne: przerwa i spam „odnowiono” (H)
- **Miejsce:** `src/lib/services/stripe.ts:157-190` (`processRenewalInvoicePaid`, gałąź `renewal_subscription_id`).
- **Scenariusz:** ta gałąź wykonuje się **przy każdej fakturze**, także `subscription_cycle`, bo `phase` jest sprawdzany dopiero niżej. Ustawia `expiration = now + 30 dni` zamiast końca opłaconego okresu (`paidThrough`). Stripe rozlicza miesiąc kalendarzowy, więc w miesiącach 31-dniowych ważność kończy się ~1 dzień przed następną fakturą. `getSubscriptionById` (`src/lib/db/subscriptions.ts:14-24`) od razu przełącza status na `inactive`: płytka pokazuje gościom „niedostępna”, aż przyjdzie następna płatność. Przy nieudanej płatności i ponownych próbach Stripe przerwa trwa kilka dni. Dodatkowo każdy cykl nadpisuje `activation_datetime` i wysyła klientowi oraz adminowi mail „odnowiono”.
- **Weryfikacja:** kod (porównanie z gałęzią `cycle` w l. 197-214, która używa `paidThrough`).
- **Poprawka:** `expiration = paidThrough(invoice) ?? now + durationDays`, plus mały zapas (np. +2 dni na ponowne próby płatności); przy `cycle` nie ruszać `activation_datetime` i nie wysyłać maila klientowi (albo osobny, krótki). Unit test na fakturę z `period.end` 31 dni.

## F4 — Podwójna subskrypcja Stripe przy odnowieniu (M)
- **Miejsce:** `src/app/api/plate/renew/route.ts:27-41`, `stripe.ts:55-91`.
- **Scenariusz:** dopóki subskrypcja jest `inactive`, każdy klik „Odnów” tworzy nową sesję Checkout (ważną 24 h). Właściciel otwiera dwie karty (miesiąc i rok) albo wraca „wstecz” i płaci dwa razy: powstają dwie cykliczne subskrypcje Stripe, obie co okres przedłużają ten sam wiersz. Istniejący wiersz nigdy nie dostaje `stripe_subscription_id`, więc system o duplikacie nie wie.
- **Weryfikacja:** kod.
- **Poprawka:** w webhooku przy `renewal_subscription_id` zapisać `stripe_subscription_id` w wierszu; gdy wiersz ma już inną aktywną subskrypcję Stripe, zalogować i powiadomić admina (albo anulować nową). Opcjonalnie: przy tworzeniu sesji wygasić poprzednią otwartą (`checkout.sessions.expire`).

## F5 — Brak rezygnacji z odnowienia miesięcznego (M, decyzja VB)
- **Miejsce:** brak `billingPortal`/anulowania w kodzie; webhook obsługuje tylko `invoice.payment_succeeded` (`src/app/api/stripe/webhook/route.ts:26`).
- **Scenariusz:** właściciel, który odnowił miesięcznie, nie może sam przestać płacić. Musi pisać na `kontakt@starlinkee.pl`. Ryzyko chargebacków i reklamacji.
- **Poprawka (do decyzji VB):** link do Stripe Customer Portal w portalu (wymaga `stripe_customer_id`/`stripe_subscription_id` przy wierszu, patrz F4).

## F6 — E-mail z wielkimi literami = pusty portal (H)
- **Miejsce:** `src/lib/db/portal.ts:5-13` (`getCustomerByEmail` używa `.eq("email", email)`, czyli porównania z rozróżnianiem wielkości liter), `src/lib/db/customers.ts:31-35,101-108,124-130`, `src/app/admin/customers/new/page.tsx:11`, `stripe.ts:269,171` (adres z faktury bez `toLowerCase`). Kolumna `customers.email` nie ma `unique` ani indeksu na `lower(email)` (`initial_schema.sql:24`).
- **Scenariusz:** admin zakłada klienta „Jan@Firma.pl” albo Stripe dostaje taki adres z Checkoutu. Supabase Auth zapisuje go małymi literami. Po zalogowaniu `getPortalSession` nie znajduje klienta: portal jest pusty i nie da się odnowić. Kolejny zakup tym samym adresem w innej wielkości liter tworzy drugiego klienta.
- **Weryfikacja:** kod. Tylko quick-activate i signup robią `toLowerCase` (`quick-activate/route.ts:23`, `signup/route.ts:76`).
- **Poprawka:** normalizacja `trim().toLowerCase()` we wszystkich zapisach i odczytach (`upsertCustomerByEmail`, `createCustomer`, `updateCustomer`, `getCustomerByEmail`), na odczycie `ilike` z escapowaniem; migracja (tylko plik): odczyt duplikatów `lower(email)`, potem unikalny indeks `lower(email)`. Zapytanie dla VB w „Lista dla VB”.

## F7 — Odpowiedź gościa nie powiadamia właściciela (M)
- **Miejsce:** `src/app/api/review/messages/route.ts:19-42`.
- **Scenariusz:** właściciel odpowiada w portalu, gość dostaje mail z linkiem i odpisuje. Ta odpowiedź idzie tylko jako broadcast Realtime do otwartego portalu. Gdy portal jest zamknięty (zwykle jest), właściciel o niej nie wie. Pierwsza skarga wysyła maila (`feedback/route.ts:26`), kolejne wiadomości już nie.
- **Weryfikacja:** kod. W `email.ts` nie ma funkcji powiadomienia o odpowiedzi gościa.
- **Poprawka:** mail do `location.support_email` przy wiadomości `reporter` (język właściciela, P2), z ograniczeniem np. 1 mail na wątek na 15 min.

## F8 — 5★ bez linku Google → formularz skargi (M)
- **Miejsce:** `src/components/plate/RatingStars.tsx:79-89` (HEAD), `scan/[scanId]/page.tsx:134-138`.
- **Scenariusz:** lokal bez `google_review_link` albo z linkiem spoza allowlisty (patrz D1 w security-audit: takie linki są teraz odrzucane). Gość daje 5★, `redirectToGoogle=true`, ale link jest pusty, więc pokazuje się `FeedbackForm` z „Przykro nam to słyszeć…”. Po P1 ponowny skan pokaże już podziękowanie, ale pierwszy ekran nadal jest zły.
- **Weryfikacja:** kod.
- **Poprawka:** w `RatingStars` przy pozytywnej ocenie bez bezpiecznego linku pokazać ekran podziękowania z P1 (`rated_thanks_text` bez przycisku). E2e: lokal bez linku, 5★ → podziękowanie.

## F9 — Wyścig zapisu oceny (L)
- **Miejsce:** `src/lib/db/reviews.ts:85-110` (najpierw select, potem update bez warunku).
- **Scenariusz:** dwie karty z tym samym `scanId` (albo bfcache) wysyłają 1★ i 5★ równocześnie: obie przechodzą przez sprawdzenie, wygrywa późniejszy zapis, a obie dostają 200. Ochrona przed „przerobieniem” 1★ na 5★ ma lukę.
- **Poprawka:** `update(...).eq("scan_id", id).is("rating", null).select()`; 0 wierszy → 409 (wyjątek TJRUAO bez warunku).

## F10 — Walidacja oceny (L)
- **Miejsce:** `src/app/api/plate/rating/route.ts:5-9`.
- **Scenariusz:** `rating: 4.5` przechodzi walidację, kolumna `integer` odrzuca → 500. Niepoprawny JSON → wyjątek → 500. To samo w `review/feedback`, `review/messages`, `portal/messages` (`await request.json()` bez catch).
- **Poprawka:** `Number.isInteger(rating)` i `request.json().catch(() => null)` → 400.

## F11 — Linktree działa po wygaśnięciu (M, decyzja VB)
- **Miejsce:** `src/lib/db/locations.ts:88-97` (`getLocationBySlug` filtruje tylko `has_linktree_access`), strony `src/app/l/[slug]/*`, `api/mobile/loyalty/*`.
- **Scenariusz:** po wygaśnięciu subskrypcji ocena jest zablokowana (strona skanu przekierowuje na ekran nieaktywny), ale linktree, promo (SMS/mail kosztują: `sms-quota`), loyalty, wifi i menu działają dalej bez opłaty. `/l/<slug>/review` przy nieaktywnej subskrypcji przekierowuje na `/plate/<nr>/<secret>`, więc ujawnia sekret płytki każdemu, kto zna slug.
- **Poprawka (VB):** zdecydować, czy linktree ma gasnąć razem z subskrypcją; jeśli tak, wspólny warunek `status === 'active'` w `getLocationBySlug` dla stron publicznych i w API mobilnym. Ekran nieaktywny dla `/l/*/review` bez przekierowania na URL z sekretem.

## F12 — Wątki idą za płytką (L, decyzja VB)
- **Miejsce:** `src/app/api/portal/messages/route.ts:99-123`, `src/lib/db/review-messages.ts:82-90`, `src/lib/db/portal.ts:38-62`.
- **Scenariusz:** właściciela i wątki ustala się przez **obecną** `plates.subscription_id`. Gdy płytka przechodzi na nową subskrypcję (odnowienie z `renewal_plate_id`, ponowne przypisanie innemu klientowi), stare opinie, maile i telefony gości pokazują się pod nową subskrypcją, czyli potencjalnie innemu klientowi, a znikają ze starej.
- **Poprawka (VB):** zapisywać `subscription_id` w `reviews` przy tworzeniu skanu i po nim filtrować.

## F13 — Admin: operacje nieatomowe, połknięty błąd (M)
- **Miejsce:** `src/lib/db/plates.ts:50-59` (`assignPlateToSubscription` nie sprawdza `error`), `src/app/admin/plates/assign/page.tsx:7-17`, `src/app/api/admin/plates/quick-activate/route.ts:70-131`.
- **Scenariusz:** (a) przypisanie płytki zawiedzie po cichu (np. nieistniejące id), a `issueActivationCode` i tak wyśle klientowi kod do płytki, której nie ma. (b) Akcja assign nie sprawdza, czy płytka jest nadal wolna (nieaktualny formularz albo dwa okna nadpiszą przypisanie). (c) Quick-activate: błąd po `assignPlateToSubscription` (np. `createLocation`) zostawia płytkę przypiętą do subskrypcji `pending`, a ponowna próba zwraca „Plate is already assigned”. Ręczne sprzątanie w DB.
- **Poprawka:** sprawdzać `error`; przypisanie warunkowe `.is("subscription_id", null)` z wynikiem; w quick-activate przypisanie płytki na końcu albo cofnięcie przy błędzie.

## F14 — Portal nie widzi wygaśnięcia do crona (L)
- **Miejsce:** `src/lib/db/portal.ts:20-36` (bez leniwego wygaszania), `src/app/api/plate/renew/route.ts:27-29`.
- **Scenariusz:** po `expiration_datetime`, a przed cronem 03:00, portal pokazuje subskrypcję jako aktywną (data w przeszłości). Odnowienie zwraca 403, choć płytka dla gości jest już wyłączona, gdy ktoś ją zeskanował.
- **Poprawka:** w `getCustomerSubscriptions` traktować `active` z przeszłą datą jako `inactive` (jak `getSubscriptionById`).

## F15 — Brak klucza tłumaczenia `processing` (L)
- **Miejsce:** `src/app/verify/VerifyClient.tsx:304`, `src/app/l/[slug]/promo/claim/[token]/ClaimClient.tsx:82`. Klucza nie ma w żadnym języku, `t()` zwraca sam klucz. Dodatkowo `pl` nie ma `setup_plate_header`.
- **Poprawka:** dodać klucze pl/en/de (+it, jeśli ekran jest dla gościa).

## F16 — Maile bez `it`, mail do gościa w języku właściciela (M, P2)
- **Miejsce:** `src/lib/email.ts:3,156` (`Lang = en|de|pl`), `src/app/api/portal/messages/route.ts:53`, `src/app/api/review/feedback/route.ts:111`.
- **Scenariusz:** włoski gość dostaje odpowiedź właściciela po polsku albo angielsku. Mieści się w P2, tu tylko potwierdzam.

## F17 — Nieaktualny komentarz (L)
- `src/app/plate/[number]/scan/[scanId]/page.tsx:30-32` mówi o „ekranie odnowienia z linkiem płatności”, którego od `4e087ff` nie ma.

## Sprawdzone, bez zastrzeżeń
- Przepływ skanu: sekret (`safeEqual`), `_did` w proxy, deduplikacja 10 min, wyjątek TJRUAO, bfcache reload, przekierowanie nieaktywnej subskrypcji.
- P1 (`65a27fa`): reguła `isPositiveRating` wspólna dla API i strony, e2e 5★/1★ przy ponownym skanie zielone.
- Setup płytki: kod aktywacyjny + limity; lokal przez upsert, więc ponowienie po częściowym błędzie działa.
- Webhook Stripe: idempotencja zdarzeń i faktur, ścieżka `subscription_create` z www, cykle www (`paidThrough`).
- Cron: fail-closed, `deactivateExpiredSubscriptions` + sprzątanie limitów; harmonogram w `vercel.json` (03:00 UTC).
- NFC `assign-nfc`: atomowe przypisanie, okno 15 min na ponowienie. Loyalty: token skanu jednorazowy, cooldown 12 h, kod odbioru z oknem 15 min.
