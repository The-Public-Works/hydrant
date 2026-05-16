import type { NextConfig } from "next";

// In production (Vercel), the Next.js app is the only thing in this
// directory — no monorepo hints needed, no /api proxy (the FastAPI shim
// isn't deployed yet). Both are dev-only conveniences.
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  ...(isDev && {
    // Silences Turbopack's "multiple lockfiles" warning when running
    // `pnpm dev` from a parent monorepo that also has a pyproject.toml.
    outputFileTracingRoot: __dirname,
    turbopack: {
      root: __dirname,
    },
    // Proxies /api/* to the local FastAPI shim during `pnpm dev`. On
    // Vercel we don't deploy the backend yet, so /demo's API calls will
    // fail at runtime — that's expected until we host the API.
    rewrites: async () => [
      {
        source: "/api/:path*",
        destination: "http://localhost:8765/api/:path*",
      },
    ],
  }),
};

export default nextConfig;
