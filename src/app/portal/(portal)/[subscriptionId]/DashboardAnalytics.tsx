"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import type { Review, CustomerLocation } from "@/lib/types";
import { t } from "@/lib/translations";

type ReviewWithPlate = Review & { plate_number: string };
type Range = "7d" | "30d" | "90d" | "1y" | "all";
type StarFilter = 1 | 2 | 3 | 4 | 5;

const STAR_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#84cc16",
  5: "#22c55e",
};

function getRanges(lang: string): { key: Range; label: string }[] {
  return [
    { key: "7d", label: t("portal_range_7d", lang) },
    { key: "30d", label: t("portal_range_30d", lang) },
    { key: "90d", label: t("portal_range_90d", lang) },
    { key: "1y", label: t("portal_range_1y", lang) },
    { key: "all", label: t("portal_range_all", lang) },
  ];
}

const DATE_LOCALES: Record<string, string> = { en: "en-US", de: "de-DE", pl: "pl-PL" };

function getCutoff(range: Range): Date {
  const now = Date.now();
  if (range === "7d") return new Date(now - 7 * 86400000);
  if (range === "30d") return new Date(now - 30 * 86400000);
  if (range === "90d") return new Date(now - 90 * 86400000);
  if (range === "1y") return new Date(now - 365 * 86400000);
  return new Date(0);
}

function weekStart(d: Date): Date {
  const day = d.getDay() === 0 ? 7 : d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day - 1));
}

function groupKey(d: Date, range: Range): string {
  if (range === "7d" || range === "30d") return d.toISOString().slice(0, 10);
  if (range === "90d") return weekStart(d).toISOString().slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatKey(key: string, range: Range, lang: string): string {
  const locale = DATE_LOCALES[lang] ?? "en-US";
  if (range === "7d" || range === "30d" || range === "90d") {
    return new Date(key + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });
  }
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString(locale, { month: "short", year: "2-digit" });
}

function buildChartData(reviews: ReviewWithPlate[], range: Range, lang: string) {
  const cutoff = getCutoff(range);
  const filtered = reviews.filter((r) => new Date(r.rating_time ?? r.created_at) >= cutoff && r.rating);

  const map = new Map<string, Record<number, number>>();
  for (const r of filtered) {
    const key = groupKey(new Date(r.rating_time ?? r.created_at), range);
    if (!map.has(key)) map.set(key, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    map.get(key)![r.rating!]++;
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, byStars]) => ({
      key,
      label: formatKey(key, range, lang),
      byStars,
      total: Object.values(byStars).reduce((s, n) => s + n, 0),
    }));
}

