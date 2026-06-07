# Starlinkee — Pełna Dokumentacja Projektu

> Dokument stworzony jako kompletne briefing dla AI, które ma przepisać ten projekt na nowy stack (Next.js + TypeScript + Supabase + Vercel). Zawiera opis każdej funkcji, logiki biznesowej, schematu bazy danych i szczegółów implementacji.

---

## 1. Czym jest Starlinkee

Starlinkee to SaaS B2B dla lokali gastronomicznych i innych biznesów. Klient kupuje fizyczną **płytkę NFC/QR**, którą kładzie na stole lub przy wejściu. Końcowy użytkownik (gość restauracji) skanuje płytkę smartfonem i trafia na stronę z możliwością wystawienia oceny Google lub zostawienia feedback'u bezpośrednio do właściciela.

Produkt obejmuje:
1. System płytek NFC/QR z obsługą subskrypcji
2. Zbieranie ocen i feedbacku od gości
3. Strona-landing dla lokalu (Linktree-like)
4. Program lojalnościowy (cyfrowe pieczątki)
5. System promocji/kuponów (squeeze page)
6. Panel admina do zarządzania klientami, zamówieniami, subskrypcjami, płytkami
7. Integracja Stripe (webhooks)
8. Wysyłka SMS (httpsms.com) i Email (PHP mail)

---

## 2. Obecny Stack Techniczny

- **Język:** PHP 8.x (bez frameworka, własny MVC)
- **Baza danych:** MySQL (nazwa: `m1790_starlinkee_plate_management`)
- **Frontend:** Czysty HTML/CSS/JS w plikach PHP (server-side rendering)
- **Płatności:** Stripe SDK (PHP)
- **SMS:** httpsms.com API
- **Email:** PHP `mail()` (SMTP serwera)
- **Deployment:** GitHub Actions → VPS (serwer shared hosting smallhost.pl)
- **URL produkcji:** `app.googlenfc.smallhost.pl`

---

## 3. Architektura Projektu

```
index.php
    └── Router.php              ← dopasowuje URL do kontrolera
            └── ControllerFactory.php   ← tworzy kontroler z zależnościami
                    └── Controller      ← obsługuje request, wywołuje Service
                            └── Service ← logika biznesowa
                                    └── Repository ← zapytania SQL
```

### Struktura katalogów

```
app/
├── index.php                   ← punkt wejścia
├── Router.php                  ← routing
├── ControllerFactory.php       ← dependency injection
├── autoload.php                ← ładowanie klas
├── controllers/
│   ├── BaseController.php
│   ├── PlateController.php     ← obsługa płytek
│   ├── LinktreeController.php  ← linktree + loyalty + promo
│   ├── ReviewController.php    ← oceny i feedback
│   ├── AuthController.php      ← logowanie admina
│   ├── CustomerController.php  ← zarządzanie klientami
│   ├── OrderController.php     ← zamówienia
│   ├── SubscriptionController.php
│   ├── AdminController.php
│   ├── DashboardController.php
│   ├── ReportController.php
│   ├── ResponseController.php  ← strony błędów/sukcesu
│   ├── StripeWebhookController.php
│   └── SuccessPageController.php
├── services/                   ← logika biznesowa
├── repositories/               ← dostęp do bazy danych
├── models/                     ← obiekty danych
├── views/                      ← szablony HTML (PHP include)
├── config/                     ← konfiguracje (DB, Stripe, email, SMS)
├── resources/
│   └── translations.json       ← tłumaczenia (en, de, pl)
└── css/ js/                    ← statyczne zasoby
```

---

## 4. Baza Danych — Kompletny Schemat

### Tabela: `admins`
```sql
id          INT PRIMARY KEY
username    VARCHAR
password    VARCHAR  -- bcrypt hash
```

