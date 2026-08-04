/**
 * Copies the marketing landing page into web/public/landing so Vercel serves
 * it as plain static files, outside the app router, the Shell and the RTL
 * layout.
 *
 * `marketing/` is the single source of truth. This runs as `prebuild`, so a
 * local or CI build re-syncs before Next compiles.
 *
 * The output is committed rather than generated only at deploy time, because
 * Vercel's project root here is `web/` and a project whose "Include source
 * files outside of the Root Directory" setting is off never sees
 * `../marketing` during the build. Committing the copy makes the deploy work
 * either way; this script keeps the two in step so they cannot drift.
 *
 * If the source is missing (a deploy that only checked out `web/`), it leaves
 * the committed copy alone and says so, rather than failing the build.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(here, "..", "..", "marketing");
const DEST = path.resolve(here, "..", "public", "landing");

// Only what the browser needs. DESIGN.md, README.md and .impeccable/ are
// authoring artefacts and have no business on a public origin.
const INCLUDE = ["index.html", "assets"];

if (!fs.existsSync(SOURCE)) {
  console.log(`[sync-landing] ${SOURCE} not present; keeping the committed copy at public/landing.`);
  process.exit(0);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });

let files = 0;
for (const entry of INCLUDE) {
  const from = path.join(SOURCE, entry);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(DEST, entry), { recursive: true });
}

// The page is served at "/" via a rewrite, so the browser's base URL is "/",
// not "/landing/". Every relative asset path would resolve to /assets/... and
// 404. Rewriting here rather than in the source keeps `marketing/` openable
// straight from the filesystem and from its own static server.
//
// This covers href/src plus content= (the OG image) and poster= (both video
// posters); a bare href/src pass silently leaves those two behind.
const html = path.join(DEST, "index.html");
if (fs.existsSync(html)) {
  const patched = fs
    .readFileSync(html, "utf8")
    .replace(/(\b(?:href|src|content|poster)=")assets\//g, '$1/landing/assets/');
  fs.writeFileSync(html, patched);
}

// Paths inside the script resolve against the document URL ("/"), not the
// script's own URL, so the video slots need the same treatment. Without this
// a supplied hero film would be fetched from /assets/video/ and never found.
const js = path.join(DEST, "assets", "js", "site.js");
if (fs.existsSync(js)) {
  const patched = fs
    .readFileSync(js, "utf8")
    .replace(/(['"])assets\/video\//g, "$1/landing/assets/video/");
  fs.writeFileSync(js, patched);
}

for (const p of fs.readdirSync(DEST, { recursive: true })) {
  if (fs.statSync(path.join(DEST, p)).isFile()) files++;
}
console.log(`[sync-landing] ${files} files -> public/landing`);
