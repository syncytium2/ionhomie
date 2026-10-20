// The built pages keep the promises ADR-0006 makes.  node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");

const root = join(__dirname, "..");
const site = join(root, "site");
const pages = readdirSync(site).filter((f) => f.endsWith(".html"));

test("site/ is built from the current demo/ sources", () => {
  execFileSync("python3", [join(root, "tools", "build_demo.py"), "--check"], { stdio: "pipe" });
});

for (const f of pages) {
  const html = readFileSync(join(site, f), "utf8");
  test(`${f}: refuses every request`, () => {
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
    assert.ok(csp, "has a policy");
    assert.match(csp[1], /^default-src 'none';/);
    assert.doesNotMatch(csp[1], /unsafe-inline|unsafe-eval|https?:/);
    assert.doesNotMatch(html, /\s(src|href)="https?:/, "loads nothing from elsewhere");
  });
  test(`${f}: every link leads to a page that exists`, () => {
    for (const [, href] of html.matchAll(/href="([^"#]+)"/g)) assert.ok(pages.includes(href), `${href}`);
  });
}
