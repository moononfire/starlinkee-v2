# P28 — Trial: dodatkowe płytki i wysyłka z osobnego PaymentIntent

Źródło: decyzja kernela 10-30 11:02Z przez intake (qitem-20261030110257-135364e7475a5142); VB może ją zmienić.
Po P27 (`docs/plans/p27-www-metadata.md`). Jeśli builder nie zaczął jeszcze P27, robi P27 i P28 razem, jako jeden lub dwa commity. Gałąź `feat/italian`, lokalnie, bez pushu.

## Kontrakt www (trial)

- Subskrypcja trial (`subscriptions.create`) ma `metadata.billing=trial`, `trial_days`, `total_plates`, `locale` (jak w P27). Faktura startowa ma zwykle 0 zł, bez `add_invoice_items` i bez produktu „Wysyłka”.
- Dopłata za dodatkowe płytki i wysyłkę to **osobny PaymentIntent** z `metadata`: `purpose=extra_plates_and_shipping`, `subscription_id` (ID subskrypcji Stripe), `extra_plates`, `total_plates`, `locale`.
- Endpoint LIVE v2 dostaje: `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `payment_intent.succeeded`.

## Zmiana P27 dla trialu

- Faktura startowa z `billing=trial` tworzy klienta, konto, zamówienie i wysyłkę oraz **1** wiersz `subscriptions` (płytka bazowa, `duration_in_days = trial_days`), a nie `total_plates`. `monthly` i `annual` bez zmian (wiersze = `total_plates`).

## Zakres

1. `src/app/api/stripe/webhook/route.ts`: `payment_intent.succeeded` → nowa `processExtraPlatesPaymentIntent(pi)` w `src/lib/services/stripe.ts`. PI bez `metadata.purpose=extra_plates_and_shipping` → 200 bez zmian w bazie (inne PI nas nie dotyczą).
2. `processExtraPlatesPaymentIntent`:
   - Walidacja: `subscription_id` niepusty, `extra_plates` liczba całkowita 1–49. Błąd → `console.error` + alarm do admina (jak w P27, ID PI i klienta Stripe, kwota, błędne pola, bez danych karty), 200 bez tworzenia.
   - Szuka wierszy `listSubscriptionsByStripeSubscription(subscription_id)`. **Brak wierszy** (PI przyszedł przed fakturą) → rzuca błąd, route zwraca 500 i Stripe ponawia (do 3 dni). Nic nie zapisujemy, więc nic nie ginie. Alarm do admina dopiero, gdy PI jest starszy niż 24 h (`pi.created`) i nadal nie ma subskrypcji; wtedy 200, żeby nie ponawiać bez końca.
   - Cel = `1 + extra_plates` wierszy dla tej subskrypcji Stripe. Tworzy brakujące (cel minus istniejące) z `customer_id`, `duration_in_days` i `stripe_subscription_id` płytki bazowej, bez `stripe_invoice_id`. Dzięki temu ponowne dostarczenie faktury (liczy po `stripe_invoice_id`, P20) i PI (liczy po `stripe_subscription_id`) nie tworzą duplikatów.
   - Zamówienie dla PI: `createOrder` z `stripe_payment_id = pi.id` (idempotentnie przez `getOrderIdByStripePaymentId`) i `order_items` `PLATE × extra_plates`, jeśli zamówienie jeszcze nie ma pozycji. Wysyłka zostaje przy zamówieniu z faktury startowej; bez drugiej wysyłki.
   - Mail do admina o zamówieniu (`sendOrderConfirmationToAdmin`, `plateCount = extra_plates`) jak przy fakturze; błąd wysyłki nie przerywa.
3. Locale z PI nie nadpisuje `preferred_language` (ustawia je faktura według P24/P27).

## Testy jednostkowe (`src/__tests__/unit/lib/services/stripe.test.ts`, route w `src/__tests__/integration/api/stripe-webhook.test.ts`)

- Normalna kolejność: faktura trial (`total_plates=3`) → 1 wiersz; PI `extra_plates=2` → razem 3, ten sam `customer_id` i `duration_in_days`.
- Odwrócona kolejność: PI przed fakturą → błąd (500 w route), nic nie utworzone; po fakturze ponowiony PI → 3 wiersze.
- Ponowne dostarczenie PI i faktury w dowolnej kolejności → dalej 3 wiersze, jedno zamówienie PI.
- PI bez `purpose` → 200, nic nie utworzone, bez alarmu.
- PI bez `subscription_id` lub z `extra_plates=0`/`abc` → alarm do admina, nic nie utworzone.
- Brak subskrypcji i PI starszy niż 24 h → alarm, 200.
- Faktura `monthly`/`annual` → bez zmian względem P27.
- e2e nie dotyczy (bez UI). Pełna ścieżka trialu w P22 na preview.

Weryfikacja: `npm test` (także `TZ=UTC`), `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e:local` zielone. Commit na `feat/italian`, bez pushu, potem review.

## Do wiadomości VB

- Endpoint webhooka LIVE v2 musi dostać event `payment_intent.succeeded` (ustawia VB lub kernel w Stripe, poza kodem).
- PI przed fakturą: Stripe ponawia dostarczenie, a dodatkowe płytki pojawią się z opóźnieniem do najbliższej próby (minuty do godzin).
- Gdy klient anuluje trial przed opłatą, płytki z PI zostają z okresem trialu; zwrot dopłaty to decyzja VB, poza kodem.