### Tabela: `customers`
```sql
customer_id         INT PRIMARY KEY AUTO_INCREMENT
customer_type       ENUM('business', 'individual')
source              VARCHAR  -- np. 'Admin dashboard', 'Stripe'
company_name        VARCHAR  -- tylko dla business
tax_id              VARCHAR  -- NIP/VAT
customer_name       VARCHAR
email               VARCHAR
phone               VARCHAR
billing_address     VARCHAR
preferred_language  ENUM('en', 'de', 'pl')
country             VARCHAR
created_at          DATETIME
updated_at          DATETIME
```

### Tabela: `subscriptions`
```sql
subscription_id     INT PRIMARY KEY AUTO_INCREMENT
customer_id         INT FK → customers
subscription_name   VARCHAR  -- np. '1_WEEK_SUB_FREE', '1_YEAR_SUB'
duration_in_days    INT
is_free             TINYINT(1)
activation_datetime DATETIME  -- NULL gdy status=pending
expiration_datetime DATETIME  -- NULL gdy status=pending
status              ENUM('pending', 'active', 'inactive')
created_at          DATETIME
updated_at          DATETIME
```

**Stany subskrypcji:**
- `pending` — subskrypcja utworzona, płytka jeszcze nie skonfigurowana (setup nie wykonany)
- `active` — płytka skonfigurowana, subskrypcja działa
- `inactive` — subskrypcja wygasła lub wyłączona

### Tabela: `plates`
```sql
plate_id        INT PRIMARY KEY AUTO_INCREMENT
subscription_id INT FK → subscriptions (nullable — płytka nieprzypisana)
plate_number    VARCHAR(6)  -- 6 wielkich liter, np. 'MDREPK' — UNIKALNE
plate_language  ENUM('en', 'de', 'pl')
number_of_visits INT DEFAULT 0
secret_key      VARCHAR  -- MD5 hash, używany jako część URL dla bezpieczeństwa
created_at      DATETIME
updated_at      DATETIME
```

**Uwaga:** `plate_number` to 6 losowych wielkich liter (A-Z), unikalny identyfikator fizyczny. `secret_key` to MD5 generowany przy imporcie.

### Tabela: `customer_locations`
```sql
location_id             INT PRIMARY KEY AUTO_INCREMENT
subscription_id         INT FK → subscriptions
location_name           VARCHAR   -- nazwa wyświetlana na stronie (np. "DELUXE-Kebab")
google_business_name    VARCHAR
google_business_address VARCHAR
city                    VARCHAR
postal_code             VARCHAR
country                 VARCHAR
google_review_link      VARCHAR   -- link do wystawienia recenzji Google
google_places_id        VARCHAR   -- ID miejsca Google
support_email           VARCHAR   -- email właściciela lokalu
logo_path               VARCHAR   -- ścieżka na serwerze (UWAGA: przy przepisywaniu → Supabase Storage)
logo_link               VARCHAR   -- publiczny URL logo
linktree_slug           VARCHAR   -- slug dla /l/{slug} (np. 'mamma-mia')
linktree_visits         INT DEFAULT 0
has_linktree_access     TINYINT(1) DEFAULT 0
has_promo_enabled       TINYINT(1) DEFAULT 0
has_loyalty_enabled     TINYINT(1) DEFAULT 0
promo_banner_text       VARCHAR   -- tekst baneru promującego promocję
promo_sms_text          VARCHAR   -- treść SMS wysyłanego klientowi
owner_email             VARCHAR   -- email właściciela (z tabeli customers)
created_at              DATETIME
updated_at              DATETIME
```

### Tabela: `customer_location_links`
```sql
id                      INT PRIMARY KEY AUTO_INCREMENT
customer_location_id    INT FK → customer_locations
title                   VARCHAR   -- etykieta linku (np. "Nasze menu")
url                     VARCHAR   -- URL (np. "https://...")
```

