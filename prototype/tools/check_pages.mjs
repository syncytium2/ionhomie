// check_pages.mjs — open every built page in a real browser, drive it, and LOOK at it.
//
//   node tools/check_pages.mjs [outdir]      (default: screenshots/)
//
// Fails on: a console error, an uncaught exception, a Content-Security-Policy violation,
// any request that leaves the file, or a page wider than a phone. Saves a desktop and a phone
// screenshot of each page, after its scripted interaction, so a change is seen, not assumed.
// Adapted from gaba_excites's scripts/screenshot.mjs.
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
const out = process.argv[2] ?? join(root, "screenshots");
mkdirSync(out, { recursive: true });

// What to do on each page before the screenshot: [action, argument, wait ms]
const SCRIPT = {
  "01_diffusion.html": [["click", "#lift", 3500]],
  "02_drift.html": [["wait", null, 5000]],
  "03_compartments.html": [["fill", "#charge=-74", 1200]],
  "04_one_channel.html": [["click", "#open", 2500]],
  "05_ghk.html": [["wait", null, 800]],
  "06_rundown.html": [["click", "#run", 5000]],
  "07_pumps.html": [["click", "#run", 2500], ["click", "#ouabain", 3000]],
  "08_chloride.html": [["click", "#preset-nkcc1", 4000]],
};

const pages = readdirSync(site).filter((f) => f.endsWith(".html")).sort();
const browser = await chromium.launch();
const problems = [];
for (const f of pages) {
  for (const [label, viewport] of [["desktop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const url = pathToFileURL(join(site, f)).href;
    page.on("console", (m) => { if (m.type() === "error") problems.push(`${f} [${label}] console: ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`${f} [${label}] pageerror: ${e.message}`));
    page.on("request", (r) => { const u = r.url(); if (u !== url && !u.startsWith("data:") && !u.startsWith("blob:")) problems.push(`${f} [${label}] request: ${u}`); });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`));
    });
    await page.goto(url);
    await page.waitForTimeout(600);
    for (const [act, arg, wait] of SCRIPT[f] || []) {
      try {
        if (act === "click") await page.click(arg, { timeout: 2000 });
        if (act === "fill") { const [sel, v] = arg.split("="); await page.fill(sel, v, { timeout: 2000 }); await page.dispatchEvent(sel, "input"); }
      } catch (e) { problems.push(`${f} [${label}] could not ${act} ${arg}: ${e.message.split("\n")[0]}`); }
      await page.waitForTimeout(wait);
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) problems.push(`${f} [${label}] wider than the viewport by ${over}px`);
    await page.screenshot({ path: join(out, `${f.replace(".html", "")}_${label}.png`), fullPage: true });
    await page.close();
  }
}
await browser.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`checked ${pages.length} pages at two widths; screenshots in ${out}`);
