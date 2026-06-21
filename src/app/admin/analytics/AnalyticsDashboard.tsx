"use client";

import { useCallback, useEffect, useState } from "react";

interface AnalyticsData {
  total_views: number;
  unique_sessions: number;
  by_page_type: { type: string; views: number; sessions: number }[];
  by_location: {
    location_id: number;
    location_name: string;
    views: number;
    sessions: number;
    has_linktree_access: boolean;
    has_promo_enabled: boolean;
    has_loyalty_enabled: boolean;
  }[];
  daily_views: { date: string; views: number; sessions: number }[];
  hourly_distribution: { hour: number; views: number }[];
  weekday_distribution: { day: number; views: number }[];
  funnel: {
    plate_scan: number;
    linktree: number;
    review: number;
    promo: number;
    promo_claim: number;
    loyalty: number;
  };
  session_flows: { flow: string; count: number }[];
  adoption: {
    location_name: string;
    linktree_enabled: boolean;
    linktree_views: number;
    promo_enabled: boolean;
    promo_views: number;
    loyalty_enabled: boolean;
    loyalty_views: number;
  }[];
  recent_views: {
    id: number;
    page_path: string;
    page_type: string;
    referrer: string | null;
    created_at: string;
    session_id: string;
  }[];
}

interface Location {
  location_id: number;
  location_name: string;
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  linktree: "Linktree",
  review: "Recenzja",
  promo: "Promo",
  promo_claim: "Odbiór kuponu",
  loyalty: "Loyalty",
  plate_scan: "Skan płytki",
};

const WEEKDAY_LABELS = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

const PERIOD_OPTIONS = [
  { value: 7, label: "7 dni" },
  { value: 14, label: "14 dni" },
  { value: 30, label: "30 dni" },
  { value: 90, label: "90 dni" },
  { value: 180, label: "180 dni" },
  { value: 365, label: "Rok" },
];

const TABS = [
  { id: "overview", label: "Przegląd" },
  { id: "funnel", label: "Lejek" },
  { id: "locations", label: "Lokalizacje" },
  { id: "adoption", label: "Adopcja" },
  { id: "time", label: "Czas" },
  { id: "flows", label: "Przepływy" },
  { id: "log", label: "Log" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
      <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function FunnelBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 4;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-sm text-gray-600 dark:text-gray-300 text-right shrink-0">
        {label}
      </div>
      <div className="flex-1">
        <div
          className={`h-8 rounded ${color} flex items-center px-3 text-white text-sm font-medium`}
          style={{ width: `${width}%`, minWidth: "60px" }}
        >
          {value}
        </div>
      </div>
      <div className="w-12 text-sm text-gray-500 dark:text-gray-400 text-right shrink-0">
        {pct}%
      </div>
    </div>
  );
}

function AdoptionDot({ enabled, views }: { enabled: boolean; views: number }) {
  if (!enabled)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">wyłączone</span>
    );
  if (views === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
        0 wizyt
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
      {views}
    </span>
  );
}

