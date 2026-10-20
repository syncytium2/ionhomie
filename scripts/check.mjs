// check.mjs — serve the built app, open every route in a real browser, drive it, and LOOK at it.
//
//   node scripts/check.mjs [outdir]      (default: screenshots/; needs a fresh `vite build`)
//
// Fails on: a console error, an uncaught exception, any request leaving the origin, a page wider
// than a phone, a missing born/version stamp, a nav bar without every chapter or without the current
// one marked, a page whose first element under the nav is not the action (docs/adr/0008, 0012), or a
// stage that draws almost no ions (it once drew none at phone width: every dot NaN).
// Adapted from gaba_excites's scripts/screenshot.mjs and the prototype's check_pages.mjs.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "screenshots";
mkdirSync(out, { recursive: true });
const PORT = 4174, ORIGIN = `http://localhost:${PORT}`;
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const cleanup = () => { try { server.kill(); } catch {} };
process.on("exit", cleanup);
for (let i = 0; i < 50; i++) { try { await fetch(ORIGIN); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

const ROUTES = {
  "": [["wait", null, 2500]],
  diffusion: [["click", "#lift", 3500]],
  drift: [["wait", null, 5000]],
  compartments: [["fill", "#charge=-80", 1200]],
  "one-channel": [["click", "#open", 2500]],
  ghk: [["wait", null, 1500]],
  rundown: [["click", "#run", 5000]],
  pumps: [["click", "#run", 2500], ["click", "#ouabain", 3000]],
  chloride: [["click", "#preset-nkcc1", 4000]],
  homeostat: [["click", "#run", 3000]],
};

const browser = await chromium.launch();
const problems = [];
for (const [route, script] of Object.entries(ROUTES)) {
  for (const [label, viewport] of [["desktop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    const name = route || "home";
    const page = await browser.newPage({ viewport });
    page.on("console", (m) => { if (m.type() === "error") problems.push(`${name} [${label}] console: ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`${name} [${label}] pageerror: ${e.message}`));
    page.on("request", (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:")) problems.push(`${name} [${label}] request: ${u}`); });
    await page.goto(`${ORIGIN}/#/${route}`);
    await page.waitForTimeout(500);
    for (const [act, arg, wait] of script) {
      try {
        if (act === "click") await page.click(arg, { timeout: 2000 });
        if (act === "fill") { const [sel, v] = arg.split("="); await page.fill(sel, v, { timeout: 2000 }); await page.dispatchEvent(sel, "input"); }
      } catch (e) { problems.push(`${name} [${label}] could not ${act} ${arg}: ${e.message.split("\n")[0]}`); }
      await page.waitForTimeout(wait);
    }
    const r = await page.evaluate(() => {
      const main = document.querySelector("main");
      const first = main?.firstElementChild;
      const stamp = document.querySelector(".navbar .stamp")?.textContent ?? "";
      const tabs = document.querySelectorAll(".navbar .tab").length;
      const here = document.querySelector(".navbar .tab.here")?.textContent ?? "";
      const ret = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "https://tonydefazio.com/");
      const retTop = ret ? ret.getBoundingClientRect().top : -1;
      const firstText = main?.querySelector(".lede, .predict, .banner, .notice, details");
      const firstCanvas = main?.querySelector("canvas");
      // the stage must actually be drawing ions: count pixels in the K⁺ blue, Cl⁻ orange or Na⁺ white
      const st = document.getElementById("stage");
      let ionPx = -1;
      if (st) {
        const d = st.getContext("2d").getImageData(0, 0, st.width, st.height).data;
        ionPx = 0;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if ((r < 120 && g > 150 && b > 200) || (r > 200 && g > 90 && g < 150 && b < 90) || (r > 225 && g > 225 && b > 225)) ionPx++;
        }
      }
      return {
        ionPx,
        over: document.documentElement.scrollWidth - window.innerWidth,
        firstHasCanvas: !!first?.querySelector("canvas"),
        textAfterCanvas: !firstText || !firstCanvas || !!(firstCanvas.compareDocumentPosition(firstText) & Node.DOCUMENT_POSITION_FOLLOWING),
        stamp, tabs, here, retText: ret?.textContent ?? "", retTop,
      };
    });
    if (r.ionPx >= 0 && r.ionPx < 300) problems.push(`${name} [${label}] the stage draws almost no ions (${r.ionPx} ion-colored pixels)`);
    if (r.over > 1) problems.push(`${name} [${label}] wider than the viewport by ${r.over}px`);
    if (!r.firstHasCanvas) problems.push(`${name} [${label}] the first element under the title row is not the action`);
    if (!r.textAfterCanvas) problems.push(`${name} [${label}] text comes before the first visual`);
    if (!/^born .+ · v\d+\.\d+\.\d+, .+$/.test(r.stamp)) problems.push(`${name} [${label}] stamp missing or malformed: "${r.stamp}"`);
    if (r.tabs !== Object.keys(ROUTES).length) problems.push(`${name} [${label}] nav shows ${r.tabs} tabs, expected ${Object.keys(ROUTES).length}`);
    if (r.retText !== "← tonydefazio.com" || r.retTop < 0 || r.retTop > 120) problems.push(`${name} [${label}] the return link to tonydefazio.com is missing or not at the top ("${r.retText}", top ${r.retTop})`);
    if (!r.here) problems.push(`${name} [${label}] nav marks no tab as the current page`);
    await page.screenshot({ path: join(out, `${name}_${label}.png`), fullPage: true });
    await page.close();
  }
}
// every stage view (docs/adr/0016), on a running cell and a fixed one, at both widths
for (const route of ["pumps", "compartments"]) {
  for (const [label, viewport] of [["desktop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    page.on("console", (m) => { if (m.type() === "error") problems.push(`${route} views [${label}] console: ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`${route} views [${label}] pageerror: ${e.message}`));
    await page.goto(`${ORIGIN}/#/${route}`);
    await page.waitForTimeout(400);
    for (const [view, act] of [["focus-ca", async () => { await page.selectOption('select[aria-label="ion to focus on"]', "Ca"); }],
                               ["focus-na", async () => { await page.selectOption('select[aria-label="ion to focus on"]', "Na"); }],
                               ["census", async () => { await page.getByRole("button", { name: "Census, 1 µm³" }).click(); }],
                               ["lens", async () => { await page.getByRole("button", { name: "Magnifier" }).click(); }],
                               ["cell", async () => { await page.getByRole("button", { name: "Cell", exact: true }).click(); }]]) {
      try { await act(); } catch (e) { problems.push(`${route} views [${label}] could not choose ${view}: ${e.message.split("\n")[0]}`); }
      await page.waitForTimeout(1500);
      await page.locator("#stage").screenshot({ path: join(out, `${route}_view-${view}_${label}.png`) });
    }
    await page.close();
  }
}
await browser.close();
cleanup();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`checked ${Object.keys(ROUTES).length} routes at two widths; screenshots in ${out}/`);
