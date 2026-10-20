#!/usr/bin/env python3
"""build_demo.py — turn demo/pages/*.html templates into single self-contained files in site/.

Each template carries three markers:

    <!--@head-->     charset, viewport, the Content-Security-Policy, the title, the style sheet
    <!--@top-->      the row (back, title, forward) and the proof-of-principle banner
    <!--@scripts-->  demo/physics.js and demo/views.js, inlined
    <!--@lab-->      (optional) demo/lab.js, the running pump–leak cell, inlined

The row is written from PAGES, the reading order, so a page is added there once
(docs/adr/0006, following ml2dl's ADR-0011). After inlining, every <script> and <style>
body is hashed into the page's policy, whose default is 'none': the browser itself refuses
every request the page might make.

    python3 tools/build_demo.py           build site/
    python3 tools/build_demo.py --check   exit 1 if site/ is out of date with demo/
"""
import base64
import hashlib
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMO = ROOT / "demo"
SITE = ROOT / "site"

SITE_NAME = "Ion homeostasis"  # working title; docs/naming.md

# Reading order: (file, title, one line for the home page). None marks a chapter not built.
PAGES = [
    ("index.html", "Ion homeostasis", None),
    ("01_diffusion.html", "Diffusion", "Fick's law by random walk: spreading time grows with distance squared."),
    ("02_drift.html", "Drift", "A field moves charged ions; against a gradient, zero net flux is the Nernst equation."),
    ("03_compartments.html", "Compartments", "A membrane, two volumes, trapped anions, and how little charge Vm takes."),
    ("04_one_channel.html", "One channel", "Open a selective channel and watch Vm run to that ion's Nernst potential."),
    ("05_ghk.html", "Two ions and GHK", "Vm between the ticks, weighted by permeability: a steady state, not an equilibrium."),
    ("06_rundown.html", "Rundown", "Leaks and no pump: gradients decay, Vm drifts toward zero, the cell swells."),
    ("07_pumps.html", "Pumps", "The Na⁺/K⁺-ATPase holds the gradients and the volume; PMCA holds Ca²⁺."),
    ("08_chloride.html", "Chloride", "NKCC1 and KCC2, running on the pump's gradients, set E_Cl and so E_GABA."),
]
LATER = [("Sandbox", "Everything unlocked at once. Not in this demo.")]

BANNER = (
    '<div class="banner"><b>Proof of principle, not the app.</b> A demo of the chapters\' views '
    "and physics, ahead of the React build. The models are illustrative and their parameters "
    "are not fit to any one cell. An unversioned copy, not from a deploy.</div>"
)


def navrow(i):
    back = PAGES[i - 1] if i > 0 else None
    fwd = PAGES[i + 1] if i + 1 < len(PAGES) else None
    title = PAGES[i][1]
    b = f'<a href="{back[0]}">← {html.escape(back[1])}</a>' if back else '<span class="none"></span>'
    f = f'<a href="{fwd[0]}">{html.escape(fwd[1])} →</a>' if fwd else '<span class="none">More to come</span>'
    return f'<nav class="navrow"><div>{b}</div><h1>{html.escape(title)}</h1><div class="fwd">{f}</div></nav>'


def chapter_list():
    items = []
    for f, t, line in PAGES[1:]:
        items.append(f'<li><a href="{f}">{html.escape(t)}</a><br><span>{html.escape(line)}</span></li>')
    for t, line in LATER:
        items.append(f'<li class="later"><b>{html.escape(t)}</b><br><span>{html.escape(line)}</span></li>')
    return '<ol class="chapters">' + "".join(items) + "</ol>"


def sha(body):
    return "'sha256-" + base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode() + "'"


def build_page(i):
    fname, title, _ = PAGES[i]
    src = (DEMO / "pages" / fname).read_text(encoding="utf-8")
    css = (DEMO / "style.css").read_text(encoding="utf-8")
    full_title = SITE_NAME if i == 0 else f"{title} · {SITE_NAME}"
    head = (
        '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta http-equiv="Content-Security-Policy" content="__CSP__">\n'
        f"<title>{html.escape(full_title)}</title>\n<style>{css}</style>"
    )
    scripts = (
        f"<script>{(DEMO / 'physics.js').read_text(encoding='utf-8')}</script>\n"
        f"<script>{(DEMO / 'views.js').read_text(encoding='utf-8')}</script>"
    )
    for marker in ("<!--@head-->", "<!--@top-->", "<!--@scripts-->"):
        if src.count(marker) != 1:
            sys.exit(f"{fname}: expected exactly one {marker}")
    out = (
        src.replace("<!--@head-->", head)
        .replace("<!--@top-->", navrow(i) + BANNER)
        .replace("<!--@chapters-->", chapter_list())
        .replace("<!--@scripts-->", scripts)
        .replace("<!--@lab-->", f"<script>{(DEMO / 'lab.js').read_text(encoding='utf-8')}</script>")
    )
    if re.search(r'\sstyle\s*=\s*"', out):
        sys.exit(f"{fname}: inline style attributes are refused by the policy; use a class")
    script_hashes = [sha(m) for m in re.findall(r"<script>(.*?)</script>", out, re.S)]
    style_hashes = [sha(m) for m in re.findall(r"<style>(.*?)</style>", out, re.S)]
    csp = (
        "default-src 'none'; "
        f"script-src {' '.join(script_hashes)}; "
        f"style-src {' '.join(style_hashes)}; "
        "img-src 'none'; base-uri 'none'; form-action 'none'"
    )
    return out.replace("__CSP__", csp)


def main():
    check = "--check" in sys.argv
    SITE.mkdir(exist_ok=True)
    stale = []
    templates = {p.name for p in (DEMO / "pages").glob("*.html")}
    listed = {f for f, _, _ in PAGES}
    if templates != listed:
        sys.exit(f"pages and PAGES disagree: only in templates {sorted(templates - listed)}, only in PAGES {sorted(listed - templates)}")
    for i, (fname, _, _) in enumerate(PAGES):
        out = build_page(i)
        dest = SITE / fname
        if check:
            if not dest.exists() or dest.read_text(encoding="utf-8") != out:
                stale.append(fname)
        else:
            dest.write_text(out, encoding="utf-8")
    if check and stale:
        sys.exit("site/ is out of date: " + ", ".join(stale) + " (run python3 tools/build_demo.py)")
    print(("checked " if check else "built ") + f"{len(PAGES)} pages in {SITE.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
