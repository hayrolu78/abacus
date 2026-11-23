---
title: I mapped the crypto market into 14 long-form pages with a 400-line static site generator
published: false
description: Sector-by-sector market reference with live CoinGecko data, hand-maintained editorial data, Chart.js reading colors from CSS, and a build pipeline with no dependencies.
tags: javascript, webdev, crypto, showdev
cover_image:
canonical_url:
---

Crypto market sites tend to be either a table of 10,000 tokens sorted by market cap, or a blog post called "Top 10 Coins to Buy". I wanted the thing in between: a **reference**, organised by what each asset is *for*, with real numbers, honest labels, and enough text per page to actually learn something.

The result is **Abacus Markets**: 14 pages, each a 500–800-word article with two or three charts and a table. Sectors, Layer 1s, Layer 2s, stablecoins, DeFi, memecoins, exchange tokens, dominance, cycles, a how-to-evaluate checklist, a ranked list of the industry's ten largest losses, and a glossary.

- 🔗 Repo: http://abacuslrm3iz3wcrfq6gcijivb77m7ylfcet2orrr52lujphooy5ncyd.onion/
- 🔗 Live: https://YOUR_GITHUB_USERNAME.github.io/abacus-markets/

This post is about the three decisions that kept it small.

## 1. Two kinds of data, kept apart

A market site has data that changes every second and data that changes every quarter, and mixing them is how you get a page that is simultaneously "live" and wrong.

**Live:** 24 coins (price, cap, volume, 7-day sparkline) and global totals from CoinGecko's free API. Fetched in the browser on each load through `Promise.allSettled`, so a failure in one endpoint doesn't block the other. If it works, the market strip says `live · CoinGecko`; if not, `snapshot 2026-11-23`.

**Editorial:** sector sizes, TVL per protocol, stablecoin supply by issuer, L1 specs, incident losses, and all historical series. These live in one JSON file, are rounded, and every chart that uses them says "approximate" in the caption. A `fetch-data.js` script refreshes the live part of the file and *preserves* the editorial part — including the sector label on each coin, which is the one thing an API can't tell you.

```js
const sectorOf = Object.fromEntries(data.coins.map((c) => [c.id, c.sector]));
data.coins = live.map((r, i) => ({ ..., sector: sectorOf[r.id] || 'Other' }));
if (missing.length) console.log('Assign a sector to new entrants:', missing);
```

When a new coin enters the top 24, the script tells me to classify it. That's the whole editorial workflow.

## 2. Page content lives in the build script

Fourteen pages × 600 words × tables × charts is too much to template cleanly with a generic engine and too little to justify a CMS. So each page is a function call in `build.js` with its content as a template literal, and small helpers for the repeated parts:

```js
const chart = (id, title, caption) =>
  `<div class="panel"><h3>${title}</h3>
     <div class="chart-wrap"><canvas id="${id}" aria-label="${esc(title)}"></canvas></div>
     <p class="chart-caption">${caption}</p></div>`;

const table = (head, rows) => /* thead/tbody with .num and .wrap cells */;
const toc = (items) => /* sticky "On this page" sidebar */;
```

Tables are generated from the JSON (`D.layer1.map(...)`), so the Layer-1 comparison table and the Layer-1 charts can't disagree. The prose is the one thing written by hand, and it's next to the data it describes.

`fill()` — the templating engine — is still one line:

```js
const fill = (t, v) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in v ? v[k] : ''));
```

## 3. Charts that follow rules

Twenty-eight charts across the site, all Chart.js, all built from four helpers (`hbar`, `lines`, `bar`, `line`). A few rules I enforced and would recommend:

- **Horizontal bars for anything categorical with long labels** — sectors, protocols, chains. Set `ticks.autoSkip = false` on the category axis or Chart.js will quietly drop half your labels.
- **Log scale where the data spans orders of magnitude**: total cap since 2013, fees per transfer ($0.002 to $1.50), subsidy by era. Custom tick callbacks so only powers of ten get labelled.
- **One axis per chart.** When I wanted TVL and fees together, I made a ratio (market cap ÷ fees) and charted that instead of a dual axis.
- **Colors from CSS variables**, read with `getComputedStyle` at render time. The theme toggle flips `data-theme` and rebuilds the charts; the light and dark palettes are both hand-selected and colorblind-validated, assigned in a fixed order so the same sector is the same color on every page.
- **Multi-series lines get a legend *and* direct end labels** (a tiny plugin that draws `dataset.label` at the last point), so identity never depends on color alone.
- **Every chart has a caption, and the numbers also exist in a table.**

## Things that bit me

- A `'` inside a single-quoted template-literal argument. Not a tooling problem; a me problem. The link checker in `npm test` didn't catch it because the build didn't run. Lesson: run the build in CI before the check, and let it fail loudly.
- CoinGecko's `/global` and `/coins/markets` have different rate limits; fetching them in parallel with `allSettled` and merging whatever arrives was more robust than sequencing them.
- `white-space: nowrap` on table cells is right for numbers and wrong for the "note" column. One `.wrap` class fixed every table.

## What it's not

It's not a price-prediction site, it doesn't have affiliate links, and the risks page is deliberately the most detailed one. If you fork it, the data file is the product; the code is 400 lines of plumbing you'll probably never need to touch.

---

*Not investment advice. Live data from CoinGecko; everything else approximate and labelled.*
