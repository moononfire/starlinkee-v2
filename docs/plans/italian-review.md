# Włoski: miejsca do przeglądu przez native speakera

Sekcja `it` w `src/lib/translations.json` (34 klucze). Forma: "tu" (nieformalna) w komunikatach dla klienta końcowego, neutralna w formularzu właściciela. Przejrzeć całość przed pierwszym klientem.

| Klucz | Tekst IT | Powód wątpliwości |
|---|---|---|
| plate_* (inactive/renew) | "targhetta" | pl/en mówią "tablica/plate"; "targhetta" (plakietka) wybrane jako naturalne dla fizycznej płytki, "targa" kojarzy się z tablicą rejestracyjną |
| sorry_share_feedback | "Ci dispiace molto. Condividi con noi il tuo feedback." | oryginał "Przykro nam to słyszeć"; wolne tłumaczenie |
| setup_form_support_email_hint | "reclamo" | może brzmieć zbyt formalnie/prawniczo, alternatywa "segnalazione" |
| setup_form_title / submit | "Configura / Attiva la targhetta" | tryb rozkazujący tu, bez "Lei" |
| email_required_input | "E-mail (obbligatoria)" | pisownia "e-mail" vs "email" |

## Poza zakresem, ale zauważone
- `PlateSetupForm.tsx` ma teksty na sztywno po angielsku ("Failed to load business details", "Something went wrong") oraz komunikaty błędów z API (`/api/plate/setup`) są po angielsku. Dotyczy też en/de/pl, nie tylko włoskiego.

## Linktree /l/* (rozszerzenie)

Sekcja `it` ma teraz 34 + 17 kluczy więcej (linktree, promo, loyalty, placeholdery edytorów).

**Do weryfikacji prawnej (RODO), obowiązkowo przed włączeniem klienta:**
- `consent_text`: "Acconsento al trattamento dei dati personali per finalità di marketing." (formularz promo na /l)
- `portal_promo_consent_text`: "Acconsento al trattamento dei miei dati personali per finalità di marketing." (podgląd w portalu; wersja pl/en jest tam skrócona "…", więc włoska jest pełnym zdaniem; sprawdzić, czy ma być spójna z `consent_text`)
- `consent_required`: "Questo campo è obbligatorio."

Inne uwagi:
- `scan_nfc_for_promo`: dopisane "Avvicina il telefono" (wersja pl/en: "zeskanuj tabliczkę"), bo po włosku naturalniej.
- `portal_promo_sms_placeholder` (domyślny SMS): "Ciao! La tua promozione è pronta da ritirare: {link}", tylko znaki GSM-7 (test w repo).
- Klucz `processing` nie istnieje w en/de/pl (pokazuje się surowy tekst "processing" w ClaimClient i /verify); dla `it` dodany "Elaborazione...". Do osobnej poprawki w en/de/pl.

Poza zakresem, zauważone: admin `LocationEditForm` zapisuje linki przez delete+insert bez `icon`/`background`, więc zapis w adminie kasuje ikony i tła linków ustawione w portalu (istniejący błąd, nie związany z włoskim).

## Strona nieaktywnej tabliczki (nowy ton)
Przepisane `plate_inactive_title/exception`, `plate_renew_description/button_*` (it do przeglądu native speakera: "sospesa", "Nulla di grave: basta rinnovarlo"). DE: "Schild" zamiast dotychczasowego "Kennzeichen" (tablica rejestracyjna), forma Sie; do przeglądu.

### Propozycje tonu (bez zmian w kodzie)
- `/api/plate/setup`: błędy wracają po angielsku jako surowy tekst ("Invalid activation code", "Too many attempts", "Plate has no subscription"), a formularz je wyświetla bez tłumaczenia. Propozycja: klucze błędów (`setup_error_activation_code`, `setup_error_too_many`, `setup_error_generic`) w 4 językach i mapowanie kodu błędu po stronie formularza. PL np. "Ten kod nie pasuje. Sprawdź go w mailu, który dostałeś po przypisaniu tabliczki." / "Za dużo prób. Spróbuj za kilka minut."
- `scan_expired_title/message`: wszystkie języki mają dziś tekst angielski ("Scan Session Expired"). PL: "Ten skan już wygasł" / "Zeskanuj tabliczkę jeszcze raz, żeby zostawić opinię." Do przetłumaczenia na pl/de/it.
- Formularz setupu: hinty są poprawne, ale długie; krótsze zdania na "Ty", np. kod aktywacyjny: "Kod z maila, który wysłaliśmy po przypisaniu tabliczki."
- Ekran gościa dla tabliczki niedostępnej (`plate_unavailable_title/message`): IT "Questa targhetta è temporaneamente non disponibile" / "Riprova più tardi." Do przeglądu. Przyciski odnowienia (`plate_renew_*`) są teraz tylko w portalu właściciela (en/de/pl).
- `prefer_google_review_link` (link pod formularzem uwag): IT "Preferisci lasciare una recensione su Google?" / DE "Lieber eine Bewertung bei Google hinterlassen?". Do przeglądu.