### Tabela: `orders`
```sql
order_id                    INT PRIMARY KEY AUTO_INCREMENT
customer_id                 INT FK → customers
status                      ENUM('pending', 'paid', 'cancelled')
payment_method              ENUM('stripe', 'bank_transfer', 'cash', NULL)
stripe_payment_id           VARCHAR (nullable)
stripe_payment_intent_id    VARCHAR (nullable)
internal_payment_reference  VARCHAR   -- ręczna referencja płatności
created_at                  DATETIME
fulfilled_at                DATETIME
```

### Tabela: `order_items`
```sql
order_item_id   INT PRIMARY KEY AUTO_INCREMENT
order_id        INT FK → orders
product_id      INT FK → products
quantity        INT
```

### Tabela: `products`
```sql
product_id          INT PRIMARY KEY
category            ENUM('subscription', 'plate', 'shipping')
name                VARCHAR   -- np. '1_WEEK_SUB_FREE', '1_YEAR_SUB', 'PLATE'
description         VARCHAR
is_free             TINYINT(1)
price               DECIMAL(10,2)
stripe_product_id   VARCHAR (nullable)
stripe_price_id     VARCHAR (nullable)
creation_date       DATETIME
```

**Produkty w systemie:**
| ID | Nazwa | Kategoria | Cena |
|----|-------|-----------|------|
| 0 | 1_WEEK_SUB_FREE | subscription | €0 |
| 1 | 1_YEAR_SUB | subscription | €59 |
| 2 | PLATE | plate | €19.90 |
| 3 | DOMESTIC_SHIPPING_AUSTRIA | shipping | €0 |
| 4 | INTERNATIONAL_SHIPPING_EUROPE | shipping | €0 |
| 5 | 2_WEEKS_FREE_SUB | subscription | €0 |
| 6 | 10_DAYS_FREE_SUB | subscription | €0 |

### Tabela: `subscription_details`
```sql
id              INT PRIMARY KEY
product_id      INT FK → products
duration_in_days INT
is_free         TINYINT(1)
```

### Tabela: `reviews`
```sql
review_id       INT PRIMARY KEY AUTO_INCREMENT
plate_id        INT FK → plates
scan_id         VARCHAR   -- uniqid() generowany przy skanowaniu
scan_time       DATETIME
rating          INT (1-5, nullable — użytkownik mógł nie zostawić oceny)
rating_time     DATETIME (nullable)
feedback_message TEXT (nullable)
contact_email   VARCHAR (nullable)
contact_phone   VARCHAR (nullable)
user_name       VARCHAR (nullable)
feedback_time   DATETIME (nullable)
created_at      DATETIME
updated_at      DATETIME
```

### Tabela: `shipments`
```sql
-- tabela na dane wysyłkowe zamówień, aktualnie pusta
shipment_id     INT PRIMARY KEY
order_id        INT FK → orders
-- pozostałe pola adresowe
```

### Tabela: `location_leads` (Promo)
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
location_id     INT FK → customer_locations
phone           VARCHAR   -- numer telefonu klienta (unikalny per lokal)
email           VARCHAR (nullable)
agreed_to_terms TINYINT(1)
claim_token     VARCHAR   -- hex token do jednorazowej aktywacji kuponu
is_used         TINYINT(1) DEFAULT 0
used_at         DATETIME (nullable)
created_at      DATETIME
```

**Ważne:** jeden numer telefonu może pobrać promocję tylko raz dla danego lokalu (`checkLeadExists`).

### Tabela: `loyalty_cards`
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
location_id     INT FK → customer_locations
phone           VARCHAR   -- identyfikator użytkownika (numer telefonu)
stamps_count    INT DEFAULT 0
last_stamp_at   DATETIME
```

### Tabela: `loyalty_otp`
```sql
location_id     INT FK → customer_locations
phone           VARCHAR
otp_code        VARCHAR(4)  -- 4-cyfrowy kod
expires_at      DATETIME    -- ważny 3 minuty
UNIQUE KEY (location_id, phone)   -- ON DUPLICATE KEY UPDATE
```

---

