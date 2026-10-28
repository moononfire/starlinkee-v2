import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/demoTour", () => ({ postDemoStep: vi.fn() }));

import FeedbackForm from "@/components/plate/FeedbackForm";

const html = (googleReviewLink?: string | null, lang = "pl") =>
  renderToStaticMarkup(createElement(FeedbackForm, { scanId: "s1", lang, googleReviewLink }));

describe("FeedbackForm Google profile link", () => {
  it("shows a plain blue underlined link below the form for a safe Google URL", () => {
    const out = html("https://g.page/r/abc/review");
    expect(out).toContain('href="https://g.page/r/abc/review"');
    expect(out).toContain("Wolisz zostawić opinię w Google?");
    expect(out).toMatch(/target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(out).toContain("text-blue-600 underline");
    expect(out.indexOf("<a ")).toBeGreaterThan(out.indexOf("<button"));
  });

  it("is translated", () => {
    expect(html("https://g.page/r/abc", "it")).toContain("Preferisci lasciare una recensione su Google?");
  });

  it.each([null, undefined, "", "javascript:alert(1)", "http://google.com/x", "https://evil.example/google.com"])(
    "hides the link for %s",
    (link) => {
      expect(html(link)).not.toContain("<a ");
    }
  );
});
