# Starlinkee v2 — Plan Przepisania Projektu

## Co to jest

Starlinkee to SaaS B2B dla lokali gastronomicznych. Klient kupuje fizyczną płytkę NFC/QR, kładzie ją na stole. Gość restauracji skanuje smartfonem → trafia na stronę oceny Google lub zostawia feedback bezpośrednio do właściciela.

**Obecny stack:** PHP 8.x (własny MVC) + MySQL + serwer shared hosting  
**Nowy stack:** Next.js 16 + TypeScript + Supabase (PostgreSQL + Storage) + Vercel

---

## Stack decyzje

| Obszar | Rozwiązanie | Powód |
|--------|-------------|-------|
| Framework | Next.js 16, App Router | — |
| Baza danych | Supabase (PostgreSQL) | schema już wgrana |
| Auth (admin) | Supabase Auth | zastępuje `$_SESSION` admina |
| Auth (loyalty OTP) | `iron-session` (httpOnly cookie) | lekki, bez zewnętrznego serwisu |
| File storage | Supabase Storage (bucket `logos`) | zastępuje filesystem serwera |
| Email | Resend | zastępuje PHP `mail()` |
| SMS | httpsms.com API | bez zmian |
| Płatności | Stripe (webhooks) | bez zmian |
| Migracje DB | Supabase CLI (`npx supabase db push`) | pliki w `supabase/migrations/` |
| Deployment | Vercel | — |
| Auth middleware | Edge Middleware (`middleware.ts`) | działa na edge — zero cold startu, odpowiedź natychmiastowa; chroni `/admin/*` bez uruchamiania pełnej funkcji Node.js |

---

## Struktura katalogów (docelowa)

```
src/
├── app/
│   ├── plate/[number]/[secret]/        ← skanowanie płytki
│   │   └── page.tsx
│   ├── plate/[number]/scan/[scanId]/   ← strona oceny
│   │   └── page.tsx
│   ├── l/[slug]/                       ← linktree lokalu
│   │   ├── page.tsx
│   │   ├── promo/
│   │   │   ├── page.tsx
│   │   │   └── claim/[token]/page.tsx
│   │   └── loyalty/
│   │       └── page.tsx
│   ├── admin/                          ← panel admina (chroniony)
│   │   ├── layout.tsx                  ← middleware auth check
│   │   ├── dashboard/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── plates/page.tsx
│   │   └── subscriptions/page.tsx
│   ├── login/page.tsx
│   └── api/
│       ├── plate/
│       │   ├── setup/route.ts          ← POST setup płytki
│       │   └── rating/route.ts         ← POST ocena
│       ├── review/
│       │   └── feedback/route.ts       ← POST feedback
│       ├── loyalty/
│       │   ├── request-otp/route.ts
│       │   ├── verify-otp/route.ts
│       │   ├── collect/route.ts
│       │   └── claim/route.ts
│       ├── promo/
│       │   ├── send/route.ts
│       │   └── activate/route.ts
│       └── stripe/
│           └── webhook/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   ← browser client
│   │   ├── server.ts                   ← server client (cookies)
│   │   └── admin.ts                    ← service role client
│   ├── db/                             ← funkcje dostępu do bazy
│   │   ├── plates.ts
│   │   ├── subscriptions.ts
│   │   ├── customers.ts
│   │   ├── locations.ts
│   │   ├── reviews.ts
│   │   ├── loyalty.ts
│   │   ├── leads.ts
│   │   └── orders.ts
│   ├── services/                       ← logika biznesowa
│   │   ├── plate.ts
│   │   ├── review.ts
│   │   ├── loyalty.ts
│   │   ├── promo.ts
│   │   └── stripe.ts
│   ├── email.ts                        ← Resend
│   ├── sms.ts                          ← httpsms.com
│   ├── storage.ts                      ← Supabase Storage (logo upload)
│   └── translations.ts                 ← translations.json loader
├── components/
│   ├── plate/
│   │   ├── RatingStars.tsx
│   │   ├── FeedbackForm.tsx
│   │   └── PlateSetupForm.tsx
│   ├── linktree/
│   │   ├── LinktreeProfile.tsx
│   │   ├── LoyaltyCard.tsx
│   │   └── PromoForm.tsx
│   └── admin/
│       └── ...
└── middleware.ts                        ← ochrona /admin/* routów
supabase/
├── config.toml
└── migrations/
    └── 20260607000000_initial_schema.sql  ✅ DONE
```

