import { describe, it, expect } from "vitest";
import translations from "@/lib/translations.json";

const en = translations.en as Record<string, string>;
const it_ = translations.it as Record<string, string>;
const placeholders = (s: string) => (s.match(/\{[A-Za-z_]+\}/g) ?? []).sort();

describe("Italian translations", () => {
  it("has every key English has (portal, guest screens, e-mail texts)", () => {
    const missing = Object.keys(en).filter((k) => !(k in it_));
    expect(missing).toEqual([]);
  });

  it("has no empty value and no key English lacks", () => {
    expect(Object.entries(it_).filter(([, v]) => !v.trim())).toEqual([]);
    expect(Object.keys(it_).filter((k) => !(k in en))).toEqual([]);
  });

  it("keeps the {placeholders} of the English text", () => {
    const broken = Object.keys(en).filter((k) => JSON.stringify(placeholders(en[k])) !== JSON.stringify(placeholders(it_[k] ?? "")));
    expect(broken).toEqual([]);
  });
});
