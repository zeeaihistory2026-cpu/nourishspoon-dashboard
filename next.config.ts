import type { NextConfig } from "next";
import path from "node:path";
import { existsSync } from "node:fs";

const root = existsSync(path.resolve(process.cwd(), "../../functions/src"))
  ? path.resolve(process.cwd(), "../..") : process.cwd();

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  /* config options here */
  // Cache Components is off: every page sits behind the admin auth gate and
  // reads live Firestore data per request, so static prerendering buys
  // nothing and breaks useSearchParams-based drawers/dialogs at build time.
  cacheComponents: false,
  turbopack: {
    root,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
