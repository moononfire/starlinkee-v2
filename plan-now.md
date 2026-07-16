# Plan: automatyczne tłumaczenie treści w portalu klienta (AI)

Status: pomysł do przedyskutowania / nie zaimplementowane. Zapisane na podstawie rozmowy z 2026-07-16.

## Problem

Portal klienta pozwala tłumaczyć wszystkie napisy (np. teksty promocji, karty lojalnościowej) na wiele języków, bo klienci Starlinkee mogą mieć międzynarodową klientelę. Klient wpisuje ręcznie np. polski + angielski, ale musi też uzupełnić dziesiątki innych języków. Ręczne tłumaczenie przez Google Translate jest wolne (15-30 min za każdą zmianę) i niepewnej jakości, a treści zmieniają się często. Klient nie zna wszystkich języków, więc nie może zweryfikować jakości.

## Rozwiązanie: automatyczne tłumaczenie przez Claude API

### Kluczowe ustalenie
Subskrypcja Claude Code (osobista, do programowania) **nie nadaje się** do zasilania tej funkcji produktowej — nie można jej postawić na VPS jako silnik tłumaczący dla wielu klientów. Trzeba użyć **Anthropic API** (osobne konto na platform.claude.com, płatność per token, `ANTHROPIC_API_KEY` po stronie serwera). Koszt przy tej skali (krótkie teksty, raz na dobę na klienta) będzie minimalny.

### Model danych
- Każdy tłumaczalny rekord (tekst promocji, karta lojalnościowa itd.) potrzebuje:
  - `source_locale` — główny język wskazany przez klienta jako referencyjny
  - `translations: { pl: "...", en: "...", de: "..." }`
  - flaga per język `auto_translated: bool` (odróżnia tłumaczenie AI od ręcznej poprawki klienta)
- Na poziomie klienta/subskrypcji: `last_auto_translate_at` (timestamp) do limitu 24h.

### Nowa zakładka "Tłumaczenia"
- Lista wszystkich elementów wymagających tłumaczenia, pogrupowana wg zakładki źródłowej (promocje, lojalność itd.)
- Wskaźnik braków: dla każdego aktywnego języka klienta pokazuje, czy dany element ma wpisane tłumaczenie
- Link "przejdź i uzupełnij" → nawigacja do właściwej zakładki + scroll + żółte podświetlenie brakującego pola (wzorzec do zreużycia: `scrollIntoView({ behavior: "smooth", block: "center" })` już użyty w `src/app/portal/(portal)/[subscriptionId]/reviews/ReviewsAnalytics.tsx:234`)
- Przycisk "Przetłumacz wszystko" — aktywny raz na 24h, licząc od `last_auto_translate_at`

### Backend: akcja "przetłumacz wszystko"
1. Server action zbiera wszystkie teksty źródłowe klienta (język główny) w jeden JSON + listę aktywnych języków docelowych
2. Wywołanie Anthropic Messages API z system promptem dającym kontekst: "tłumaczysz UI aplikacji lojalnościowej/promocyjnej dla międzynarodowej klienteli, dbaj o naturalność i kontekst kulturowy, unikaj dosłownych tłumaczeń tam gdzie idiom nie zadziała"
3. Wymusić strukturalną odpowiedź JSON (`output_config.format` z `json_schema`) — dostajemy z powrotem dokładnie ten sam kształt danych, wypełniony po każdym języku, bez ryzyka że model dopisze coś od siebie
4. Model: **Claude Sonnet 5** (`claude-sonnet-5`) rekomendowany — jakość tłumaczenia z niuansami kulturowymi ma znaczenie, różnica kosztowa vs. Haiku przy tej skali jest pomijalna. Haiku 4.5 tańszy, ale ryzykowniejszy przy niszowych językach (chiński, tajwański)
5. Zapis wyniku, oznaczenie `auto_translated: true`, aktualizacja `last_auto_translate_at`

### Limit 24h
- Kolumna z timestampem sprawdzana **po stronie serwera** (nie tylko w UI), żeby nie dało się obejść limitu wielokrotnymi żądaniami

### Bezpieczeństwo klucza API
- `ANTHROPIC_API_KEY` w zmiennej środowiskowej po stronie serwera, wywołanie wyłącznie z server action / route handlera, nigdy z klienta

## Następne kroki (do decyzji)
- Czy w ogóle robimy — pomysł na razie do przedyskutowania
- Wybór modelu: Sonnet 5 vs Haiku 4.5 (kompromis jakość/koszt)
- Dopracowanie UX zakładki "Tłumaczenia" (mockup, priorytety wyświetlania braków)
- Implementacja: model danych → akcja tłumaczenia → UI zakładki
