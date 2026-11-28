import type { NextConfig } from "next";

// App Hosting gives FIREBASE_WEBAPP_CONFIG only while building, not at run time, so the Web API
// key (office sign-in and password emails, src/server/firebase-config.ts) is kept from the build.
function buildTimeApiKey(): string {
  try {
    return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG ?? "{}").apiKey ?? "";
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  env: { FIREBASE_WEBAPP_API_KEY: buildTimeApiKey() },
  cacheComponents: true,
  partialPrefetching: true,
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
