"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Review } from "@/lib/types";
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
      <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
        {t("portal_no_data_range", lang)}
      </div>
    );
  }

  const H = 160;
  const barW = Math.max(8, Math.min(40, Math.floor(560 / bars.length) - 4));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(560, bars.length * (barW + 4) + 40)} ${H + 36}`}
        className="w-full"
        style={{ minWidth: Math.min(560, bars.length * (barW + 4) + 40) }}
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
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {/* Bars */}
        {bars.map((bar, i) => {
          const x = 36 + i * (barW + 4);
          let yOffset = H;
          return (
            <g key={bar.key}>
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
                    opacity={0.85}
                    rx={2}
                  />
                );
              })}
              <text
                x={x + barW / 2}
                y={H + 16}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                opacity={0.5}
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
            x={28}
            y={H - (v / maxY) * H + 4}
            textAnchor="end"
            fontSize={9}
            fill="currentColor"
            opacity={0.4}
          >
            {v}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-3 mt-1 flex-wrap">
        {([5, 4, 3, 2, 1] as const).map((star) => (
          <div key={star} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: STAR_COLORS[star] }} />
            {"★".repeat(star)}
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
  reviews: ReviewWithPlate[];
  totalCount: number;
  avgRating: number | null;
  byStars: Record<number, number>;
  initialStars?: number;
  lang: string;
}

export default function ReviewsAnalytics({ subscriptionId, reviews, totalCount, avgRating, byStars, initialStars, lang }: Props) {
  const [range, setRange] = useState<Range>("30d");
  const [starFilter, setStarFilter] = useState<Set<StarFilter>>(
    initialStars && [1, 2, 3, 4, 5].includes(initialStars)
      ? new Set([initialStars as StarFilter])
      : new Set()
  );

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
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_total", lang)}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_average", lang)}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {avgRating !== null ? avgRating.toFixed(2) : "—"}
            <span className="text-sm font-normal text-amber-500 ml-1">★</span>
          </p>
        </div>
        {([5, 4, 3, 2, 1] as const).slice(0, 2).map((star) => (
          <div key={star} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{"★".repeat(star)}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{byStars[star] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Star breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{t("portal_rating_distribution", lang)}</h3>
        <div className="space-y-2">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = byStars[star] ?? 0;
            const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-12 text-amber-500 shrink-0">{"★".repeat(star)}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
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

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("portal_reviews_over_time", lang)}</h3>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
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

      {/* Filtered table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t("portal_reviews_count_label", lang)} ({rangeTotal}
              {rangeAvg !== null && (
                <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">· {t("portal_avg_abbrev", lang)} {rangeAvg.toFixed(2)} ★</span>
              )}
              )
            </h3>
            <div className="flex gap-1.5 flex-wrap">
              {([5, 4, 3, 2, 1] as const).map((star) => (
                <button
                  key={star}
                  onClick={() => toggleStar(star)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                    starFilter.has(star)
                      ? "border-transparent text-white"
                      : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                  }`}
                  style={starFilter.has(star) ? { background: STAR_COLORS[star] } : {}}
                >
                  {"★".repeat(star)}
                </button>
              ))}
              {starFilter.size > 0 && (
                <button
                  onClick={() => setStarFilter(new Set())}
                  className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕ {t("portal_clear_filter", lang)}
                </button>
              )}
            </div>
          </div>
        </div>

        {displayed.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            {t("portal_no_reviews_filtered", lang)}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_date", lang)}</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_plate", lang)}</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_rating", lang)}</th>
                <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">{t("portal_comment", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((review) => (
                <tr key={review.review_id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(review.rating_time ?? review.created_at, lang)}
                  </td>
                  <td className="px-5 py-3 font-mono text-gray-900 dark:text-gray-100">
                    {review.plate_number}
                  </td>
                  <td className="px-5 py-3">
                    {review.rating ? <Stars rating={review.rating} /> : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate hidden sm:table-cell">
                    {review.feedback_message ? (
                      <Link
                        href={`/portal/${subscriptionId}/messages?review=${review.review_id}`}
                        className="hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                        title={t("portal_open_in_messages", lang)}
                      >
                        {review.feedback_message}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