---

## Zmienne środowiskowe

Plik `.env.local` (nie commitować):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_1_YEAR_SUB=price_1PyFyjHqQ7RAMwElWtGmSucN

# SMS (httpsms.com)
HTTPSMS_API_KEY=
HTTPSMS_SENDER_NUMBER=
HTTPSMS_SENDER_NUMBER_PL=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_ADMIN=

# App
NEXT_PUBLIC_APP_URL=
ADMIN_EMAIL_FOR_PLATE_IMPORT=vikbobinski@gmail.com

# iron-session
SESSION_SECRET=          # min. 32 znaki, random string
```

---

## Ważne reguły biznesowe (z kodu PHP)

- **Stripe Price ID:** `price_1PyFyjHqQ7RAMwElWtGmSucN` (w DOCU.md jest błędny — ten z kodu jest poprawny)
- **Zamówienie:** tworzone od razu ze statusem `paid` + `fulfilled_at = NOW()` (nie `pending`)
- **Setup token:** `bin2hex(random_bytes(16))` → w cookie/session, walidowany przy POST setupu
- **Scan ID:** `crypto.randomUUID()` (zastąpiony z PHP `uniqid()`)
- **Secret key walidacja:** strict `===` porównanie MD5 hash z URL vs. DB
- **Ocena <= 3:** pokazuje formularz feedbacku; **>= 4:** redirect do Google
- **Pieczątka:** cooldown 12h (43200s) od `last_stamp_at`; 10 pieczątek = nagroda + reset do 0
- **OTP:** 4 cyfry, ważny 3 min; tabela `loyalty_otp` ma PK na `(location_id, phone)` → upsert nadpisuje stary kod
- **Promo lead:** jeden telefon może pobrać promocję tylko raz per lokal
- **Logo upload:** typy `image/png`, `image/jpeg`; max 5MB → Supabase Storage bucket `logos`
- **Subskrypcja pending:** `activation_datetime` i `expiration_datetime` są NULL do czasu setupu płytki przez właściciela

---

## Fazy i zadania

### FAZA 0 — Fundament ✅ CZĘŚCIOWO DONE

- [x] Next.js 16 projekt założony
- [x] Supabase CLI zainstalowany (`npx supabase`)
- [x] Pakiety: `@supabase/supabase-js`, `@supabase/ssr`
- [x] Schema bazy danych — migracja wgrana na Supabase
- [ ] `.env.local` uzupełniony (wymaga danych od użytkownika)
- [x] `.env.local.example` stworzony
- [x] Supabase klienty: `lib/supabase/client.ts`, `server.ts`, `admin.ts`
- [x] `iron-session` zainstalowany i skonfigurowany (`lib/session.ts`)
- [x] Resend zainstalowany (`lib/email.ts`)
- [x] `lib/sms.ts` — wrapper httpsms.com
- [x] `lib/storage.ts` — Supabase Storage upload
- [x] `lib/translations.ts` + `translations.json` skopiowany
- [x] `src/middleware.ts` — ochrona `/admin/*`
- [x] `supabase/migrations/` workflow udokumentowany

---

### FAZA 1 — Flow skanowania płytki (core feature)

To jest 80% wartości produktu. Gość skanuje QR/NFC → ocena → feedback → Google.

#### 1.1 Middleware i routing podstawowy
- [x] `middleware.ts` — ochrona `/admin/*` (sprawdza Supabase Auth session); działa jako **Edge Middleware** na Vercel — wykonuje się na CDN edge node, nie na serwerze Node.js, więc brak cold startu i natychmiastowy redirect niezalogowanych użytkowników
- [x] `lib/supabase/server.ts` — server-side Supabase client z cookies
- [x] `lib/supabase/admin.ts` — service role client (do webhooków i server actions)

#### 1.2 Dostęp do bazy — płytki
- [x] `lib/db/plates.ts`
  - `getPlateByNumber(plateNumber)` → `Plate | null`
  - `incrementPlateVisits(plateId)`
  - `plateExists(plateNumber)` → `bool`
  - `assignPlateToSubscription(plateId, subscriptionId)`
  - `insertPlatesBatch(plates[])`

#### 1.3 Dostęp do bazy — lokalizacje i subskrypcje
- [x] `lib/db/subscriptions.ts`
  - `getSubscriptionById(id)` → `Subscription | null`
  - `setSubscriptionActive(id, activationDate, expirationDate)`
  - `createSubscription(data)` → `Subscription`
- [x] `lib/db/locations.ts`
  - `getLocationBySubscriptionId(subscriptionId)` → `CustomerLocation | null`
  - `createLocation(data)` → `CustomerLocation`
  - `getLocationBySlug(slug)` → `CustomerLocation | null`
  - `incrementLinktreeVisits(locationId)`

#### 1.4 Flow skanowania — strona płytki
- [x] `app/plate/[number]/[secret]/page.tsx`
  - Server Component
  - Pobiera płytkę z DB → weryfikuje `secret` vs `secret_key` (strict ===)
  - **CASE inactive / brak subskrypcji:** renderuje stronę błędu (tłumaczenia)
  - **CASE pending:** renderuje `PlateSetupForm` (secret przekazany jako prop, re-weryfikowany w API)
  - **CASE active:** tworzy scan record → redirect do `/plate/[number]/scan/[scanId]`

#### 1.5 Rejestracja skanu
- [x] `lib/db/reviews.ts`
  - `createScanRecord(plateId)` → `scanId` (używa `crypto.randomUUID()`)
  - `getReviewByScanId(scanId)` → `Review | null`
  - `updateRating(scanId, rating)` — guard: rating IS NULL check
  - `updateFeedback(scanId, data)`
- [x] `lib/types.ts` — typy: `Plate`, `Subscription`, `CustomerLocation`, `Review`, `LoyaltyCard`, `LocationLead`

#### 1.6 Strona oceny
- [x] `app/plate/[number]/scan/[scanId]/page.tsx`
  - Weryfikacja scanId + plate_id match
  - Pobiera lokalizację (logo, google_review_link)
  - `incrementPlateVisits` (fire and forget)
  - Renderuje logo + `RatingStars`
- [x] `components/plate/RatingStars.tsx` — klient, POST do API po kliknięciu, pokazuje `FeedbackForm` gdy <= 3

#### 1.7 API: ocena i feedback
- [x] `app/api/plate/rating/route.ts` — POST `{ scanId, rating }`
  - Zapisuje rating, zwraca `{ redirectToGoogle: bool }`
- [x] `app/api/review/feedback/route.ts` — POST `{ scanId, message, name?, email?, phone? }`
  - Zapisuje feedback, wysyła email do `support_email` lokalu (Resend, non-blocking)
- [x] `components/plate/FeedbackForm.tsx` — pokazywany gdy rating <= 3

#### 1.8 Setup płytki (pending → active)
- [x] `lib/storage.ts` — upload logo do Supabase Storage bucket `logos`
  - `uploadLogo(file)` → `{ path, publicUrl }`
  - Walidacja: tylko `image/png`, `image/jpeg`, max 5MB, UUID filename
- [x] `app/api/plate/setup/route.ts` — POST multipart/form-data
  - Re-weryfikacja plateNumber + plateSecret (brak CSRF dzięki re-verify)
  - Upload logo → Supabase Storage (opcjonalny)
  - INSERT do `customer_locations`
  - UPDATE `subscriptions` → status `active`, `activation_datetime`, `expiration_datetime`
  - Email do właściciela (Resend, non-blocking)
- [x] `components/plate/PlateSetupForm.tsx` — formularz: nazwa, adres Google, link do recenzji, support email, logo
- [x] Migracja `20260607000001_utility_functions.sql` — funkcje `increment_plate_visits`, `increment_linktree_visits`

#### 1.9 Tłumaczenia
- [x] `src/lib/translations.json` skopiowany z PHP projektu (en/de/pl)
- [x] `lib/translations.ts` — `t(key, language)` z fallbackiem na `en`
- [x] Poprawka: użycie klucza `plate_inactive_exception` zamiast nieistniejącego `plate_inactive_message`

---

### FAZA 2 — Linktree

Strona lokalu dostępna pod `/l/[slug]` — logo, linki, promo baner, loyalty button.

- [x] `app/l/[slug]/page.tsx`
  - Pobiera lokalizację po `linktree_slug` WHERE `has_linktree_access = true`
  - Pobiera `customer_location_links` dla tej lokalizacji
  - `incrementLinktreeVisits(locationId)`
  - Renderuje: logo, nazwa lokalu, lista linków, baner promo (jeśli `has_promo_enabled`), button loyalty (jeśli `has_loyalty_enabled`)
- [x] `components/linktree/LinktreeProfile.tsx`

---

### FAZA 3 — Program Lojalnościowy

OTP przez SMS → zbieranie pieczątek → nagroda.

#### 3.1 Baza danych
- [x] `lib/db/loyalty.ts`
  - `getLoyaltyCard(locationId, phone)` → `LoyaltyCard | null`
  - `createLoyaltyCard(locationId, phone)` → `LoyaltyCard`
  - `incrementStamp(cardId)` + aktualizacja `last_stamp_at`
  - `resetLoyaltyCard(cardId)` → stamps_count = 0
  - `upsertOtp(locationId, phone, code, expiresAt)` — upsert (PK conflict)
  - `getOtp(locationId, phone)` → `LoyaltyOtp | null`
  - `deleteOtp(locationId, phone)`

#### 3.2 Session (iron-session)
- [x] `lib/session.ts` — iron-session config; zapisuje `{ phone, locationId }` w httpOnly cookie
  - `getLoyaltySession()` → iron-session object
  - `setLoyaltySession(phone, locationId)`
  - `clearLoyaltySession()`

#### 3.3 API
- [x] `app/api/loyalty/request-otp/route.ts` — POST `{ phone, slug }`
  - Generuje 4-cyfrowy kod, zapisuje do `loyalty_otp` (upsert), wysyła SMS
- [x] `app/api/loyalty/verify-otp/route.ts` — POST `{ phone, code, slug }`
  - Pobiera OTP, sprawdza `expires_at`, `timingSafeEqual` porównanie
  - Usuwa OTP, ustawia iron-session cookie
- [x] `app/api/loyalty/collect/route.ts` — POST (wymaga session)
  - Cooldown check: `last_stamp_at` < 12h → error z info ile zostało
  - Brak karty → utwórz z stamps=1
  - stamps >= 10 → zwróć `{ stamps: 10, reward_ready: true }` (czeka na claim)
  - Normalnie → inkrementuj
- [x] `app/api/loyalty/claim/route.ts` — POST (wymaga session)
  - Sprawdza stamps >= 10 → reset karty → zwraca potwierdzenie

#### 3.4 UI
- [x] `app/l/[slug]/loyalty/page.tsx` — strona loyalty
- [x] `components/linktree/LoyaltyCard.tsx` — wizualizacja pieczątek (10 kółek)

---

### FAZA 4 — Promocje (Squeeze Page)

- [x] `lib/db/leads.ts`
  - `checkLeadExists(locationId, phone)` → `bool`
  - `createLead(locationId, phone, email?, agreedToTerms, claimToken)`
  - `getLeadByToken(token)` → `Lead | null`
  - `markLeadAsUsed(leadId)`

- [x] `app/l/[slug]/promo/page.tsx` — formularz: telefon, email (opcjonalny), zgoda
- [x] `app/api/promo/send/route.ts` — POST `{ phone, email?, agreed, slug }`
  - Sprawdza `has_promo_enabled`
  - Sprawdza duplikat telefonu per lokal
  - Generuje `claimToken = crypto.randomUUID()`
  - Zapisuje lead, wysyła SMS z linkiem + opcjonalnie email
- [x] `app/l/[slug]/promo/claim/[token]/page.tsx`
  - Waliduje token, pokazuje kupon lub "już wykorzystany"
- [x] `app/api/promo/activate/route.ts` — POST `{ token }`
  - Oznacza lead jako użyty (`is_used = true`, `used_at = NOW()`)
- [x] `components/linktree/PromoForm.tsx`

---

### FAZA 5 — Stripe Webhook ✅ DONE

- [x] `app/api/stripe/webhook/route.ts`
  - Weryfikacja podpisu: `stripe.webhooks.constructEvent(body, sig, secret)`
  - Event `invoice.payment_succeeded`:
    1. Utwórz/zaktualizuj `customers` (dane z Stripe session)
    2. Utwórz `orders` ze statusem `paid`, `fulfilled_at = NOW()`
    3. Utwórz `order_items` (subscription + plate)
    4. Utwórz `subscriptions` ze statusem `pending` (NULL daty)
    5. Utwórz `shipments`
    6. Wyślij email z potwierdzeniem zamówienia do admina (Resend)
  - Zwróć `200` natychmiast (używa `after()` z Next.js 16)
- [x] `lib/services/stripe.ts` — mapowanie Stripe invoice → modele DB
- [x] `lib/db/customers.ts` — `upsertCustomerByEmail`
- [x] `lib/db/orders.ts` — `createOrder`, `createOrderItem`, `createShipment`
- Uwaga: Stripe SDK v22 zmienił API — `payment_intent` nie jest top-level polem Invoice; price ID jest w `line.pricing.price_details.price` zamiast `line.price.id`

---

### FAZA 6 — Panel Admina

Chroniony przez Supabase Auth (email + hasło).

#### 6.1 Auth
- [x] `middleware.ts` — sprawdza Supabase session dla `/admin/*`; redirect → `/login`
- [x] `app/login/page.tsx` + `LoginForm.tsx` — formularz logowania
- [x] Server Action logowania — `supabase.auth.signInWithPassword()` (`app/login/actions.ts`)
- [x] `app/admin/layout.tsx` + `AdminNav.tsx` — weryfikacja sessji po stronie serwera, nawigacja

#### 6.2 Dashboard
- [x] `app/admin/dashboard/page.tsx` — liczba klientów, aktywnych subskrypcji, zamówień

#### 6.3 Klienci
- [x] `app/admin/customers/page.tsx` — lista + wyszukiwanie (URL search params)
- [x] `app/admin/customers/new/page.tsx` — formularz dodania klienta; email do klienta (Resend, non-blocking)

#### 6.4 Zamówienia
- [x] `app/admin/orders/page.tsx` — lista zamówień
- [x] `app/admin/orders/new/page.tsx` — formularz: order → order_items → subscription → przypisanie płytek

#### 6.5 Płytki
- [x] `app/admin/plates/page.tsx` — lista płytek + wyszukiwanie
- [x] `app/admin/plates/import/page.tsx` — import z pliku TXT (`ABCDEF,de`); secret_key = randomBytes(16).hex; email z linkami
- [x] `app/admin/plates/generate/page.tsx` — generator N unikalnych kodów 6xA-Z; pobieranie TXT przez `GET /api/admin/plates/generate`
- [x] `app/admin/plates/assign/page.tsx` — przypisanie nieprzypisanej płytki do pending subskrypcji

#### 6.6 Subskrypcje
- [x] `app/admin/subscriptions/page.tsx` — lista z statusami
- [ ] Wysyłka raportów subskrypcji — `/admin/subscriptions/reports`

---

### FAZA 7 — Email (Resend) i SMS (httpsms) ✅ DONE

- [x] `lib/email.ts` — wrapper Resend (lazy init, nie crashuje przy braku klucza w build)
  - [x] `sendOrderConfirmationToAdmin(data)`
  - [x] `sendCustomerRegistration(to, language, data)`
  - [x] `sendPlateSetupConfirmation(to, language, data)`
  - [x] `sendFeedbackNotification(to, data)` — do support_email lokalu
  - [x] `sendPromoEmail(to, data)` — opcjonalny email z kuponem
  - [x] `sendPlateImportLinks(data)` — email z linkami po imporcie płytek
  - [x] Szablony HTML z inline styles (kompatybilne z klientami pocztowymi)
  - [x] Lokalizacja en/de/pl dla emaili do klientów (`sendCustomerRegistration`, `sendPlateSetupConfirmation`)

- [x] `lib/sms.ts` — wrapper httpsms.com
  - [x] `sendSms(phone, message)`
  - [x] Routing: numery `+48` → `HTTPSMS_SENDER_NUMBER_PL`

---

### FAZA 8 — Supabase Storage (logo) ✅ DONE

- [x] Bucket `logos` tworzony przez migrację `20260607000002_storage_logos_bucket.sql`
- [x] Migracja: policy RLS — public read, service_role write/update/delete
- [x] `lib/storage.ts`
  - [x] `uploadLogo(file: File)` → `{ path, publicUrl }`
  - [x] Walidacja MIME: `image/png`, `image/jpeg`
  - [x] Walidacja rozmiaru: max 5MB
  - [x] Nazwa pliku: `${crypto.randomUUID()}.ext`

---

### FAZA 9 — Deploy na Vercel

- [x] `vercel.json` — framework nextjs, region cdg1, no-store header dla /api/stripe/webhook
- [ ] Zainstalować Vercel CLI: `npm i -g vercel`
- [ ] `vercel link` — połączyć repo z projektem Vercel
- [ ] `vercel env add` (lub `vercel env pull`) — wgrać wszystkie zmienne z `.env.local`
- [ ] `vercel deploy --prod` — deploy produkcyjny
- [ ] Skonfigurować Stripe webhook URL → `https://[domena]/api/stripe/webhook`
- [ ] `npx supabase db push` — wgrać migracje (w tym `20260607000002_storage_logos_bucket.sql`)
- [ ] Test end-to-end wszystkich flows
- [ ] Skonfigurować domenę w Vercel Dashboard

---

## Śledzenie postępu

| Faza | Opis | Status |
|------|------|--------|
| 0 | Fundament | ✅ Done (czeka na `.env.local`) |
| 1 | Flow skanowania płytki | ✅ Done |
| 2 | Linktree | ✅ Done |
| 3 | Program lojalnościowy | ✅ Done |
| 4 | Promocje | ✅ Done |
| 5 | Stripe webhook | ✅ Done |
| 6 | Panel admina | ✅ Done (raporty subskrypcji pominięte) |
| 7 | Email + SMS | ✅ Done |
| 8 | Supabase Storage | ✅ Done (migracja gotowa, push przed deployem) |
| 9 | Deploy Vercel | 🟡 W toku (vercel.json gotowy, kroki manualne pozostały) |

**Legenda:** ✅ Done · 🟡 W toku · ⬜ Nie started · ❌ Blokada

---

## Kolejność implementacji (dlaczego taka)

1. **Faza 0 → 1** — bez flow skanowania produkt nie istnieje; to też największe ryzyko techniczne (setup płytki, upload logo, tłumaczenia)
2. **Faza 2 → 4** — publiczne flow user-facing; możliwe do testowania bez admina
3. **Faza 5** — Stripe webhook niezależny od reszty UI; musi działać zanim pójdzie produkcja
4. **Faza 6** — admin potrzebny do zarządzania, ale nie blokuje testowania
5. **Faza 7 → 8** — integracje zewnętrzne, testowalne z mockami wcześniej
6. **Faza 9** — na końcu po pełnych testach

---

## Nowe migracje DB

Każda zmiana schematu = nowy plik migracji:

```bash
npx supabase migration new nazwa_zmiany
# → tworzy supabase/migrations/TIMESTAMP_nazwa_zmiany.sql
# edytuj plik z SQL
npx supabase db push
```
