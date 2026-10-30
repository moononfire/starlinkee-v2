# P27 — Webhook v2 czyta koszyk z metadanych www (kontrakt 10-30)

Źródło: VB/www przez intake, ostateczna wersja: qitem-20261030105918-746e97e2eed86ed3. Zastępuje qitem-20261030105849 i qitem-20261030105900.
Uzupełnia P20 (liczenie po price ID zostaje jako fallback) i P24 (locale → `preferred_language`). Gałąź `feat/italian`, lokalnie, bez pushu.

## Zmiany w planie audytu (`audit-2026-10.md`)

- **P21 ODWOŁANY** w dotychczasowej formie: prod v2 działa na LIVE i nie przestawiamy go na tryb testowy.
- **P22**: test w trybie testowym Stripe na **preview** v2, nie na prod. Dopiero po wdrożeniu kroków 21–22 www. Sprawdza też trial i język.

## Kontrakt (www ustawia na `subscription.metadata`; trial przez `subscriptions.create`)

| Klucz | Wartości | v2 |
|---|---|---|
| `billing` | `monthly` \| `annual` \| `trial` | **czyta**: okres |
| `total_plates` | liczba całkowita ≥ 1, wszystkie płytki razem | **czyta**: liczba wierszy `subscriptions` |
| `trial_days` | liczba całkowita ≥ 1 (dziś 30), tylko dla `trial` | **czyta**: okres trialu |
| `locale` | `pl` \| `en` \| `de` \| `it` | **czyta**: `preferred_language` według P24 |
| `kind`, `plates`, `plates_by_language` | aliasy, mapa języków | **ignoruje**; `kind` przy trialu = `subscription_yearly`, więc nigdy nie służy do okresu |

Odczyt: `invoice.parent.subscription_details.metadata`, a jeśli nie ma tam `billing`, `metadata` klienta Stripe. Klienta pobiera się raz, ten sam obiekt służy już P24.

## Zakres (`src/lib/services/stripe.ts`, `processInvoicePaymentSucceeded`)

1. Jest `billing` → płytki = `total_plates` (bez liczenia linii), `duration_in_days` = 30 dla `monthly`, 365 dla `annual`, `trial_days` dla `trial`.
2. `billing` jest, ale wartości niepoprawne (nieznany `billing`, `total_plates` nie jest liczbą całkowitą z przedziału 1–50, `trial` bez poprawnego `trial_days`) → `console.error` z id faktury i bez tworzenia zamówienia, subskrypcji, wysyłki i konta. Bez fallbacku na price ID, bo metadane mówią coś innego niż faktura. **Do tego alarm do admina** (intake 11:02Z): nowa `sendInvalidCartMetadataToAdmin` w `src/lib/email.ts` na wzór `sendDuplicateStripeSubscriptionToAdmin` (l. 401), z ID faktury, ID klienta Stripe, e-mailem klienta, kwotą i listą błędnych pól. Bez danych karty i bez sekretów. Błąd wysyłki nie przerywa webhooka (`.catch` jak przy innych alarmach). Ponowne dostarczenie tej samej faktury może wysłać alarm drugi raz, to akceptowalne.
3. Brak `billing` w obu miejscach → dotychczasowa logika P20 po price ID, bez zmian.
4. `locale` → jak w P24 (subskrypcja, potem klient, potem null; nigdy kraj). Jeśli P24 czyta już `locale` z tych samych miejsc, tylko to zostawić i sprawdzić.
5. Bez zmian: routing po `billing_reason` (faktura trialu za 0 zł ma `subscription_create`, a pierwsza płatna po trialu `subscription_cycle` i przedłuża przez `paidThrough` + zapas, P8), odnowienia z `renewal_*`, idempotencja przy ponownym dostarczeniu.

## Testy (jednostkowe, `src/__tests__/unit/lib/services/stripe.test.ts`)

- `monthly` z `total_plates=3` → 3 wiersze po 30 dni, także gdy linie faktury mówią coś innego.
- `annual` z `total_plates=1` → 1 wiersz, 365 dni.
- `trial` z `trial_days=30` → 30 dni, mimo `kind=subscription_yearly`.
- Metadane tylko na kliencie Stripe → użyte.
- Brak metadanych → wynik jak w P20 (istniejące testy dalej zielone).
- Niepoprawne: `billing=weekly`, `total_plates=0`/`abc`, `trial` bez `trial_days` → log błędu, nic nie utworzone, `sendInvalidCartMetadataToAdmin` wywołane raz z ID faktury i klienta Stripe. Gdy wysyłka alarmu rzuca wyjątek, webhook i tak się kończy.
- Ponowne dostarczenie tej samej faktury z metadanymi → bez duplikatów.
- e2e nie dotyczy (bez UI). Pełną ścieżkę sprawdza P22 na preview.

Weryfikacja: `npm test` (także `TZ=UTC`), `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e:local` zielone. Commit na `feat/italian`, bez pushu. Potem review.

## Do wiadomości VB

- Faktura z niepoprawnymi metadanymi nie tworzy niczego. Admin dostaje alarm mailem i musi ręcznie założyć klientowi konto i płytki albo zwrócić płatność.
- `plates_by_language` dalej nie jest używane: język płytki ustawia się przy setupie.