## 5. Routing — Wszystkie Endpointy

### Publiczne (end-user)

| Method | URL | Opis |
|--------|-----|------|
| GET | `/plate/{plateNumber}/{plateSecretKey}` | Główny endpoint skanowania płytki |
| GET | `/plate/{plateNumber}/scan/{scanId}` | Strona oceny po skanowaniu |
| POST | `/process/rating` | Zapis oceny (1-5 gwiazdek) |
| POST | `/process/feedback` | Zapis rozszerzonego feedbacku |
| GET | `/l/{slug}` | Strona Linktree lokalu |
| GET | `/l/{slug}/promo` | Strona formularza promocji |
| POST | `/l/{slug}/promo/send` | Przetworzenie formularza — wysyłka SMS/email z tokenem |
| GET | `/l/{slug}/promo/claim/{token}` | Strona aktywacji kuponu (przy kasie) |
| POST | `/l/{slug}/promo/activate` | Oznaczenie kuponu jako zużytego |
| GET | `/l/{slug}/loyalty` | Strona programu lojalnościowego |
| POST | `/l/{slug}/loyalty/collect` | Dodanie pieczątki |
| POST | `/l/{slug}/loyalty/claim` | Odebranie nagrody (reset karty) |
| GET | `/l/{slug}/loyalty/reward` | Strona potwierdzenia nagrody |
| POST | `/l/{slug}/loyalty/status` | Sprawdzenie statusu karty lojalnościowej |
| POST | `/l/{slug}/loyalty/request-otp` | Wysłanie kodu OTP przez SMS |
| POST | `/l/{slug}/loyalty/verify-otp` | Weryfikacja kodu OTP |
| GET | `/l/{slug}/loyalty/logout` | Wylogowanie z sesji loyalty |

### Chronione (panel admina — wymaga zalogowania)

| Method | URL | Opis |
|--------|-----|------|
| GET | `/login` | Strona logowania |
| POST | `/auth/login` | Przetworzenie logowania |
| GET | `/logout` | Wylogowanie |
| GET | `/dashboard` | Panel główny |
| GET | `/add/admin` | Formularz dodania admina |
| POST | `/process/add/admin` | Przetworzenie dodania admina |
| GET | `/add/customer` | Formularz dodania klienta |
| POST | `/process/add/customer` | Przetworzenie dodania klienta |
| GET | `/add/order` | Formularz dodania zamówienia |
| POST | `/process/add/order` | Przetworzenie zamówienia |
| GET | `/add/plate_to_subscription` | Przypisanie płytki do subskrypcji |
| POST | `/process/add/plate_to_subscription` | Przetworzenie przypisania |
| GET | `/add/plates_from_file` | Import płytek z pliku TXT |
| POST | `/process/add/plates_from_file` | Przetworzenie importu |
| POST | `/process/setup/plate` | Setup płytki (konfiguracja przez właściciela) |
| POST | `/search/customers` | Wyszukiwanie klientów (AJAX) |
| POST | `/load/subscriptions` | Ładowanie subskrypcji klienta (AJAX) |
| GET | `/generate/plate_numbers` | Generator numerów płytek |
| POST | `/generate/plate_numbers/process` | Generowanie i pobieranie pliku TXT |
| GET | `/send/subscription-reports` | Wysyłka raportów subskrypcji |
| GET | `/customer/count` | Liczba klientów (API) |

### Webhooki

| Method | URL | Opis |
|--------|-----|------|
| POST | `/stripe/payment` | Stripe webhook (`invoice.payment_succeeded`) |

---

## 6. Kluczowe Przepływy Biznesowe

### 6.1 Flow Skanowania Płytki

