# P31 — Audyt panelu admina przy 390 px

Metoda: przegląd kodu (`grep` po `<table`, `overflow-x`, `fixed inset`) + test `e2e/admin-mobile.spec.ts` ("audit: horizontal scroll per admin page") drukujący `scrollWidth` vs `innerWidth` dla każdej strony. **Pomiar (390×844) mierzy dokument ORAZ `<main>`** (`main` ma `overflow-auto`, więc za szeroka treść przewija się w nim, a nie w dokumencie — pierwszy pomiar tylko dokumentu był nieskuteczny; wykazał to review). Przed poprawką `/admin/plates` miało `main.scrollWidth=412` przy 390: nagłówek (tytuł + „Import TXT” + „Generuj kody”) w jednym wierszu bez zawijania. Poprawione w P31 (`flex-wrap`); po poprawce wszystkie 11 stron: doc=390/390, main=390/390. Tabele przewijają się w swoich kontenerach `overflow-x-auto` — na telefonie niewygodne, stąd karty w P32/P33.

| Strona | Co się łamie (z kodu) | Wzorzec |
|---|---|---|
| (wszystkie) | stały `w-56` aside + `p-8` zjadały ~290 px z 390 | **P31 zrobione**: hamburger poniżej `md`, `p-4` na telefonie, `min-w-0` na `main` |
| dashboard | pomiar: doc=390, main=390/390, brak scrolla | bez zmian |
| plates, quick-activate | tabela w `overflow-x-auto`; quick-activate: pola/przyciski | P32 (quick-activate), P33 (lista) |
| orders, orders/new | tabela w `overflow-x-auto`; formularz | P32: karty + jedna kolumna |
| shipments | tabela w `overflow-x-auto` | P32: karty z liczbą płytek i zmianą statusu |
| customers, subscriptions, reviews, places | pojedyncza tabela w `overflow-x-auto` (scroll w kontenerze, nie strony) | P33: kluczowe kolumny z przodu albo karty |
| analytics | 5 tabel w `AnalyticsDashboard.tsx`, każda w `overflow-x-auto` | P33 |
| modale | w `src/app/admin` brak `fixed inset` poza nawigacją; edycja klienta wymaga weryfikacji | P33: `max-w-[calc(100vw-2rem)]` jeśli się znajdzie |
