export const PAGE_BACKGROUND_KEYS = [
  "default",
  "blue",
  "teal",
  "green",
  "yellow",
  "orange",
  "rose",
  "pink",
  "purple",
  "gray",
] as const;

export type PageBackgroundKey = (typeof PAGE_BACKGROUND_KEYS)[number];

export function isPageBackgroundKey(value: unknown): value is PageBackgroundKey {
  return typeof value === "string" && (PAGE_BACKGROUND_KEYS as readonly string[]).includes(value);
}

interface PageBackgroundStyle {
  page: string;
  swatch: string;
}

const PAGE_BACKGROUNDS: Record<PageBackgroundKey, PageBackgroundStyle> = {
  default: { page: "bg-white", swatch: "bg-white border border-gray-300" },
  blue: { page: "bg-blue-50", swatch: "bg-blue-200" },
  teal: { page: "bg-teal-50", swatch: "bg-teal-200" },
  green: { page: "bg-emerald-50", swatch: "bg-emerald-200" },
  yellow: { page: "bg-yellow-50", swatch: "bg-yellow-200" },
  orange: { page: "bg-orange-50", swatch: "bg-orange-200" },
  rose: { page: "bg-rose-50", swatch: "bg-rose-200" },
  pink: { page: "bg-pink-50", swatch: "bg-pink-200" },
  purple: { page: "bg-violet-50", swatch: "bg-violet-200" },
  gray: { page: "bg-gray-100", swatch: "bg-gray-300" },
};

export function getPageBackground(key?: string | null): PageBackgroundStyle {
  if (isPageBackgroundKey(key)) return PAGE_BACKGROUNDS[key];
  return PAGE_BACKGROUNDS.default;
}