```
Użytkownik skanuje QR/NFC
    → GET /plate/{plateNumber}/{secretKey}
    → PlateController::handlePlate()
    → PlateService::findPlateByNumber() — szukaj w DB
    → weryfikacja secretKey (MD5 hash)
    → SubscriptionService::findSubscriptionByPlateNumber()

    SWITCH subscription.status:

    CASE 'inactive':
        → pokaż stronę błędu "płytka nieaktywna"

    CASE 'pending':
        → generateSetupToken() — zapisz token w $_SESSION
        → pokaż PlateSetup.php (formularz konfiguracji lokalu)
        → właściciel wypełnia: nazwa lokalu, adres Google, link do recenzji, logo
        → POST /process/setup/plate
        → PlateService::processSetupPlate()
            → zapis do customer_locations
            → upload logo na serwer (/app/uploads/logos/)
            → subscription.status → 'active'
            → wysyłka email do właściciela (potwierdzenie)

    CASE 'active':
        → CustomerLocationService::getLocationBySubscriptionId()
        → ReviewService::registerScanRecord() — INSERT do reviews (scan_id = uniqid())
        → REDIRECT do /plate/{number}/scan/{scanId}
        → GET /plate/{number}/scan/{scanId}
        → incrementVisitCount()
        → renderuj Proxy.php (strona z oceną)
```

### 6.2 Flow Oceny i Feedbacku

```
Strona Proxy.php wyświetla:
    - logo lokalu
    - 5 gwiazdek do kliknięcia
    - przycisk "Idź do Google" (link do recenzji Google)

Użytkownik klika gwiazdkę:
    → POST /process/rating
    → ReviewController::processRating()
    → zapis rating + rating_time do reviews WHERE scan_id = X

Jeśli ocena <= 3 (negatywna):
    → wyświetl formularz feedbacku (imię, email, telefon, wiadomość)
    → POST /process/feedback
    → ReviewController::processFeedback()
    → zapis feedback_message, contact_email, contact_phone do reviews

Jeśli ocena >= 4 (pozytywna):
    → przekieruj do google_review_link (recenzja Google)
```

### 6.3 Flow Linktree

```
GET /l/{slug}
    → LinktreeService::getLinktreeProfile(slug)
    → SQL: SELECT FROM customer_locations WHERE linktree_slug = slug AND has_linktree_access = 1
    → incrementVisits()
    → pobierz linki: SELECT FROM customer_location_links WHERE customer_location_id = X
    → renderuj widok z logo, nazwą, listą linków
    → jeśli has_promo_enabled = 1: pokaż baner promocji
    → jeśli has_loyalty_enabled = 1: pokaż przycisk programu lojalnościowego
```

### 6.4 Flow Promocji (Squeeze Page)

```
GET /l/{slug}/promo
    → pokaż formularz: telefon (wymagany), email (opcjonalny), zgoda na warunki

POST /l/{slug}/promo/send {phone, email?, agreed}
    → sprawdź czy lokal ma has_promo_enabled = 1
    → sprawdź czy numer telefonu już istnieje w location_leads (ochrona przed wielokrotnym odbiorem)
    → generuj claimToken = bin2hex(random_bytes(16))
    → zapisz do location_leads
    → zbuduj claimUrl = /l/{slug}/promo/claim/{token}
    → wyślij SMS z tekstem z promo_sms_text + link do aktywacji
    → jeśli podano email: wyślij też email
    → zwróć JSON {success: true}

GET /l/{slug}/promo/claim/{token}
    → waliduj token z bazy
    → jeśli is_used = 1: pokaż "kupon już wykorzystany"
    → jeśli ważny: pokaż stronę kuponu z przyciskiem "Aktywuj przy kasie"

POST /l/{slug}/promo/activate {token}
    → LinktreeService::markPromoAsUsed(leadId)
    → UPDATE location_leads SET is_used = 1, used_at = NOW()
    → pokaż potwierdzenie
```

### 6.5 Flow Programu Lojalnościowego

