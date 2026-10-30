-- Korekta starych `customers.preferred_language = 'pl'` na prod (audyt i18n, punkt 3).
-- NIE WYKONYWAĆ automatycznie: SELECT i UPDATE uruchamia VB, po przeczytaniu wyników.
--
-- Skąd problem: stałe `pl` pochodzi głównie z quick-activate, który przed commitem 7e9fe0f wpisywał klientowi
-- `preferred_language: "pl"` niezależnie od języka tabliczki (docs/plans/i18n-audit-2026-10.md, punkt 3).
-- (Webhook Stripe bez kraju dawał `en`, nie `pl`.) Od P2 język właściciela = preferred_language -> plate_language -> en,
-- więc takie `pl` przesłania język tabliczki.
-- Uwaga: polski właściciel, który świadomie zamówił tabliczkę EN/DE dla turystów, ma `pl` poprawnie. Po kraju
-- (`country = 'PL'`) nie da się go odróżnić od pomyłki, dlatego UPDATE pomija klientów z krajem PL: zostają na liście
-- z SELECT-a do decyzji VB.
--
-- Przed uruchomieniem ustaw `deploy_at` na moment wdrożenia P2 (klienci utworzeni później mają język z nowych reguł).

-- (1) SELECT: klienci z `pl`, którzy mają co najmniej jedną tabliczkę w innym języku.
with params as (
  select timestamptz '2099-01-01 00:00+00' as deploy_at  -- <<< USTAW: data wdrożenia P2
),
plate_langs as (
  select s.customer_id,
         array_agg(distinct p.plate_language order by p.plate_language) as languages
  from subscriptions s
  join plates p on p.subscription_id = s.subscription_id
  group by s.customer_id
)
select c.customer_id, c.email, c.preferred_language, c.country, c.source, c.created_at, pl.languages as plate_languages,
       (c.created_at < (select deploy_at from params)) as created_before_deploy
from customers c
join plate_langs pl on pl.customer_id = c.customer_id
where c.preferred_language = 'pl'
  and exists (select 1 from unnest(pl.languages) l where l <> 'pl')
order by c.created_at;

-- (2) PROPONOWANY UPDATE: ustawia język tabliczki klientom, którzy mają `pl`, utworzeni przed wdrożeniem P2
-- nie mają kraju PL i mają dokładnie jeden język tabliczek, różny od `pl`. Klienci z kilkoma językami tabliczek zostają bez zmian
-- (lista z SELECT-a, decyzja VB). Najpierw uruchom w transakcji i sprawdź liczbę wierszy: begin; ...; rollback;
with params as (
  select timestamptz '2099-01-01 00:00+00' as deploy_at  -- <<< USTAW: data wdrożenia P2
),
plate_langs as (
  select s.customer_id,
         array_agg(distinct p.plate_language) as languages
  from subscriptions s
  join plates p on p.subscription_id = s.subscription_id
  group by s.customer_id
)
update customers c
set preferred_language = pl.languages[1]
from plate_langs pl, params
where pl.customer_id = c.customer_id
  and c.preferred_language = 'pl'
  and c.created_at < params.deploy_at
  and coalesce(c.country, '') <> 'PL'  -- polscy właściciele: decyzja VB
  and array_length(pl.languages, 1) = 1
  and pl.languages[1] <> 'pl'
  and pl.languages[1] in ('en', 'de', 'it')
returning c.customer_id, c.email, c.preferred_language;