export default function AnalyticsDashboard({
  locations,
}: {
  locations: Location[];
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [locationId, setLocationId] = useState<number | undefined>();
  const [pageType, setPageType] = useState<string | undefined>();
  const [tab, setTab] = useState<TabId>("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (locationId) params.set("location_id", String(locationId));
    if (pageType) params.set("page_type", pageType);
    const res = await fetch(`/api/admin/analytics?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [days, locationId, pageType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectClass =
    "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Analityka
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className={selectClass}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={locationId ?? ""}
          onChange={(e) =>
            setLocationId(e.target.value ? Number(e.target.value) : undefined)
          }
          className={selectClass}
        >
          <option value="">Wszystkie lokalizacje</option>
          {locations.map((l) => (
            <option key={l.location_id} value={l.location_id}>
              {l.location_name}
            </option>
          ))}
        </select>

        <select
          value={pageType ?? ""}
          onChange={(e) => setPageType(e.target.value || undefined)}
          className={selectClass}
        >
          <option value="">Wszystkie typy stron</option>
          {Object.entries(PAGE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          Ładowanie...
        </div>
      ) : (
        <>
          {tab === "overview" && <OverviewTab data={data} />}
          {tab === "funnel" && <FunnelTab data={data} />}
          {tab === "locations" && <LocationsTab data={data} />}
          {tab === "adoption" && <AdoptionTab data={data} />}
          {tab === "time" && <TimeTab data={data} />}
          {tab === "flows" && <FlowsTab data={data} />}
          {tab === "log" && <LogTab data={data} />}
        </>
      )}
    </div>
  );
}

/* ───── OVERVIEW ───── */
function OverviewTab({ data }: { data: AnalyticsData }) {
  const maxDaily = Math.max(...data.daily_views.map((d) => d.views), 1);
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Wyświetlenia" value={data.total_views} />
        <KpiCard label="Unikalne sesje" value={data.unique_sessions} />
        <KpiCard
          label="Śr. stron / sesję"
          value={
            data.unique_sessions > 0
              ? (data.total_views / data.unique_sessions).toFixed(1)
              : "—"
          }
        />
        <KpiCard
          label="Typów stron"
          value={data.by_page_type.length}
        />
      </div>

      {/* Daily trend */}
      <Card title="Trend dzienny">
        {data.daily_views.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-1">
            {data.daily_views.map((d) => (
              <div key={d.date} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-gray-500 dark:text-gray-400 shrink-0 font-mono text-xs">
                  {d.date}
                </span>
                <div className="flex-1">
                  <Bar value={d.views} max={maxDaily} color="bg-blue-500" />
                </div>
                <span className="w-16 text-right text-gray-600 dark:text-gray-300 shrink-0">
                  {d.views}
                  <span className="text-gray-400 text-xs ml-1">
                    ({d.sessions} s.)
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* By type */}
      <Card title="Podział wg typu strony">
        {data.by_page_type.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium">Typ</th>
                <th className="pb-2 font-medium text-right">Wyświetlenia</th>
                <th className="pb-2 font-medium text-right">Sesje</th>
                <th className="pb-2 font-medium text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.by_page_type.map((t) => (
                <tr key={t.type}>
                  <td className="py-2 text-gray-900 dark:text-gray-100">
                    {PAGE_TYPE_LABELS[t.type] ?? t.type}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                    {t.views}
                  </td>
                  <td className="py-2 text-right text-gray-500 dark:text-gray-400">
                    {t.sessions}
                  </td>
                  <td className="py-2 text-right text-gray-500 dark:text-gray-400">
                    {data.total_views > 0
                      ? Math.round((t.views / data.total_views) * 100)
                      : 0}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ───── FUNNEL ───── */
function FunnelTab({ data }: { data: AnalyticsData }) {
  const f = data.funnel;
  const maxVal = Math.max(
    f.plate_scan,
    f.linktree,
    f.review,
    f.promo,
    f.promo_claim,
    f.loyalty,
    1
  );

  const steps = [
    { label: "Skan płytki", value: f.plate_scan, color: "bg-slate-500" },
    { label: "Linktree", value: f.linktree, color: "bg-blue-500" },
    { label: "Recenzja", value: f.review, color: "bg-green-500" },
    { label: "Promo", value: f.promo, color: "bg-amber-500" },
    { label: "Odbiór kuponu", value: f.promo_claim, color: "bg-orange-500" },
    { label: "Loyalty", value: f.loyalty, color: "bg-purple-500" },
  ];

  const linktreeToReview =
    f.linktree > 0 ? Math.round((f.review / f.linktree) * 100) : 0;
  const linktreeToPromo =
    f.linktree > 0 ? Math.round((f.promo / f.linktree) * 100) : 0;
  const promoToClaim =
    f.promo > 0 ? Math.round((f.promo_claim / f.promo) * 100) : 0;
  const linktreeToLoyalty =
    f.linktree > 0 ? Math.round((f.loyalty / f.linktree) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card title="Lejek konwersji">
        <div className="space-y-3">
          {steps.map((s) => (
            <FunnelBar
              key={s.label}
              label={s.label}
              value={s.value}
              maxValue={maxVal}
              color={s.color}
            />
          ))}
        </div>
      </Card>

      <Card title="Współczynniki konwersji">
        <div className="grid grid-cols-2 gap-4">
          <ConversionCard
            label="Linktree → Recenzja"
            pct={linktreeToReview}
            from={f.linktree}
            to={f.review}
          />
          <ConversionCard
            label="Linktree → Promo"
            pct={linktreeToPromo}
            from={f.linktree}
            to={f.promo}
          />
          <ConversionCard
            label="Promo → Odbiór"
            pct={promoToClaim}
            from={f.promo}
            to={f.promo_claim}
          />
          <ConversionCard
            label="Linktree → Loyalty"
            pct={linktreeToLoyalty}
            from={f.linktree}
            to={f.loyalty}
          />
        </div>
      </Card>
    </div>
  );
}

function ConversionCard({
  label,
  pct,
  from,
  to,
}: {
  label: string;
  pct: number;
  from: number;
  to: number;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {pct}%
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {from} → {to}
      </p>
    </div>
  );
}

/* ───── LOCATIONS ───── */
function LocationsTab({ data }: { data: AnalyticsData }) {
  return (
    <Card title="Wyświetlenia wg lokalizacji">
      {data.by_location.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium">Lokalizacja</th>
                <th className="pb-2 font-medium text-right">Wyświetlenia</th>
                <th className="pb-2 font-medium text-right">Sesje</th>
                <th className="pb-2 font-medium text-center">Linktree</th>
                <th className="pb-2 font-medium text-center">Promo</th>
                <th className="pb-2 font-medium text-center">Loyalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.by_location.map((l) => (
                <tr key={l.location_id}>
                  <td className="py-2 text-gray-900 dark:text-gray-100 font-medium">
                    {l.location_name}
                  </td>
                  <td className="py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                    {l.views}
                  </td>
                  <td className="py-2 text-right text-gray-500 dark:text-gray-400">
                    {l.sessions}
                  </td>
                  <td className="py-2 text-center">
                    <FeatureDot enabled={l.has_linktree_access} />
                  </td>
                  <td className="py-2 text-center">
                    <FeatureDot enabled={l.has_promo_enabled} />
                  </td>
                  <td className="py-2 text-center">
                    <FeatureDot enabled={l.has_loyalty_enabled} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ───── ADOPTION ───── */
function AdoptionTab({ data }: { data: AnalyticsData }) {
  const withAnyFeature = data.adoption.filter(
    (a) => a.linktree_enabled || a.promo_enabled || a.loyalty_enabled
  );
  const enabledNotUsed = withAnyFeature.filter(
    (a) =>
      (a.linktree_enabled && a.linktree_views === 0) ||
      (a.promo_enabled && a.promo_views === 0) ||
      (a.loyalty_enabled && a.loyalty_views === 0)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Lokalizacje z włączonym Linktree"
          value={data.adoption.filter((a) => a.linktree_enabled).length}
        />
        <KpiCard
          label="Lokalizacje z włączonym Promo"
          value={data.adoption.filter((a) => a.promo_enabled).length}
        />
        <KpiCard
          label="Lokalizacje z włączonym Loyalty"
          value={data.adoption.filter((a) => a.loyalty_enabled).length}
        />
      </div>

      {enabledNotUsed.length > 0 && (
        <Card title="Włączone ale nieużywane">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Te lokalizacje mają włączone funkcje, które nie mają żadnych wizyt w wybranym okresie.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Lokalizacja</th>
                  <th className="pb-2 font-medium text-center">Linktree</th>
                  <th className="pb-2 font-medium text-center">Promo</th>
                  <th className="pb-2 font-medium text-center">Loyalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {enabledNotUsed.map((a) => (
                  <tr key={a.location_name}>
                    <td className="py-2 text-gray-900 dark:text-gray-100">
                      {a.location_name}
                    </td>
                    <td className="py-2 text-center">
                      <AdoptionDot
                        enabled={a.linktree_enabled}
                        views={a.linktree_views}
                      />
                    </td>
                    <td className="py-2 text-center">
                      <AdoptionDot
                        enabled={a.promo_enabled}
                        views={a.promo_views}
                      />
                    </td>
                    <td className="py-2 text-center">
                      <AdoptionDot
                        enabled={a.loyalty_enabled}
                        views={a.loyalty_views}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Pełna tabela adopcji">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium">Lokalizacja</th>
                <th className="pb-2 font-medium text-center">Linktree</th>
                <th className="pb-2 font-medium text-center">Promo</th>
                <th className="pb-2 font-medium text-center">Loyalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.adoption.map((a) => (
                <tr key={a.location_name}>
                  <td className="py-2 text-gray-900 dark:text-gray-100">
                    {a.location_name}
                  </td>
                  <td className="py-2 text-center">
                    <AdoptionDot
                      enabled={a.linktree_enabled}
                      views={a.linktree_views}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <AdoptionDot
                      enabled={a.promo_enabled}
                      views={a.promo_views}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <AdoptionDot
                      enabled={a.loyalty_enabled}
                      views={a.loyalty_views}
                    />
                  </td>
                </tr>
              ))}
              {data.adoption.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    Brak danych
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ───── TIME ───── */
function TimeTab({ data }: { data: AnalyticsData }) {
  const maxHourly = Math.max(...data.hourly_distribution.map((h) => h.views), 1);
  const maxWeekday = Math.max(
    ...data.weekday_distribution.map((d) => d.views),
    1
  );

  return (
    <div className="space-y-6">
      <Card title="Rozkład godzinowy">
        <div className="flex items-end gap-1 h-40">
          {data.hourly_distribution.map((h) => {
            const height =
              maxHourly > 0 ? (h.views / maxHourly) * 100 : 0;
            return (
              <div
                key={h.hour}
                className="flex-1 flex flex-col items-center justify-end gap-1"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {h.views > 0 ? h.views : ""}
                </span>
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                <span className="text-xs text-gray-400">{h.hour}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Rozkład tygodniowy">
        <div className="space-y-2">
          {data.weekday_distribution.map((d) => (
            <div key={d.day} className="flex items-center gap-3">
              <span className="w-8 text-sm text-gray-600 dark:text-gray-300 shrink-0">
                {WEEKDAY_LABELS[d.day]}
              </span>
              <div className="flex-1">
                <Bar value={d.views} max={maxWeekday} color="bg-indigo-500" />
              </div>
              <span className="w-10 text-sm text-right text-gray-600 dark:text-gray-300 shrink-0">
                {d.views}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ───── FLOWS ───── */
function FlowsTab({ data }: { data: AnalyticsData }) {
  return (
    <Card title="Najczęstsze ścieżki użytkowników">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Sekwencja stron odwiedzanych w ramach jednej sesji. Pomaga zrozumieć
        jak użytkownicy poruszają się po serwisie.
      </p>
      {data.session_flows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {data.session_flows.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {f.flow.split(" → ").map((step, j) => (
                  <span key={j} className="flex items-center gap-1">
                    {j > 0 && (
                      <span className="text-gray-400 dark:text-gray-500">
                        →
                      </span>
                    )}
                    <span className="bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200">
                      {PAGE_TYPE_LABELS[step] ?? step}
                    </span>
                  </span>
                ))}
              </div>
              <span className="ml-4 shrink-0 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-full px-3 py-0.5">
                {f.count}x
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ───── LOG ───── */
function LogTab({ data }: { data: AnalyticsData }) {
  return (
    <Card title="Ostatnie wyświetlenia">
      {data.recent_views.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Typ</th>
                <th className="pb-2 font-medium">Ścieżka</th>
                <th className="pb-2 font-medium">Sesja</th>
                <th className="pb-2 font-medium">Referrer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.recent_views.map((v) => (
                <tr key={v.id}>
                  <td className="py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(v.created_at).toLocaleString("pl-PL")}
                  </td>
                  <td className="py-2 text-gray-900 dark:text-gray-100">
                    {PAGE_TYPE_LABELS[v.page_type] ?? v.page_type}
                  </td>
                  <td className="py-2 text-gray-600 dark:text-gray-300 font-mono text-xs">
                    {v.page_path}
                  </td>
                  <td className="py-2 text-gray-400 font-mono text-xs">
                    {v.session_id.slice(0, 8)}
                  </td>
                  <td className="py-2 text-gray-400 text-xs truncate max-w-[200px]">
                    {v.referrer ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ───── Shared components ───── */
function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-5">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FeatureDot({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${
        enabled
          ? "bg-green-500"
          : "bg-gray-300 dark:bg-gray-600"
      }`}
    />
  );
}

function EmptyState() {
  return (
    <p className="text-center text-gray-400 py-8">Brak danych w wybranym okresie</p>
  );
}
