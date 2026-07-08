export const SUPPORTED_LANGUAGES = ["en", "de", "pl"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