```
Logowanie przez OTP:
    POST /l/{slug}/loyalty/request-otp {phone}
        → generuj 4-cyfrowy kod PIN
        → INSERT do loyalty_otp (lub UPDATE jeśli istnieje — ON DUPLICATE KEY)
        → wygaśnięcie po 3 minutach
        → wyślij SMS z kodem

    POST /l/{slug}/loyalty/verify-otp {phone, code}
        → pobierz z loyalty_otp
        → sprawdź expires_at
        → hash_equals() — weryfikacja kodu
        → DELETE z loyalty_otp (jednorazowe)
        → zapis numeru w sesji PHP

Zbieranie pieczątek:
    POST /l/{slug}/loyalty/collect {phone}
        → pobierz loyalty_cards WHERE location_id AND phone
        
        CASE karta nie istnieje:
            → createLoyaltyCard() — INSERT z stamps_count=1
            → return {stamps: 1, reward_ready: false}
        
        CASE ostatnia pieczątka < 12 godzin temu:
            → throw Exception z informacją ile czasu zostało
        
        CASE stamps_count + 1 >= 10:
            → resetLoyaltyCard() — stamps_count = 0
            → return {stamps: 10, reward_ready: true}
        
        CASE normalny:
            → incrementLoyaltyStamp()
            → return {stamps: N, reward_ready: false}

Nagroda:
    POST /l/{slug}/loyalty/claim
        → sprawdź czy stamps_count >= 10
        → resetLoyaltyCard()
```

### 6.6 Flow Stripe Webhook

```
POST /stripe/payment
    → WebhookController::handleStripeWebhook(payload, sigHeader)
    → Stripe::Webhook::constructEvent() — weryfikacja podpisu
    
    EVENT: invoice.payment_succeeded
        → CustomerService::createCustomerFromStripeSession(session)
            → INSERT do customers
        → OrderService::createStripeOrderFromSession(session, customerId)
            → INSERT do orders
        → SubscriptionService::createSubscriptionFromStripeSession(session.lines.data)
            → dla Stripe priceId 'price_1QpqZ7HqQ7RAMwEla9NbOQ8c' (1_YEAR_SUB):
                → INSERT do subscriptions ze status='pending'
        → ShipmentService::createShipmentFromSession()
            → INSERT do shipments
        → EmailService::sendOrderConfirmationEmailToAdmin()
    
    → http_response_code(200)
    → fastcgi_finish_request() — odpowiedź do Stripe, reszta w tle
```

### 6.7 Flow Dodawania i Importu Płytek (Panel Admina)

```
Import z pliku TXT:
    Plik wejściowy format (jedna linia = jedna płytka):
        ABCDEF,de
        GHIJKL,en
    
    POST /process/add/plates_from_file
        → dla każdej linii: INSERT do plates z secret_key = MD5(random)
        → generuj URL: /plate/{plateNumber}/{secretKey}
        → utwórz plik TXT z linkami
        → wyślij email z załącznikiem na vikbobinski@gmail.com
        → zwróć plik do pobrania (Content-Disposition: attachment)

Generowanie numerów płytek:
    GET /generate/plate_numbers → formularz (ile sztuk, język)
    POST /generate/plate_numbers/process
        → generuj N unikalnych 6-literowych kodów (A-Z, shuffle)
        → sprawdź unikalność w DB (do 10 prób)
        → zwróć plik TXT: "ABCDEF,de\nGHIJKL,en"
```

---

## 7. Autentykacja Admina

- Sesja PHP (`$_SESSION`)
- `AuthSessionManager::isLoggedIn()` — sprawdza czy w sesji jest flaga zalogowania
- Chronione route'y: `add`, `add/admin`, `add/customer`, `add/order`, `add/plate_to_subscription`, `add/plates_from_file`, `send/subscription-reports`
- Niezalogowany użytkownik → redirect do `/login`
- Hasło przechowywane jako bcrypt hash w tabeli `admins`

---

## 8. System Tłumaczeń

Plik `app/resources/translations.json` zawiera tłumaczenia w językach:
- `en` (angielski) — domyślny fallback
- `de` (niemiecki)
- `pl` (polski)