function BarChart({ bars, maxY, lang }: { bars: ReturnType<typeof buildChartData>; maxY: number; lang: string }) {
  if (bars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("portal_no_data_range", lang)}</p>
      </div>
    );
  }

  const H = 220;
  const barW = Math.max(12, Math.min(48, Math.floor(800 / bars.length) - 8));

  return (
    <div className="overflow-x-auto pb-2 flex justify-center">
      <svg
        viewBox={`0 0 ${Math.max(800, bars.length * (barW + 8) + 40)} ${H + 40}`}
        className="w-full max-w-4xl"
        style={{ minWidth: Math.min(800, bars.length * (barW + 8) + 40) }}
      >
        {/* Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={32}
            x2="100%"
            y1={H - f * H}
            y2={H - f * H}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeOpacity={1}
            strokeWidth={1}
            strokeDasharray={f === 0 ? "0" : "4 4"}
          />
        ))}

        {/* Bars */}
        {bars.map((bar, i) => {
          const x = 40 + i * (barW + 8);
          let yOffset = H;
          return (
            <g key={bar.key} className="group cursor-default">
              {([1, 2, 3, 4, 5] as const).map((star) => {
                const count = bar.byStars[star] ?? 0;
                if (!count) return null;
                const h = maxY > 0 ? (count / maxY) * H : 0;
                yOffset -= h;
                return (
                  <rect
                    key={star}
                    x={x}
                    y={yOffset}
                    width={barW}
                    height={h}
                    fill={STAR_COLORS[star]}
                    className="transition-all duration-300 group-hover:brightness-110"
                    rx={3}
                  >
                    <title>{`${star} ★: ${count}`}</title>
                  </rect>
                );
              })}
              <text
                x={x + barW / 2}
                y={H + 24}
                textAnchor="middle"
                fontSize={11}
                fontWeight="500"
                className="fill-gray-500 dark:fill-gray-400"
              >
                {bar.label}
              </text>
            </g>
          );
        })}

        {/* Y axis labels */}
        {maxY > 0 && [...new Set([0, Math.round(maxY / 2), maxY])].map((v) => (
          <text
            key={v}
            x={24}
            y={H - (v / maxY) * H + 4}
            textAnchor="end"
            fontSize={11}
            fontWeight="500"
            className="fill-gray-400 dark:fill-gray-500"
          >
            {v}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-6 flex-wrap">
        {([5, 4, 3, 2, 1] as const).map((star) => (
          <div key={star} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
            <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: STAR_COLORS[star] }} />
            {star} ★
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(d: string | null, lang: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(DATE_LOCALES[lang] ?? "en-US");
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

interface Props {
  subscriptionId: number;
  location: CustomerLocation | null;
  plateScanUrl: string | null;
  reviews: ReviewWithPlate[];
  totalCount: number;
  avgRating: number | null;
  byStars: Record<number, number>;
  initialStars?: number;
  scrollTo?: string;
  lang: string;
}

export default function ReviewsAnalytics({ subscriptionId, location, plateScanUrl, reviews, totalCount, avgRating, byStars, initialStars, scrollTo, lang }: Props) {
  const [range, setRange] = useState<Range>("30d");
  const [starFilter, setStarFilter] = useState<Set<StarFilter>>(
    initialStars && [1, 2, 3, 4, 5].includes(initialStars)
      ? new Set([initialStars as StarFilter])
      : new Set()
  );


  const googleReviewsSectionRef = useRef<HTMLDivElement>(null);
  const [googleReviewsHighlighted, setGoogleReviewsHighlighted] = useState(false);

  function scrollAndHighlight(
    ref: React.RefObject<HTMLDivElement | null>,
    setHighlighted: (v: boolean) => void
  ) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlighted(true);
    setTimeout(() => setHighlighted(false), 2000);
  }

  useEffect(() => {
    if (!scrollTo) return;
    // Poczekaj na pełne wyrenderowanie strony po nawigacji, zanim policzymy pozycję do scrolla.
    const timer = setTimeout(() => {
      if (scrollTo === "google-reviews") {
        scrollAndHighlight(googleReviewsSectionRef, setGoogleReviewsHighlighted);
      }
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTo]);

  const RANGES = useMemo(() => getRanges(lang), [lang]);
  const bars = useMemo(() => buildChartData(reviews, range, lang), [reviews, range, lang]);
  const maxY = useMemo(() => Math.max(...bars.map((b) => b.total), 1), [bars]);

  const displayed = useMemo(() => {
    const cutoff = getCutoff(range);
    return reviews.filter((r) => {
      const inRange = new Date(r.rating_time ?? r.created_at) >= cutoff;
      const inStars = starFilter.size === 0 || (r.rating !== null && starFilter.has(r.rating as StarFilter));
      return inRange && inStars;
    });
  }, [reviews, range, starFilter]);

  function toggleStar(s: StarFilter) {
    setStarFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const rangeTotal = displayed.length;
  const rangeAvg = rangeTotal > 0
    ? displayed.reduce((s, r) => s + (r.rating ?? 0), 0) / rangeTotal
    : null;

  return (
    <div className="space-y-6">

      <div
        ref={googleReviewsSectionRef}
        className={`space-y-5 rounded-lg transition-shadow duration-300 ${
          googleReviewsHighlighted ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900" : ""
        }`}
      >
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5 flex flex-col justify-center items-center text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("portal_average", lang)}</p>
            <div className="flex items-center gap-1">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {avgRating !== null ? avgRating.toFixed(2) : "—"}
              </p>
              <span className="text-xl text-amber-500">★</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5 flex flex-col justify-center items-center text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("portal_total", lang)}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalCount}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5 flex flex-col justify-center items-center text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">5 <span className="text-amber-500">★</span></p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{byStars[5] ?? 0}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {totalCount > 0 ? Math.round(((byStars[5] ?? 0) / totalCount) * 100) : 0}% 
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5 flex flex-col justify-center items-center text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">4 <span className="text-amber-500">★</span></p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{byStars[4] ?? 0}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {totalCount > 0 ? Math.round(((byStars[4] ?? 0) / totalCount) * 100) : 0}% 
            </p>
          </div>
        </div>

        {/* Star breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("portal_rating_distribution", lang)}
          </h3>
          <div className="space-y-3">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = byStars[star] ?? 0;
              const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-12 text-amber-500 shrink-0">{"★".repeat(star)}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: STAR_COLORS[star] }}
                    />
                  </div>
                  <span className="w-10 text-right text-gray-500 dark:text-gray-400">{count}</span>
                  <span className="w-10 text-right text-gray-400 dark:text-gray-500 text-xs">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("portal_reviews_over_time", lang)}
          </h3>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  range === r.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <BarChart bars={bars} maxY={maxY} lang={lang} />
      </div>

    </div>
  );
}
