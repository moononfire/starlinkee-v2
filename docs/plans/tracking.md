# P16 — Śledzenie interakcji (plan, 2026-10-29)

Źródło: VB przez kernel advisora (qitem-20261029033602-edd98679). Start po P15. Twarde zasady jak w `audit-2026-10.md` (migracja tylko lokalnie, bez pushu, e2e lokalnie).

## Cel

Wiedzieć, co jest najczęściej klikane i oglądane. Prosty system, który śledzi każdy przycisk i zbiera jak najwięcej informacji, ale anonimowo.

## Co już jest (rozbudować, nie dublować)

- Tabela `page_views` (`supabase/migrations/20260622000000_page_views.sql`), `POST /api/track` (`src/app/api/track/route.ts`, rate limit, walidacja `page_type`), `src/components/tracking/PageTracker.tsx` (anonimowe `session_id` w sessionStorage), widok `src/app/admin/analytics/AnalyticsDashboard.tsx`.
- **Filtry i kategorie:** w części dla gości (płytka, skan, `/l/<slug>`: linktree, promo, loyalty, wifi, menu) nie ma filtrów ani kategorii; filtry są tylko w panelu admina (places, reviews, shipments, analytics) i w portalu. Jeśli VB myślał o filtrach/kategoriach wydarzeń, to raczej projekt gaskizrzaski — planer pyta VB przez intake przed startem P16.

## Zakres

1. Tabela `interaction_events` (migracja tylko plik + lokalnie): `event` (click/view), `element` (z `data-track` albo nazwa wyliczona z elementu: aria-label/tekst przycisku przycięty, rola, id), `page_path`, `page_type`, czas, `session_id` (anonimowy), urządzenie (klasa z user-agent: mobile/desktop + system, bez pełnego UA), `lang`, opcjonalnie `location_id`/`plate_id`. Bez IP, bez treści pól formularzy, bez e-maili/telefonów, bez query stringów z tokenami (`scan`, `token`, sekret płytki w ścieżce — maskować).
2. Jeden delegowany listener kliknięć w root layout (klient), który łapie każdy `button`, `a` i `[data-track]`; odsłony przez rozszerzenie `PageTracker` albo globalnie po zmianie ścieżki. Widoki zakładek/sekcji: `data-track-view` + IntersectionObserver, jeśli tanie. Wysyłka batch przez `navigator.sendBeacon` do `/api/track` (albo `/api/track/events`) z istniejącym rate limitem.
3. Admin: top kliknięcia, top strony/widoki, filtr dat i opcjonalnie lokalu; pod istniejącym `/admin/analytics`.
4. RODO: notka dla VB (`docs/plans/tracking-gdpr.md`): czy przy sessionStorage + braku IP + braku danych osobowych potrzebna zgoda (DE TTDSG §25, IT/PL ePrivacy). Propozycja: jeśli zgoda potrzebna, śledzenie tylko po zgodzie albo bez identyfikatora sesji. Decyzja VB przed wdrożeniem na prod.

## Weryfikacja

- e2e: klik przycisku na stronie gościa → wiersz w `interaction_events` z poprawnym `element`, bez sekretu/tokenu w `page_path`; widok admina pokazuje top kliknięcia dla zakresu dat.
- Unit: wyliczanie nazwy elementu, maskowanie ścieżek.
- Wydajność: listener nie blokuje kliknięć (beacon, brak await w handlerze).
