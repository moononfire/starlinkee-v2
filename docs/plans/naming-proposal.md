# Nazewnictwo fizycznej płytki/tabliczki NFC (P3, tylko propozycja)

Patch: `docs/plans/naming-proposal.patch` (gałąź lokalna `naming-proposal`, commit nie zmergowany; `git apply` na `feat/italian`).

## Stan dziś (liczba wystąpień w `src/lib/translations.json`)

| Język | Słowa w aplikacji | www (`starlinkee-www`) |
|---|---|---|
| PL | **tablic\*** 24 (23 klucze), **płytk\*** 17, **tabliczk\*** 7 — trzy słowa naraz, często w jednym przepływie | **tabliczka** ~86, tabliczki/ę/ce/ek ~66; „tabliczka NFC” to fraza z `keywords.md` (SEO), „tablica” 3×, „płytka” 2× |
| DE | **Platte\*** 6, **Schild\*** 4, w mailach `Platte(n)` i `Schild(er)` | **Aufsteller** ~58 (cały marketing: „NFC-Aufsteller inklusive”, „Erster Aufsteller gratis”); Schild 1× |
| IT | **targhetta** 9 (spójnie) | **targhetta** ~47, espositore 2× |
| EN | **plate** 59 (spójnie) | — |

Maile (`src/lib/email.ts`): PL płytk\* (4) + tabliczk\* (4), DE Platte (5) + Schild (5).

## Propozycja

| Język | Słowo | Uzasadnienie |
|---|---|---|
| PL | **tabliczka** | dominuje na www i w SEO („tabliczka NFC”), brzmi jak przedmiot na stole/ladzie; „tablica” sugeruje rejestrację/tablicę ogłoszeń, „płytka” kafelek |
| DE | **Aufsteller** | to słowo jest już na całym www; „Platte” znaczy talerz/płyta, „Schild” szyld (wisi na ścianie). Uwaga: rodzaj męski — zmieniają się rodzajniki („Dieser Aufsteller…”) |
| IT | **targhetta** | bez zmian, już spójne w aplikacji i na www |
| EN | **plate** | bez zmian (www EN poza zakresem; do rozważenia „stand”) |

## Co robi patch

- 50 kluczy w `translations.json` (40 PL, 10 DE), teksty w `email.ts` (PL/DE), 1 napis w `SidebarLogoPlaceholder.tsx`, 2 asercje w e2e (`Skonfiguruj swoją tabliczkę`, `Aktywuj tabliczkę`).
- Weryfikacja na gałęzi: `npm run test:e2e:local` 14/14, `npm test` jak na `feat/italian` (jedyny czerwony: istniejący wcześniej `plate-setup` DST), `tsc` czysty.
- Bez zmian: panel admina (wewnętrzny, PL, „płytka” — do osobnej decyzji VB), nazwy w kodzie/bazie (`plate`, `plates`), numeracja.

## Do decyzji VB

1. DE: „Aufsteller” (spójne z www) czy „Schild”, jeśli płytki częściej wiszą na ścianie niż stoją?
2. PL: czy przestawić także panel admina z „płytka” na „tabliczka”?
3. Czy zmergować patch po akceptacji (bez migracji, zmiana tylko tekstów).
