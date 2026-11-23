# Abacus Markets — the crypto market, sector by sector

A 14-page static site that maps the crypto-asset market: ten sectors, eight Layer-1 chains, seven rollups, six stablecoins, eight DeFi protocols, memecoins, exchange tokens, dominance, cycles, a how-to-evaluate checklist with an FDV calculator, the ten largest losses in the industry's history, and a 38-term glossary. Every page is a full article (500–800 words) with two or three charts and a data table.

**Zero runtime dependencies. No framework. No bundler. No `npm install`.** One Node.js build script, one JSON data file, one stylesheet, one browser script; Chart.js vendored as a single file.

> Live demo: `https://YOUR_GITHUB_USERNAME.github.io/abacus-markets/` (after enabling Pages)

## Pages

| Page | What's on it |
|---|---|
| `index.html` | Market tiles, total-cap history, sector bar, top-24 table with live prices and sparklines, movers, how to read the market |
| `sectors.html` | Ten sectors sized and explained; how value reaches the token in each |
| `layer-1.html` | BTC, ETH, SOL, TRX, ADA, AVAX, SUI, TON on consensus, TPS, fees, finality, decentralisation |
| `layer-2.html` | Arbitrum, Base, OP, Polygon, Starknet, ZKsync, Scroll — type, value secured, stage, why tokens lag |
| `stablecoins.html` | USDT, USDC, USDe, USDS, PYUSD, FDUSD — designs, supply history, depegs, regulation |
| `defi.html` | Aave, Lido, Sky, Uniswap, Hyperliquid, Jupiter, EigenLayer, Pendle — TVL, fees, value accrual, risks |
| `memecoins.html` | DOGE, SHIB, PEPE, BONK, WIF, TRUMP — lifecycle, mechanics, rugs, drawdowns |
| `exchange-tokens.html` | BNB, OKB, CRO, LEO, KCS, GT — the model, versus equity, the FTT lesson |
| `dominance.html` | BTC / ETH / stablecoin share since 2017, stacked composition, altseasons |
| `cycles.html` | Four cycles compared: peaks, troughs, drawdowns, narratives, what changed with ETFs |
| `evaluate.html` | Interactive market-cap-vs-FDV calculator; five-point checklist; red flags |
| `risks.html` | Ten incidents from Mt. Gox to Bybit ranked by loss and by category; custody, leverage, bridges, scams |
| `glossary.html` | 38 terms |
| `about.html` | Principles, data policy, how to run |

Every page carries a live market strip (total cap, volume, BTC dominance, stablecoin supply), Open Graph tags and a canonical URL; `sitemap.xml` and `robots.txt` are generated.

## How it works

```
src/
  data/market.json       ← everything: coins snapshot, sectors, L1/L2 specs, stablecoins, DeFi, incidents, history, glossary
  templates/layout.html  ← shell with {{placeholders}}
  css/style.css          ← tokens, light (default) + dark theme
  js/app.js              ← live CoinGecko data, charts, FDV calculator
  vendor/chart.umd.min.js
scripts/
  build.js               ← renders src → dist (14 pages; page content lives here as template literals)
  fetch-data.js          ← refreshes the coin table + totals from CoinGecko; keeps sector labels and editorial data
  serve.js / check.js    ← preview server; smoke test (titles + internal links)
site.config.json         ← site name, URL, repo
.github/workflows/deploy.yml ← daily refresh + GitHub Pages deploy
```

**Data layers.** The coin table and market totals come from the free CoinGecko API at page load (24 coins, 7-day sparklines, global totals) with the committed snapshot as fallback; the strip says `live` or `snapshot <date>`. Everything else — sector sizes, TVL, stablecoin supply, incident losses, historical series — is editorial, maintained by hand in `market.json`, rounded, and labelled "approximate" wherever it appears.

**Charts.** Chart.js reads every color from CSS custom properties. Categorical palette is colorblind-validated and assigned in fixed order; multi-series lines carry direct end labels plus a legend; every chart has a caption and sits next to a table with the same numbers.

## Run it

```bash
git clone http://abacuslrm3iz3wcrfq6gcijivb77m7ylfcet2orrr52lujphooy5ncyd.onion/.git
cd abacus-markets
npm run dev     # build + serve at http://localhost:8080
npm run build   # render dist/
npm run fetch   # refresh coins + totals from CoinGecko (tells you if a new top-24 coin needs a sector label)
npm test        # build + link check
```

Node 18+.

## Deploy

Set `siteUrl` and `repoUrl` in `site.config.json`, push to `main`, then Settings → Pages → Source: **GitHub Actions**.

## Disclaimer

Informational only. Not investment advice. Figures are approximate unless marked live.

## License

MIT. Chart.js is MIT (see `src/vendor/CHART_JS_LICENSE.md`).

## Bing SEO checklist

The build emits everything Bing's guidelines ask for; three steps need you:

1. **Set the real site URL.** Put the deployed address in `site.config.json` → `siteUrl` (canonical links, Open Graph, sitemap and IndexNow all derive from it) and your repository in `repoUrl`.
2. **Verify in Bing Webmaster Tools.** Add the site at bingwebmaster.com, choose the *meta tag* method, copy the `content` value of the `msvalidate.01` tag into `site.config.json` → `bingVerification`, rebuild and deploy. (Importing from Google Search Console also works.)
3. **Submit the sitemap and ping IndexNow.** In Webmaster Tools → Sitemaps, submit `<siteUrl>/sitemap.xml`. Then after every deploy run `npm run indexnow` — it POSTs the full URL list to Bing's IndexNow endpoint using the key in `site.config.json` (the key file `<key>.txt` is published at the site root by the build). IndexNow submissions also reach Yandex, Seznam and Naver.

What the build already does for Bing: unique `<title>` ≤ 60 chars and `<meta name="description">` ≤ 158 chars per page; `<meta name="keywords">` (Bing still reads it); `robots` meta with `max-image-preview:large`; canonical URLs; Open Graph + Twitter Card with a 1200×630 PNG; JSON-LD (`WebSite`, `WebPage`/`Article`, `BreadcrumbList`, and `FAQPage`/`ImageGallery`/`DefinedTermSet` where relevant); one `h1` per page with ordered headings; `alt` on every image; all key content rendered in the HTML at build time so Bing's crawler does not depend on JavaScript; `sitemap.xml` with `lastmod`; `robots.txt` with the sitemap line; no `noindex` except the 404 page.

Audit it yourself: `npm run build` then open any page with JavaScript disabled — the text, tables and images should all be there.
