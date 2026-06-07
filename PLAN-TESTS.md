# Starlinkee v2 — Plan Testów

## Co już mamy

| Warstwa | Narzędzie | Pliki | Pokrycie |
|---------|-----------|-------|----------|
| Unit | Vitest (node) | `src/__tests__/unit/` | `lib/` helpers, `lib/db/` (mocki Supabase) |
| Integration | Vitest (node) | `src/__tests__/integration/api/` | Route handlery przez bezpośrednie wywołanie funkcji, mocki Supabase/Resend/SMS |
| E2E (przeglądarka) | — | — | brak |

Testy unit/integration uruchamiane przez `npm test`. Środowisko: `node` (bez przeglądarki). Mocki przez `vi.mock` + `vi.hoisted`.

---

## Co brakuje — testy brakujące w unit/integration

### Unit

| Plik | Co przetestować |
|------|----------------|
| `lib/db/subscriptions.ts` | `getSubscriptionById`, `setSubscriptionActive`, `createSubscription` — mocki Supabase |
| `lib/db/locations.ts` | `getLocationBySubscriptionId`, `createLocation`, `getLocationBySlug`, `incrementLinktreeVisits` |
| `lib/db/customers.ts` | `upsertCustomerByEmail` — gdy email istnieje (zwraca ID), gdy nie istnieje (INSERT) |
| `lib/db/orders.ts` | `createOrder`, `createOrderItem`, `createShipment` |
| `lib/services/stripe.ts` | `processInvoicePaymentSucceeded` — happy path, brak emaila klienta, nieznany priceId |
| `lib/email.ts` | Każda funkcja send* — że Resend.send() dostaje właściwe `to`/`subject` |
| `lib/session.ts` | `getLoyaltySession`, `setLoyaltySession`, `clearLoyaltySession` |

### Integration (brakujące route handlery)

| Route | Co przetestować |
|-------|----------------|
| `POST /api/stripe/webhook` | Brak nagłówka `stripe-signature` → 400; zły podpis → 400; nieznany event → 200; `invoice.payment_succeeded` → 200 + wywołanie processInvoice |
| `GET /plate/[number]/[secret]` | Server component — trudniejszy w Vitest, rozważyć pominięcie na rzecz E2E |
| `GET /l/[slug]` | j.w. |

---

## Testy E2E — Playwright

### Dlaczego warto

Testy unit/integration pokrywają logikę API (z mockami). E2E pokrywa:
- Renderowanie Server Components (Next.js)
- Nawigację między stronami
- Interakcje JS w przeglądarce (kliknięcie gwiazdki, submit formularza)
- Cały złożony flow użytkownika end-to-end

### Instalacja (gdy gotowi)

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Nowy plik konfiguracji: `playwright.config.ts`
Testy w katalogu: `e2e/`

### Scenariusze do przetestowania

---

#### FLOW 1 — Skanowanie płytki (aktywna)

```
Warunek wstępny: płytka TESTXX z aktywną subskrypcją w DB testowej

1. Otwórz /plate/TESTXX/<secret>
2. Sprawdź redirect → /plate/TESTXX/scan/<scanId>
3. Sprawdź: widoczne logo lokalu
4. Sprawdź: widoczne 5 gwiazdek (RatingStars)
```

**Przypadek: rating >= 4**
```
5. Kliknij 4. gwiazdkę
6. Sprawdź: redirect do google_review_link (lub nowa karta z URL Google)
```

**Przypadek: rating <= 3**
```
5. Kliknij 2. gwiazdkę
6. Sprawdź: pojawia się FeedbackForm
7. Wypełnij pole "wiadomość"
8. Kliknij "Wyślij"
9. Sprawdź: komunikat sukcesu
```

---

#### FLOW 2 — Skanowanie płytki (pending — setup)

```
Warunek wstępny: płytka SETPLT z subskrypcją status=pending

1. Otwórz /plate/SETPLT/<secret>
2. Sprawdź: widoczny formularz PlateSetupForm
3. Wypełnij: nazwa lokalu, link Google, email wsparcia
4. Kliknij "Zapisz"
5. Sprawdź: komunikat sukcesu / redirect
```

---

#### FLOW 3 — Skanowanie płytki (nieaktywna / błędny secret)

```
1. Otwórz /plate/TESTXX/bledsecret
2. Sprawdź: strona błędu (komunikat z tłumaczeń)

1. Otwórz /plate/NIEIST/bledny
2. Sprawdź: strona 404 / błędu
```

---

#### FLOW 4 — Linktree lokalu

