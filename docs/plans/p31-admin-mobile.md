# P31–P33 — Panel admina na telefonie

Źródło: VB 10-31 przez intake (qitem-20261031144939-18e2804f365ec550).
Cel: `/admin/*` czytelny i wygodny przy 360/390/430 px, bez poziomego scrolla strony. Desktop bez regresji, istniejący styl (Tailwind), **bez nowych bibliotek**.
Gałąź: `feat/italian` ma otwarty PR #11. Jeśli PR #11 jest już zmergowany, pracuj na nowej gałęzi `feat/admin-mobile` od `origin/master` przez `git worktree` (wspólne drzewo zostaje na `feat/italian`). Jeśli nie, commituj na `feat/italian` i zgłoś to w notatce. Lokalnie, bez pushu.
e2e: `flock /tmp/starlinkee-e2e.lock npm run test:e2e:local -- --workers=1`. Nowy plik `e2e/admin-mobile.spec.ts`, projekt/`test.use({ viewport: { width: 390, height: 844 } })`. Helper „brak poziomego scrolla”: `document.documentElement.scrollWidth <= window.innerWidth`.

## P31 — Audyt + nawigacja (najpierw)
- Krótki audyt (do 1 strony, `docs/plans/p31-admin-mobile-audit.md`): każda strona z listy VB (dashboard, plates, quick-activate, orders, new order, customers, subscriptions, shipments, reviews, places, analytics) przy 390 px: poziomy scroll T/N, co się łamie (nawigacja, tabela, formularz, modal), proponowany wzorzec (karty / przewijana tabela z kluczowymi kolumnami na wierzchu / bez zmian). Na tej podstawie P32 i P33 dostają konkretną listę plików.
- `src/app/admin/AdminNav.tsx` + `layout.tsx`: poniżej `md` boczna nawigacja zamienia się w górny pasek z przyciskiem hamburger (wysuwane menu, zamykane po wyborze, Esc i kliknięciu w tło), cele dotykowe ≥ 44 px. Od `md` bez zmian. Główna treść bez stałego marginesu bocznego na telefonie.
- e2e (390×844): menu otwiera się, przejście do „Przesyłki” działa, menu się zamyka; brak poziomego scrolla na dashboardzie. Desktop (1280): boczna nawigacja widoczna, hamburger niewidoczny.

## P32 — Najczęściej używane: szybka aktywacja, przesyłki, zamówienia (po PASS P31)
- Quick-activate (`src/app/admin/plates/...quick-activate` według audytu): pola pełnej szerokości, przyciski ≥ 44 px, wynik/dane dostępowe czytelne bez scrolla w bok.
- Przesyłki (`src/app/admin/shipments/page.tsx`, `ShipmentSection.tsx`): poniżej `md` karty (ID, zamówienie, odbiorca, **liczba płytek**, status, akcje), od `md` dotychczasowa tabela. Zmiana statusu działa z karty.
- Zamówienia (`src/app/admin/orders/*`, także „nowe zamówienie”): lista jako karty poniżej `md`, formularz nowego zamówienia w jednej kolumnie.
- e2e (390×844): szybka aktywacja tabliczki przechodzi do końca; lista przesyłek pokazuje kartę z liczbą płytek i zmienia status; lista zamówień otwiera szczegóły. Na każdej z trzech stron brak poziomego scrolla. Istniejące e2e desktopowe zielone.

## P33 — Pozostałe strony (po PASS P32)
- customers, subscriptions, reviews, places, analytics, plates (lista), dashboard: wzorzec z audytu. Tabele z wieloma kolumnami jako karty albo `overflow-x-auto` w kontenerze tabeli (nie strony), z kluczowymi kolumnami na początku. Modale: `max-w-[calc(100vw-2rem)]`, przewijana treść.
- e2e (390×844): pętla po wszystkich stronach admina, na każdej brak poziomego scrolla strony; jeden modal (np. edycja klienta) mieści się w ekranie.

## Gotowe (każdy pakiet)
`npm test`, `npm run lint`, `npx tsc --noEmit`, e2e (przez flock, `--workers=1`) zielone. Commit bez pushu, potem review. Reviewer sprawdza też desktop.