Używany przez `TranslationService::getTranslation(key, language)`. Język pobierany z:
1. `plate_language` zapisanego przy płytce (ustawianego przy imporcie)
2. `$_POST['language']` dla formularzy
3. `$_SESSION['language']` (ustawiane po skanowaniu)

---

## 9. Usługi Zewnętrzne

### SMS — httpsms.com
- API: `POST https://api.httpsms.com/v1/messages/send`
- Auth: `x-api-key` header
- Routing: numery +48 (Polska) używają osobnego nadawcy `sender_number_pl`
- Używane przy: OTP loyalty, wysyłka kuponu promocyjnego
- Config: `app/config/httpsms_config.php` (nie w repo)

### Email — PHP mail()
- `app/config/email_config.php` (nie w repo): `from_email`, `admin_email`
- Używane przy: potwierdzenie zamówienia, rejestracja klienta, setup płytki, promo
- **UWAGA przy przepisywaniu:** `mail()` należy zastąpić np. Resend/SendGrid/Nodemailer

### Stripe
- PHP Stripe SDK
- Config: `app/config/stripe_config.php` — stałe `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Obsługiwany event: `invoice.payment_succeeded`
- Stripe Price ID dla 1_YEAR_SUB: `price_1QpqZ7HqQ7RAMwEla9NbOQ8c`
- Stripe Product ID: `prod_RjJBsl7yqs0LtL`

---

## 10. Upload Plików (Logo)

Przy setup płytki właściciel uploaduje logo lokalu:
- Dozwolone typy: `image/png`, `image/jpeg`
- Maksymalny rozmiar: 5MB
- Zapis: `{DOCUMENT_ROOT}/app/uploads/logos/{uniqid()}_{filename}`
- Publiczny URL: `https://{host}/app/uploads/logos/{filename}`
- Konwersja ścieżki serwera → URL przez metodę `convertServerPathToUrl()` (szuka `public_html/` w ścieżce)

**KRYTYCZNE przy przepisywaniu:** Logo przechowywane na filesystem serwera. W nowej wersji należy zastąpić Supabase Storage lub Cloudflare R2.

---

## 11. Modele Danych

### Plate
```
plateId, subscriptionId, plateNumber, plateSecret, plateLanguage, numberOfVisits
```

### Customer
```
id, name, companyName, taxId, email, phone, billingAddress, preferredLanguage, country
```

### Subscription
```
id, customer_id, subscription_name, activation_datetime, expiration_datetime, 
duration_in_days, status (pending/active/inactive)
```
Metody: `isActive()`, `isExpired()`

### Order
```
orderId, customerId, status, paymentMethod, stripePaymentId, 
stripePaymentIntentId, internalPaymentReference
```

---

## 12. Wyjątki (Custom Exceptions)

| Klasa | Kiedy rzucany |
|-------|--------------|
| `PlateNotFoundException` | Płytka o danym numerze nie istnieje w DB |
| `InvalidScanIdException` | Podany secretKey lub scanId jest nieprawidłowy |
| `SubscriptionNotFoundException` | Brak subskrypcji dla danej płytki |
| `SubscriptionInactiveException` | Subskrypcja ma status `inactive` |
| `LocationNotFoundException` | Brak lokalizacji dla aktywnej subskrypcji |

---

## 13. Deployment

### DEV
- Branch: `master`
- Push → GitHub Actions → post-receive hook na serwerze DEV
- URL: `app.googlenfc.smallhost.pl` (DEV)

### PROD
- Branch: `release/x.x.x`
- Push → GitHub Actions → podmiana plików na serwerze PROD
- Repo PROD: `github.com/starlinkee/starlinkee-prod`

---

## 14. Czego NIE MA w Repo (pliki config, nie commitowane)

