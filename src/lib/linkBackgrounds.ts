export const TILE_BACKGROUND_KEYS = [
  "default",
  "solid-black",
  "solid-gray",
  "solid-blue",
  "solid-red",
  "solid-orange",
  "solid-yellow",
  "solid-green",
  "solid-teal",
  "solid-purple",
  "solid-pink",
  "pastel-peach",
  "pastel-mint",
  "pastel-lavender",
  "pastel-sky",
  "pastel-rose",
  "pastel-lemon",
  "neon-pink-purple",
  "neon-blue-cyan",
  "neon-green-lime",
  "neon-orange-red",
  "neon-purple-blue",
] as const;

export type TileBackgroundKey = (typeof TILE_BACKGROUND_KEYS)[number];

export function isTileBackgroundKey(value: unknown): value is TileBackgroundKey {
  return typeof value === "string" && (TILE_BACKGROUND_KEYS as readonly string[]).includes(value);
}

interface TileBackgroundStyle {
  tile: string;
  swatch: string;
}

const TILE_BACKGROUNDS: Record<TileBackgroundKey, TileBackgroundStyle> = {
  default: {
    tile: "bg-white border border-gray-200 text-gray-800",
    swatch: "bg-white border border-gray-300",
  },
  "solid-black": { tile: "bg-gray-900 text-white", swatch: "bg-gray-900" },
  "solid-gray": { tile: "bg-gray-200 text-gray-800", swatch: "bg-gray-200" },
  "solid-blue": { tile: "bg-blue-500 text-white", swatch: "bg-blue-500" },
  "solid-red": { tile: "bg-red-500 text-white", swatch: "bg-red-500" },
  "solid-orange": { tile: "bg-orange-500 text-white", swatch: "bg-orange-500" },
  "solid-yellow": { tile: "bg-yellow-400 text-gray-900", swatch: "bg-yellow-400" },
  "solid-green": { tile: "bg-green-500 text-white", swatch: "bg-green-500" },
  "solid-teal": { tile: "bg-teal-500 text-white", swatch: "bg-teal-500" },
  "solid-purple": { tile: "bg-purple-500 text-white", swatch: "bg-purple-500" },
  "solid-pink": { tile: "bg-pink-500 text-white", swatch: "bg-pink-500" },

  "pastel-peach": {
    tile: "bg-gradient-to-r from-orange-100 to-pink-100 text-gray-800",
    swatch: "bg-gradient-to-r from-orange-100 to-pink-100",
  },
  "pastel-mint": {
    tile: "bg-gradient-to-r from-emerald-100 to-teal-100 text-gray-800",
    swatch: "bg-gradient-to-r from-emerald-100 to-teal-100",
  },
  "pastel-lavender": {
    tile: "bg-gradient-to-r from-violet-100 to-purple-100 text-gray-800",
    swatch: "bg-gradient-to-r from-violet-100 to-purple-100",
  },
  "pastel-sky": {
    tile: "bg-gradient-to-r from-sky-100 to-blue-100 text-gray-800",
    swatch: "bg-gradient-to-r from-sky-100 to-blue-100",
  },
  "pastel-rose": {
    tile: "bg-gradient-to-r from-rose-100 to-pink-100 text-gray-800",
    swatch: "bg-gradient-to-r from-rose-100 to-pink-100",
  },
  "pastel-lemon": {
    tile: "bg-gradient-to-r from-yellow-100 to-lime-100 text-gray-800",
    swatch: "bg-gradient-to-r from-yellow-100 to-lime-100",
  },

  "neon-pink-purple": {
    tile: "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white",
    swatch: "bg-gradient-to-r from-fuchsia-500 to-purple-600",
  },
  "neon-blue-cyan": {
    tile: "bg-gradient-to-r from-blue-500 to-cyan-400 text-white",
    swatch: "bg-gradient-to-r from-blue-500 to-cyan-400",
  },
  "neon-green-lime": {
    tile: "bg-gradient-to-r from-green-400 to-lime-300 text-gray-900",
    swatch: "bg-gradient-to-r from-green-400 to-lime-300",
  },
  "neon-orange-red": {
    tile: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
    swatch: "bg-gradient-to-r from-orange-500 to-red-500",
  },
  "neon-purple-blue": {
    tile: "bg-gradient-to-r from-purple-600 to-blue-500 text-white",
    swatch: "bg-gradient-to-r from-purple-600 to-blue-500",
  },
};

export const TILE_BACKGROUND_GROUPS = [
  { key: "solid", keys: TILE_BACKGROUND_KEYS.filter((k) => k.startsWith("solid-")) },
  { key: "pastel", keys: TILE_BACKGROUND_KEYS.filter((k) => k.startsWith("pastel-")) },
  { key: "neon", keys: TILE_BACKGROUND_KEYS.filter((k) => k.startsWith("neon-")) },
] as const;

export function getTileBackground(key?: string | null): TileBackgroundStyle {
  if (isTileBackgroundKey(key)) return TILE_BACKGROUNDS[key];
  return TILE_BACKGROUNDS.default;
}
