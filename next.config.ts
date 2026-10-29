import type { NextConfig } from "next";

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

// Public pages the marketing site embeds in its live demo iframe (and talks to
// via postMessage). Everything else, incl. portal, admin and /verify, must not
// be framable by anyone.
const DEMO_EMBEDDERS = "'self' https://starlinkee.com https://www.starlinkee.com";

const nextConfig: NextConfig = {
  // The local e2e script sets this so its dev server doesn't collide with a dev server
  // already running on .next (Next allows one per dist dir).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      { source: "/:path*", headers: baseHeaders },
      {
        // Not framable: every path except the public demo-able ones below.
        source: "/((?!plate/|l/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: "/plate/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${DEMO_EMBEDDERS}` }],
      },
      {
        source: "/l/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${DEMO_EMBEDDERS}` }],
      },
    ];
  },
};

export default nextConfig;
