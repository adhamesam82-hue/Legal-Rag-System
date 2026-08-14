import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: the project path contains a space, which
// pathname leaves percent-encoded and Turbopack then rejects.
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone: a self-contained server bundle with only the
  // node_modules it actually imports. The Docker image copies that instead of
  // the full dependency tree, which is the difference between a ~200 MB image
  // and a ~1 GB one on a box with 40 GB of disk.
  output: "standalone",
  // Pin the workspace root; an unrelated lockfile in the home directory would
  // otherwise be inferred as the root.
  turbopack: { root: here },
  // Next 16 blocks dev-only resources (client chunks, HMR) requested from an
  // origin other than the one it printed at startup. Opening the app on
  // 127.0.0.1 instead of localhost otherwise serves HTML that never hydrates,
  // with no error on the page to explain why.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  env: {
    NEXT_PUBLIC_API_BASE:
      process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000",
  },
  // The marketing page owns the origin's root; the app starts at /app. Served
  // as a static file from public/, so it never enters the app router and never
  // inherits the RTL <html dir> or the Shell. beforeFiles so the rewrite is
  // decided ahead of the filesystem rather than depending on "/" having no
  // page.tsx, which would make it break silently if one were ever added back.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/landing/index.html" },
        // The Arabic page is a real URL with its own hreflang, not a toggle.
        { source: "/ar", destination: "/landing/ar/index.html" },
        { source: "/ar/", destination: "/landing/ar/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};
export default nextConfig;