```
Warunek wstępny: lokal ze slug="test-lokal" i has_linktree_access=true

1. Otwórz /l/test-lokal
2. Sprawdź: widoczne logo, nazwa lokalu
3. Sprawdź: widoczna lista linków
4. (jeśli has_promo_enabled) Sprawdź: widoczny baner promo z linkiem
5. (jeśli has_loyalty_enabled) Sprawdź: widoczny przycisk "Zbieraj pieczątki"
6. Kliknij link z listy — sprawdź otwarcie URL
```

---

#### FLOW 5 — Program Lojalnościowy

```
Warunek wstępny: lokal z has_loyalty_enabled=true

1. Otwórz /l/test-lokal/loyalty
2. Sprawdź: widoczny formularz telefonu
3. Wpisz numer telefonu, kliknij "Wyślij kod"
4. Sprawdź: pojawia się pole na OTP
   (test może mockować SMS lub używać pre-seeded OTP)
5. Wpisz poprawny OTP
6. Sprawdź: widoczna karta z pieczątkami (LoyaltyCard)
7. Kliknij "Zbierz pieczątkę"
8. Sprawdź: liczba pieczątek wzrosła o 1
```

**Przypadek cooldown:**
```
9. Kliknij ponownie "Zbierz pieczątkę"
10. Sprawdź: komunikat o cooldown (ile czasu pozostało)
```

---

#### FLOW 6 — Promo (squeeze page)

```
Warunek wstępny: lokal z has_promo_enabled=true

1. Otwórz /l/test-lokal/promo
2. Sprawdź: widoczny formularz PromoForm
3. Wypełnij telefon, zaznacz zgodę
4. Kliknij "Pobierz kupon"
5. Sprawdź: komunikat sukcesu

6. Otwórz /l/test-lokal/promo/claim/<token>
7. Sprawdź: widoczny kupon
8. Kliknij "Aktywuj"
9. Sprawdź: komunikat "Kupon wykorzystany"

10. Odśwież stronę claim/<token>
11. Sprawdź: komunikat "już wykorzystany"

12. Wróć do /l/test-lokal/promo, wpisz ten sam telefon
13. Sprawdź: błąd "numer już zarejestrowany"
```

---

### Strategia danych testowych

**Opcja A — Supabase lokalny (zalecana)**
- `npx supabase start` uruchamia lokalną instancję
- Playwright seed: `beforeAll` → INSERT fixture danych przez admin client
- Playwright teardown: `afterAll` → DELETE / TRUNCATE

**Opcja B — Mocki na poziomie MSW**
- `msw` (Mock Service Worker) przechwytuje zapytania Supabase w przeglądarce
- Nie wymaga działającej bazy, ale nie testuje prawdziwego DB layer

**Rekomendacja:** Opcja A dla E2E, Opcja B ewentualnie jako fallback w CI bez Supabase.

---

### Priorytety implementacji

| Priorytet | Scenariusz | Uzasadnienie |
|-----------|-----------|--------------|
| 🔴 1 | Flow 1 (skanowanie + ocena) | Core feature — 80% wartości produktu |
| 🔴 2 | Flow 1 (skanowanie + feedback ≤3) | Druga ścieżka core feature |
| 🟡 3 | Flow 3 (błędny secret / nieaktywna) | Ochrona przed edge cases |
| 🟡 4 | Flow 4 (Linktree) | Publiczny landing page |
| 🟢 5 | Flow 5 (Loyalty) | Złożony, wielokrokowy flow |
| 🟢 6 | Flow 6 (Promo) | Wymaga tokena — nieco trudniejszy seed |
| ⚪ 7 | Flow 2 (Setup płytki) | Rzadki flow, łatwy do przetestowania manualnie |

---

### Struktura plików (docelowa)

```
e2e/
├── fixtures/
│   └── seed.ts              ← helper do INSERT/DELETE danych testowych
├── plate-scan.spec.ts        ← Flow 1, 2, 3
├── linktree.spec.ts          ← Flow 4
├── loyalty.spec.ts           ← Flow 5
└── promo.spec.ts             ← Flow 6
playwright.config.ts
```

---

### Kiedy implementować

E2E ma sens po:
1. ✅ Wdrożeniu na Vercel (potrzebny działający serwer)
2. ✅ Skonfigurowaniu lokalnego Supabase do testów (`supabase start`)
3. ✅ Ukończeniu przynajmniej Fazy 6 (admin panel) — żeby dane testowe dało się tworzyć przez UI lub migracje

Alternatywnie: uruchomić `next dev` przed suite i testować lokalnie już teraz.
