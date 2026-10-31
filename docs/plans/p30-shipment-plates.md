# P30 — Płytki z dopłaty trialu w przesyłce (`shipments.number_of_plates`)

Źródło: decyzja kernela 10-30 13:57Z przez intake (qitem-20261030135750-030a913222575f84), problem z review P28.
Po P29. Gałąź `feat/italian`, lokalnie, bez pushu. e2e przez `flock /tmp/starlinkee-e2e.lock`.

## Stan dziś

- Faktura (`processInvoicePaymentSucceeded`) tworzy zamówienie i jedną przesyłkę (`createShipment`), ale nie wypełnia `number_of_plates`.
- `processExtraPlatesPaymentIntent` (P28) tworzy osobne zamówienie PI z `order_items PLATE × extra_plates`, bez przesyłki.
- Admin pakuje według `/admin/shipments`: kolumna „number_of_plates” (`src/app/admin/shipments/page.tsx:74`), dziś „—”. Status przesyłki to `shipments.shipping_status`: `pending | shipped | delivered | cancelled`.

## Zakres (`src/lib/services/stripe.ts`, `src/lib/db/shipments.ts`)

1. **Faktura:** `createShipment` dostaje `number_of_plates` = liczba wierszy `subscriptions` tworzonych przez tę fakturę: `total_plates` dla `monthly`/`annual`, `1` dla `trial`, liczba z linii w fallbacku P20.
2. **PI z dopłatą**, po utworzeniu brakujących wierszy (P28):
   - Przesyłka startowa: `stripe_subscription_id` → wiersz bazowy → `stripe_invoice_id` → zamówienie faktury (`getOrderIdByStripePaymentId`) → jego przesyłka. Nowy helper w `src/lib/db/shipments.ts`, np. `getShipmentByOrderId`.
   - **`shipping_status = pending`** → `number_of_plates` = liczba wszystkich wierszy `subscriptions` tej subskrypcji Stripe (czyli `1 + extra_plates`). Wartość jest **liczona, nie dodawana**, więc ponowne dostarczenie i dowolna kolejność jej nie podwajają. Bez przesyłki dla zamówienia PI.
   - **Inny status** (`shipped`, `delivered`, `cancelled`) → nowa przesyłka dla **zamówienia PI** z adresem i odbiorcą skopiowanymi z przesyłki startowej, `number_of_plates = extra_plates`, `shipping_status = pending`. Idempotentnie przez `orderHasShipment(piOrderId)`.
   - Brak wiersza bazowego (PI przed fakturą) → bez zmian względem P28: 500 i ponowienie, po 24 h alarm.
   - Brak przesyłki startowej przy istniejącym zamówieniu (nie powinno się zdarzyć) → nowa przesyłka dla zamówienia PI jak wyżej, z adresem z `pi.shipping` (jeśli jest), plus alarm do admina z P27/P28.
3. `order_items` bez zmian: zamówienie PI ma `PLATE × extra_plates` (P28), zamówienie faktury swoje pozycje. Admin pakuje według przesyłek.

## Testy

- Jednostkowe (`src/__tests__/unit/lib/services/stripe.test.ts`): faktura `monthly` z `total_plates=3` → przesyłka z `number_of_plates=3`; faktura trial → 1. Przesyłka niewysłana + PI `extra_plates=2` → ta sama przesyłka z 3, bez nowej. Przesyłka `shipped` + PI → nowa przesyłka z 2 i tym samym adresem, stara bez zmian. Ponowne dostarczenie PI w obu wariantach → bez zmian (3, jedna nowa przesyłka). PI przed fakturą → 500, przesyłki nietknięte; po fakturze ponowny PI → 3.
- e2e Playwright (`/admin/shipments` pokazuje `number_of_plates`, zmiana widoczna): seed przesyłki z `number_of_plates=3` → admin widzi „3” w wierszu; przesyłka bez wartości → „—” (najważniejszy przypadek brzegowy, stare rekordy). Jeśli e2e admina już seeduje przesyłki, dopisać do istniejącego pliku.

Weryfikacja: `npm test` (także `TZ=UTC`), `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e:local` (przez flock) zielone. Commit na `feat/italian`, bez pushu, potem review.

## Do wiadomości VB

- Stare przesyłki na prod mają `number_of_plates = NULL` (admin widzi „—”). Ewentualne uzupełnienie to osobny SELECT/UPDATE za zgodą VB, poza tym pakietem.
