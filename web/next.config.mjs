import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: the project path contains a space, which
// pathname leaves percent-encoded and Turbopack then rejects.
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root; an unrelated lockfile in the home directory would
  // otherwise be inferred as the root.
  turbopack: { root: here },
  env: {
    NEXT_PUBLIC_API_BASE:
      process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000",
  },
};
export default nextConfig;
