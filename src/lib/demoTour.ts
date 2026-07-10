export type DemoStep =
  | "linktree"
  | "loyalty"
  | "promo"
  | "promo_claim"
  | "plate_scan"
  | "rating_selected"
  | "high_rating_redirect"
  | "low_rating_feedback";

/**
 * Notifies an embedding parent window (e.g. the marketing site's live-demo
 * iframe) which screen of the review flow is currently showing. No-op when
 * not running inside an iframe.
 */
export function postDemoStep(step: DemoStep, meta?: Record<string, unknown>) {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage({ source: "starlinkee-demo", step, meta }, "*");
}
