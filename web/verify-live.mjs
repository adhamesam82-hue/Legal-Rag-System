import { chromium } from "playwright";
const out = "/private/tmp/claude-501/-Users-macbook-Desktop-Software-projects-legal-rag-system/31140a5c-f01c-420b-bac5-b68d19d85a51/scratchpad/shots";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", e => errs.push(String(e).split("\n")[0]));

await p.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
await p.waitForTimeout(800);

// Drive it: open the global AI command palette
await p.getByRole("button", { name: /Search LegalOS and ask AI/i }).click();
await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/live-command-palette.png` });
const paletteVisible = await p.locator("input").first().isVisible().catch(() => false);
await p.keyboard.press("Escape");
await p.waitForTimeout(300);

// Drive it: navigate via the sidebar to the core Matter page
await p.getByRole("link", { name: "Matters", exact: true }).click();
await p.waitForURL("**/matters", { timeout: 10000 });
await p.waitForTimeout(700);
const matterLink = p.locator('a[href="/matters/nabil-v-nile-trading"]').first();
await matterLink.click();
await p.waitForURL("**/matters/nabil-v-nile-trading", { timeout: 10000 });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/live-matter.png` });

console.log("command palette opened:", paletteVisible);
console.log("final URL:", p.url());
console.log("page errors:", errs.length ? errs : "none");
await b.close();
