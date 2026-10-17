import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components is off: every page sits behind the admin auth gate and
  // reads live Firestore data per request, so static prerendering buys
  // nothing and breaks useSearchParams-based drawers/dialogs at build time.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