```
app/config/db_connection.php    ← dane dostępowe do MySQL
app/config/stripe_config.php    ← STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
app/config/email_config.php     ← from_email, admin_email
app/config/httpsms_config.php   ← api_key, sender_number, sender_number_pl
app/uploads/                    ← loga lokali (filesystem serwera)
vendor/                         ← Composer (Stripe SDK)
```

---

## 15. Szczegóły Implementacyjne — Ważne Uwagi

### Scan ID
`scan_id` to PHP `uniqid()` — 13-znakowy hex string. Generowany dwukrotnie: raz przy pierwszym skanowaniu (`handlePlate`), raz tymczasowo w `prepareActivePlateData`. Tylko ten z `handlePlate` jest zapisywany do `reviews`.

### Walidacja Secret Key
URL płytki: `/plate/ABCDEF/de37066fe5b9a3d236d17f5bbc8f0fd6`
Drugi segment to MD5 hash (`secret_key` z tabeli `plates`). Porównanie przez `===` (strict).

### Subskrypcja pending → active
Subskrypcja przechodzi ze `pending` na `active` dopiero gdy właściciel wykona setup płytki (wpisze dane lokalu i uploaduje logo). Datę aktywacji i wygaśnięcia ustawia się w tym momencie.

### Cooldown pieczątek
Użytkownik może zebrać maksymalnie jedną pieczątkę na 12 godzin (43200 sekund). Sprawdzenie przez `last_stamp_at`.

### OTP
4-cyfrowy kod, ważny 3 minuty. Tabela `loyalty_otp` ma UNIQUE KEY na `(location_id, phone)` — `ON DUPLICATE KEY UPDATE` nadpisuje stary kod (nie można mieć dwóch aktywnych).

### Logo path → URL
Serwer używa ścieżek absolutnych (`/usr/home/googlenfc/domains/.../public_html/app/uploads/...`). Metoda `convertServerPathToUrl()` wyciąga część po `public_html/` i dokłada domenę.

### Wielojęzyczność płytek
Przy imporcie z pliku TXT format to `NUMERPLATKI,język` (np. `ABCDEF,de`). Język zapisywany w `plate_language` i używany do wyświetlania tłumaczeń na stronie oceny.

---

## 16. Co Przepisać Inaczej (Znane Problemy / Tech Debt)

1. **Logo na filesystem** → przenieść do Supabase Storage
2. **PHP `mail()`** → zastąpić Resend lub SendGrid
3. **PHP `$_SESSION`** → zastąpić iron-session lub Supabase Auth (dla loyalty OTP)
4. **`uniqid()` jako scan_id** → zastąpić `crypto.randomUUID()`
5. **Hardcoded email** `vikbobinski@gmail.com` w `PlateService::importPlatesFromFile()` → przenieść do env
6. **Hardcoded URL** `app.googlenfc.smallhost.pl` w `importPlatesFromFile()` → przenieść do env
7. **Hardcoded Stripe Price/Product ID** w `SubscriptionService::createSubscriptionFromStripeSession()` → przenieść do env
8. **Brak CSRF** na formularzach admina
9. **Subskrypcja pending** — daty aktywacji/wygaśnięcia są NULL do czasu setupu, pamiętaj obsłużyć ten edge case w nowym systemie

---

## 17. Zmienne Środowiskowe Potrzebne w Nowej Wersji

```env
# Baza danych
DATABASE_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_1_YEAR_SUB=price_1QpqZ7HqQ7RAMwEla9NbOQ8c

# SMS (httpsms.com)
HTTPSMS_API_KEY=
HTTPSMS_SENDER_NUMBER=        # domyślny (Austria)
HTTPSMS_SENDER_NUMBER_PL=     # dla numerów +48

# Email
EMAIL_FROM=
EMAIL_ADMIN=

# App
NEXT_PUBLIC_APP_URL=          # bazowy URL (do generowania linków płytek i promo)
ADMIN_EMAIL_FOR_PLATE_IMPORT= # vikbobinski@gmail.com
```
