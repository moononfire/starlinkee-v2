# P31 — Audyt panelu admina przy 390 px

Metoda: przegląd kodu (`grep` po `<table`, `overflow-x`, `fixed inset`) + test `e2e/admin-mobile.spec.ts` ("audit: horizontal scroll per admin page") drukujący `scrollWidth` vs `innerWidth` dla każdej strony. **Pomiar (390×844, po zmianie nawigacji): żadna z 11 stron nie ma poziomego scrolla strony** (`scrollWidth=390`). Tabele przewijają się w swoich kontenerach `overflow-x-auto`, ale na telefonie są niewygodne — stąd karty w P32/P33.

| Strona | Co się łamie (z kodu) | Wzorzec |
|---|---|---|
| (wszystkie) | stały `w-56` aside + `p-8` zjadały ~290 px z 390 | **P31 zrobione**: hamburger poniżej `md`, `p-4` na telefonie, `min-w-0` na `main` |
| dashboard | do sprawdzenia pomiarem | bez zmian, jeśli brak scrolla |
| plates, quick-activate | tabela w `overflow-x-auto`; quick-activate: pola/przyciski | P32 (quick-activate), P33 (lista) |
| orders, orders/new | tabela w `overflow-x-auto`; formularz | P32: karty + jedna kolumna |
| shipments | tabela w `overflow-x-auto` | P32: karty z liczbą płytek i zmianą statusu |
| customers, subscriptions, reviews, places | pojedyncza tabela w `overflow-x-auto` (scroll w kontenerze, nie strony) | P33: kluczowe kolumny z przodu albo karty |
| analytics | 5 tabel w `AnalyticsDashboard.tsx`, każda w `overflow-x-auto` | P33 |
| modale | w `src/app/admin` brak `fixed inset` poza nawigacją; edycja klienta wymaga weryfikacji | P33: `max-w-[calc(100vw-2rem)]` jeśli się znajdzie |
