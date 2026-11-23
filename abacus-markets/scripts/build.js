#!/usr/bin/env node
/** Abacus Markets — static site builder. No dependencies. src/ → dist/ (14 pages). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const config = require(path.join(ROOT, 'site.config.json'));
const D = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'market.json'), 'utf8'));
const layout = fs.readFileSync(path.join(SRC, 'templates', 'layout.html'), 'utf8');
const seo = require('./seo.js');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fill = (t, v) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in v ? v[k] : ''));
const compact = (n) => (n >= 1e12 ? '$' + (n / 1e12).toFixed(2) + 'T' : n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + 'B' : '$' + (n / 1e6).toFixed(0) + 'M');
const usd = (n) => (n >= 1000 ? '$' + Math.round(n).toLocaleString('en-US') : n >= 1 ? '$' + n.toFixed(2) : n >= 0.01 ? '$' + n.toFixed(3) : '$' + n.toPrecision(2));
const NAV = ['index', 'sectors', 'layer1', 'layer2', 'stablecoins', 'defi', 'memecoins', 'exchange', 'dominance', 'cycles', 'evaluate', 'risks', 'glossary', 'about'];
const pages = [];

function page(file, { title, description, nav, content, extra = {}, keywords = [] }) {
  const url = `${config.siteUrl.replace(/\/$/, '')}/${file}`;
  const SITE = config.siteUrl.replace(/\/$/, '');
  description = seo.clamp(description, 158);
  const jsonld = seo.webPage(SITE, { url, title, description, siteName: 'Abacus Markets', dateModified: D.snapshotDate });
  jsonld['@graph'].push(seo.breadcrumb([['Abacus Markets', SITE + '/']].concat(file === 'index.html' ? [] : [[title, url]])));
  const vars = {
    keywords: esc((keywords.length ? keywords : ['crypto market', title, 'cryptocurrency sectors']).join(', ')), bingMeta: seo.bingMeta(config), siteName: 'Abacus Markets', jsonld: JSON.stringify(jsonld), title: esc(title), description: esc(description), siteUrl: config.siteUrl, repoUrl: config.repoUrl, path: '/' + file, root: './', snapshotDate: D.snapshotDate, content,
    pageData: JSON.stringify({ page: nav, snapshotDate: D.snapshotDate, coins: D.coins, totals: D.totals, sectors: D.sectors, totalCapHistory: D.totalCapHistory, dominanceHistory: D.dominanceHistory, layer1: D.layer1, layer2: D.layer2, stablecoins: D.stablecoins, stablecoinHistory: D.stablecoinHistory, defi: D.defi, defiTvlHistory: D.defiTvlHistory, memecoins: D.memecoins, exchangeTokens: D.exchangeTokens, incidents: D.incidents, cycles: D.cycles, ...extra }) };
  NAV.forEach((k) => { vars['nav_' + k] = nav === k ? 'aria-current="page"' : ''; });
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, file), fill(layout, vars));
  pages.push(file);
}
const hero = (eyebrow, h1, lead) => `<section class="hero"><p class="eyebrow">${eyebrow}</p><h1>${h1}</h1><p class="lead">${lead}</p></section>`;
const tile = (label, id, sub) => `<div class="tile"><div class="label">${label}</div><div class="value" id="${id}">—</div><div class="sub">${sub}</div></div>`;
const chart = (id, title, caption, cls = '') => `<div class="panel"><p class="chart-title">${title}</p><div class="chart-wrap ${cls}"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div><p class="chart-caption">${caption}</p></div>`;
const toc = (items) => `<aside class="toc"><strong>On this page</strong>${items.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}</aside>`;
const table = (head, rows) => `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th${h.startsWith('#') ? ' class="num"' : ''}>${h.replace(/^#/, '')}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => (typeof c === 'object' ? `<td class="${c.cls}">${c.v}</td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
const num = (v) => ({ cls: 'num', v });
const wrap = (v) => ({ cls: 'wrap', v });

/* ---------------------------------------------------------------- 1. Overview */
page('index.html', {
  title: 'Crypto market overview', nav: 'index',
  description: 'The crypto-asset market in one page: total capitalisation, sector breakdown, the top 24 assets with live prices and 7-day trends, movers, and where to read next.',
  content: `
  ${hero('Market overview', 'The crypto market, sector by sector', 'Three trillion dollars spread across one store of value, a dozen smart-contract platforms, a few hundred billion in dollar tokens, and a long tail of everything else. This site explains what each part is for, how big it is, and how to tell the difference between size and substance.')}
  <section class="tiles" aria-label="Market summary">
    ${tile('Total market cap', 'tile-cap', 'All crypto assets')}${tile('24h volume', 'tile-vol', 'Spot, all venues')}${tile('Bitcoin dominance', 'tile-dom', 'BTC share of total')}${tile('Stablecoin supply', 'tile-stable', 'Dollar tokens in circulation')}${tile('DeFi TVL', 'tile-tvl', 'Value locked in protocols')}
  </section>
  <div class="grid-2">
    ${chart('chart-total', 'Total market capitalisation, 2013 → today', 'Approximate year-end values in billions, log scale. Three full cycles of roughly 4× to 40× up and 75–90% down.')}
    ${chart('chart-sectors-mini', 'Market cap by sector', 'Editorial sector sizes, approximate. Bitcoin alone is larger than every other sector combined. Full breakdown on the <a href="sectors.html">sectors page</a>.', 'tall')}
  </div>
  <h2 id="top">Top 24 assets</h2>
  <p class="muted">Live from CoinGecko when reachable, otherwise the build-time snapshot. Turnover is 24-hour volume divided by market cap: a rough liquidity gauge.</p>
  <div class="table-wrap"><table><thead><tr><th class="num">#</th><th>Asset</th><th>Sector</th><th class="num">Price</th><th class="num">7d</th><th class="num">Market cap</th><th class="num">Volume 24h</th><th class="num">Turnover</th><th>7-day</th></tr></thead><tbody id="coin-body">${D.coins.map((c) => `<tr><td class="num muted">${c.rank}</td><td><strong>${esc(c.name)}</strong> <span class="muted">${c.symbol}</span></td><td><span class="tag">${esc(c.sector)}</span></td><td class="num">${usd(c.price)}</td><td class="num">${c.change7d.toFixed(1)}%</td><td class="num">${compact(c.marketCap)}</td><td class="num">${compact(c.volume24h)}</td><td class="num">${((c.volume24h / c.marketCap) * 100).toFixed(1)}%</td><td></td></tr>`).join('')}</tbody></table></div>
  <div class="grid-2 section">
    <div class="panel"><h3>Top gainers, 7 days</h3><ul class="movers" id="gainers"></ul></div>
    <div class="panel"><h3>Top losers, 7 days</h3><ul class="movers" id="losers"></ul></div>
  </div>
  <style>.movers{list-style:none;margin:0;padding:0}.movers li{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border)}.movers li:last-child{border:0}</style>
  <h2>How to read this market</h2>
  <div class="two-col">
    <div class="prose">
      <p>Crypto looks like one asset class from a distance and like six from up close. <strong>Bitcoin</strong> trades like a macro asset: a scarce, non-sovereign store of value whose price responds to liquidity conditions and ETF flows. <strong>Layer-1 platforms</strong> are closer to technology equity: their tokens pay for computation and their value rests on whether applications and users show up. <strong>Stablecoins</strong> are the market's cash, and their supply is a better gauge of money entering or leaving than any price. <strong>DeFi tokens</strong> are the only category with auditable revenue. <strong>Memecoins</strong> are pure attention. <strong>Exchange tokens</strong> are something like equity in a venue, with the governance rights removed.</p>
      <p>These categories move together in a crash — correlations go to one when leverage unwinds — but they diverge sharply over a cycle. Bitcoin dominance rising means capital is defensive; falling means risk appetite is spreading down the list. That single ratio, charted on the <a href="dominance.html">dominance page</a>, explains more of the market than any headline.</p>
      <p>The pages that follow take each sector in turn, with the same structure: what it is, who the main assets are, what the numbers say, and where the numbers lie. The <a href="evaluate.html">how-to-evaluate page</a> collects the metrics into a checklist, and the <a href="risks.html">risks page</a> lists the ways people have actually lost money, ranked by size.</p>
    </div>
    <div class="cards" style="margin-top:0">
      <a class="card" href="sectors.html"><span class="k">Map</span><h3>Sectors</h3><p>Ten buckets, sized and explained.</p></a>
      <a class="card" href="layer-1.html"><span class="k">Compare</span><h3>Layer 1 platforms</h3><p>Eight base chains on throughput, fees, finality, decentralisation.</p></a>
      <a class="card" href="stablecoins.html"><span class="k">Money</span><h3>Stablecoins</h3><p>Six designs, one job, very different risks.</p></a>
      <a class="card" href="cycles.html"><span class="k">History</span><h3>Market cycles</h3><p>Four boom-bust cycles compared.</p></a>
    </div>
  </div>`
});

/* ---------------------------------------------------------------- 2. Sectors */
page('sectors.html', {
  title: 'Crypto market sectors', nav: 'sectors',
  description: 'The crypto market broken into ten sectors with size, share, representative assets, how value accrues to tokens in each, and what to watch.',
  content: `
  ${hero('Sectors', 'Ten buckets that explain the market', 'Market-cap rankings mix a store of value, a dozen operating systems, dollar tokens and jokes into one list. Sorting by what a token is for makes the list legible.')}
  <div class="grid-2">
    ${chart('chart-sectors', 'Share of total market cap by sector', 'Editorial classification; sizes are approximate and overlap at the edges (is TRON a Layer 1 or a payments network? both).', 'tall')}
    ${chart('chart-turnover', 'Average daily turnover by sector (top-24 assets)', 'Volume ÷ market cap, averaged across the assets in each sector. Stablecoins churn fastest because they are the quote currency; store-of-value assets slowest.', 'tall')}
  </div>
  <div class="two-col section">
    <div class="prose">
      ${D.sectors.map((s, i) => `<h2 id="s${i}">${esc(s.name)} <span class="muted" style="font-family:var(--mono);font-size:.9rem;font-weight:400">~${compact(s.capUsd)} · ${s.share}%</span></h2><p>${esc(s.blurb)}</p>`).join('')}
      <h2>How value reaches the token</h2>
      <p>The question to ask of any sector is <strong>why the token should be worth more if the thing succeeds</strong>. The answers differ by sector and are worth memorising:</p>
      <ul>
        <li><strong>Bitcoin:</strong> the token <em>is</em> the product. Demand for a scarce, neutral asset shows up directly in price.</li>
        <li><strong>Layer 1s:</strong> the token pays for blockspace and is staked to secure the chain. More usage → more fees burned or paid to stakers. Weak link: usage can migrate to L2s or cheaper chains.</li>
        <li><strong>Layer 2s:</strong> mostly governance today. Sequencer revenue exists but rarely flows to holders yet. The weakest value accrual in the market relative to activity.</li>
        <li><strong>Stablecoins:</strong> the coin is pegged, so there is nothing to accrue. Value goes to the issuer (interest on reserves), not holders. USDT's issuer earned more than most banks in 2024.</li>
        <li><strong>DeFi:</strong> protocol fees, sometimes directed to buybacks or staking. The clearest cash-flow story and therefore the easiest to value — and to see overvalued.</li>
        <li><strong>Exchange tokens:</strong> fee discounts plus burns funded by exchange profit. Value tracks the venue's fortunes and legal status.</li>
        <li><strong>Memecoins:</strong> none by design. Price is attention. Treat accordingly.</li>
      </ul>
      <div class="callout"><strong>Classification is editorial.</strong> CoinGecko, Messari and CoinMarketCap each draw the lines differently. The point is not the exact boundary but the habit of asking which bucket a token belongs in before looking at its chart.</div>
    </div>
    ${toc(D.sectors.map((s, i) => ['s' + i, s.name]))}
  </div>`
});

/* ---------------------------------------------------------------- 3. Layer 1 */
page('layer-1.html', {
  title: 'Layer 1 platforms compared', nav: 'layer1',
  description: 'Eight base-layer blockchains — Bitcoin, Ethereum, Solana, TRON, Cardano, Avalanche, Sui, TON — compared on consensus, throughput, fees, finality and decentralisation.',
  content: `
  ${hero('Layer 1', 'Eight base layers, one trade-off', 'Every chain picks a point on the triangle between decentralisation, security and speed. The table shows where each one landed; the text explains why it matters.')}
  <div class="grid-2">
    ${chart('chart-tps', 'Claimed sustained throughput (TPS)', 'Vendor figures for sustained, not peak, throughput. Real-world numbers are lower and depend on transaction mix. Bitcoin and Ethereum are low by design; their capacity lives in Lightning and rollups.', 'tall')}
    ${chart('chart-fees', 'Typical fee for a simple transfer', 'Log scale, US dollars, calm-network conditions. Fees on Ethereum and Bitcoin spike by 10–50× under load; on high-capacity chains they stay flat but the chain itself may congest.', 'tall')}
  </div>
  <div class="section">${table(['Chain', 'Consensus', '#Launch', '#TPS', 'Finality', '#Fee', 'Validators', 'VM', 'Note'], D.layer1.map((c) => [`<strong>${c.name}</strong> <span class="muted">${c.symbol}</span>`, c.consensus, num(c.launch), num(c.tps.toLocaleString('en-US')), c.finality, num('$' + c.feeUsd), c.validators, c.vm, wrap(esc(c.note))]))}</div>
  <div class="section">${chart('chart-l1-cap', 'Market cap of the Layer 1 tokens in the top 24 (plus Bitcoin for scale)', 'From the live table. Ethereum is roughly five times the next platform; the rest are within an order of magnitude of each other.', 'tall')}</div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="consensus">Consensus: who gets to write the next block</h2>
      <p><strong>Proof of work</strong> (Bitcoin) sells block production to whoever burns the most electricity. It is simple, battle-tested and expensive, which is the point: attacking it costs real resources outside the system. <strong>Proof of stake</strong> (Ethereum, Solana, Cardano, Avalanche, Sui) bonds capital inside the system instead; misbehaviour is punished by slashing the bond. It is cheaper and faster, and its security depends on the token being valuable — a circularity critics point at and proponents accept. <strong>Delegated</strong> variants (TRON's 27 super representatives) trade decentralisation for speed by letting token holders elect a small committee.</p>
      <h2 id="throughput">Throughput and the monolithic–modular split</h2>
      <p>Solana, Sui and Avalanche are <em>monolithic</em>: one chain does execution, settlement and data availability, and scales by demanding more of each validator (fast NVMe, lots of RAM, high bandwidth). Ethereum went <em>modular</em>: the base chain stays cheap to validate so that anyone can run a node, and execution moves to rollups that post data back. Both approaches work. Monolithic chains have a better user experience today; modular chains have a stronger decentralisation story and a fragmentation problem. The honest summary is that the market has not decided, and the <a href="layer-2.html">Layer 2 page</a> covers the other half of the argument.</p>
      <h2 id="finality">Finality</h2>
      <p>Finality is when a transaction can no longer be reversed. Bitcoin never formally finalises — six confirmations is a convention — while BFT-style chains (Sui, Avalanche, TON) finalise in a second or two. Ethereum sits in between at about 13 minutes, which is one reason exchanges credit deposits from different chains at different speeds.</p>
      <h2 id="decentralisation">Decentralisation, honestly measured</h2>
      <p>Validator count is the number everyone quotes and the least useful. Better questions: how much does it cost to run a node? How many entities control a third of stake (enough to halt the chain) or two-thirds (enough to rewrite it)? How many independent client implementations exist? Bitcoin and Ethereum lead on all three; most high-throughput chains have fewer than 30 entities controlling the critical third, and several run a single client.</p>
      <h2 id="valuing">What a Layer-1 token is worth</h2>
      <p>The token has two cash-flow-like properties: fees paid in it (some burned, some to validators) and the staking yield, which is mostly issuance rather than revenue. The market has consistently paid more for platforms with growing developer counts and stablecoin supply than for raw TPS, which is why Ethereum's lead has survived a decade of "Ethereum killers" and why Solana's revival tracked its return of applications rather than any protocol change.</p>
    </div>
    ${toc([['consensus', 'Consensus'], ['throughput', 'Throughput'], ['finality', 'Finality'], ['decentralisation', 'Decentralisation'], ['valuing', 'Valuing the token']])}
  </div>`
});

/* ---------------------------------------------------------------- 4. Layer 2 */
page('layer-2.html', {
  title: 'Layer 2 networks', nav: 'layer2',
  description: 'Ethereum Layer 2 rollups compared: Arbitrum, Base, OP Mainnet, Polygon, Starknet, ZKsync, Scroll — type, TVL, fees, decentralisation stage, and why their tokens lag their usage.',
  content: `
  ${hero('Layer 2', 'Rollups: where Ethereum actually runs', 'Most Ethereum transactions no longer happen on Ethereum. They happen on rollups that execute elsewhere and post results back. Seven of them, compared.')}
  <div class="grid-2">
    ${chart('chart-l2-tvl', 'Value secured by rollup', 'Approximate, including bridged and natively issued assets. Arbitrum and Base together hold more than the rest combined.', 'tall')}
    ${chart('chart-l2-ratio', 'Token market cap ÷ value secured', 'For rollups with a token in the top 24. A ratio well below 1 means the market values the token at a fraction of the economy it secures — the clearest sign that L2 tokens do not yet capture their chains\' value.', 'tall')}
  </div>
  <div class="section">${table(['Network', 'Token', 'Type', '#Value secured', '#Fee', 'Stage', 'Note'], D.layer2.map((c) => [`<strong>${c.name}</strong>`, c.token, c.type, num(compact(c.tvlUsd)), num('$' + c.feeUsd), c.stage, wrap(esc(c.note))]))}</div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="how">How a rollup works</h2>
      <p>A rollup runs its own execution environment — usually a copy of the EVM — and periodically posts two things to Ethereum: the compressed transaction data, and a commitment to the resulting state. Because the data is on Ethereum, anyone can reconstruct the rollup's state; because the commitment is on Ethereum, the rollup inherits Ethereum's ordering and censorship resistance. The expensive part, execution, is done once by the sequencer instead of by a million validators, which is where the 100× fee reduction comes from.</p>
      <h2 id="types">Optimistic vs ZK</h2>
      <p><strong>Optimistic rollups</strong> (Arbitrum, OP Mainnet, Base) post state and assume it is correct unless someone submits a fraud proof within a challenge window, typically seven days. Withdrawals to L1 therefore take a week unless you use a third-party bridge. <strong>ZK rollups</strong> (Starknet, ZKsync, Scroll, Polygon zkEVM) post a validity proof with every batch, so state is final as soon as Ethereum verifies the proof — minutes, not days. ZK proving is computationally heavy and the systems are younger; optimistic rollups shipped first and still hold most of the liquidity.</p>
      <h2 id="stages">The stages of decentralisation</h2>
      <p>L2BEAT's framework is the industry's honest scorecard. <strong>Stage 0</strong> means training wheels: the team can upgrade contracts instantly and users must trust them. <strong>Stage 1</strong> adds a working proof system and a security council with a delay on upgrades. <strong>Stage 2</strong> means the rollup is as trust-minimised as Ethereum itself; no major rollup has reached it. Every rollup in the table runs a <em>single sequencer</em> operated by the team, which can reorder or (temporarily) censor transactions, though it cannot steal.</p>
      <h2 id="tokens">Why the tokens lag</h2>
      <p>Rollup tokens are, for now, governance tokens. Sequencer fees — the actual revenue — go to the operating company or foundation, not to holders. Base has no token at all and is the busiest L2, which rather makes the point. Combine that with large unlock schedules and you get the pattern in the chart: usage up and to the right, token prices down and to the right. Whether governance tokens eventually get a claim on sequencer revenue is the open question for the sector.</p>
      <h2 id="fragmentation">Fragmentation and the fix</h2>
      <p>Fifty rollups means fifty pools of liquidity and a bridging step between any two. Shared sequencing, intent-based bridges and Ethereum's own roadmap (blobs made data cheap; "based rollups" would let Ethereum sequence them) are the proposed remedies. From a user's point of view, the practical answer today is that wallets and bridges hide the seams reasonably well, at the cost of trusting a few more intermediaries.</p>
    </div>
    ${toc([['how', 'How a rollup works'], ['types', 'Optimistic vs ZK'], ['stages', 'Decentralisation stages'], ['tokens', 'Why tokens lag'], ['fragmentation', 'Fragmentation']])}
  </div>`
});

/* ---------------------------------------------------------------- 5. Stablecoins */
page('stablecoins.html', {
  title: 'Stablecoins', nav: 'stablecoins',
  description: 'How the six main stablecoins work — Tether, USDC, USDe, USDS/DAI, PYUSD, FDUSD — their reserves, supply growth since 2018, depeg history and regulation.',
  content: `
  ${hero('Stablecoins', 'The market\'s dollars', 'Three hundred billion dollars of tokens that are supposed to be worth exactly one dollar. Most of the time they are. The interesting part is what backs them and what happens when they are not.')}
  <div class="grid-2">
    ${chart('chart-stable-supply', 'Supply by stablecoin', 'Approximate circulating supply. Two fiat-backed issuers hold about 85% of the market.', 'tall')}
    ${chart('chart-stable-history', 'Total stablecoin supply, 2018 → today', 'Approximate year-end values in billions. Supply fell for the first time in 2022 and resumed growth after the US election in 2024.', 'tall')}
  </div>
  <div class="section">${table(['Stablecoin', '#Supply', 'Mechanism', 'Issuer', 'Chains', 'Attestation', 'Note'], D.stablecoins.map((s) => [`<strong>${s.name}</strong> <span class="muted">${s.symbol}</span>`, num(compact(s.supplyUsd)), s.mechanism, s.issuer, s.chains, s.attestation, wrap(esc(s.note))]))}</div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="designs">Three designs</h2>
      <p><strong>Fiat-backed</strong> (USDT, USDC, PYUSD, FDUSD): a company holds dollars and Treasury bills and issues tokens one-for-one. Simple and scalable; the risks are the issuer's honesty, the custodian bank, and the regulator's mood. The issuer keeps the interest, which at 2024–25 rates made Tether one of the most profitable companies per employee in the world.</p>
      <p><strong>Crypto-collateralised</strong> (USDS/DAI): users lock ETH or other assets worth more than the dollars they mint, and the protocol liquidates positions that fall below the threshold. No bank is needed, but the system is only as decentralised as its collateral — and today a large share of that collateral is tokenised Treasuries and USDC.</p>
      <p><strong>Synthetic</strong> (USDe): hold staked ETH or BTC and short an equal amount of perpetual futures, so the dollar value of the pair stays flat. The funding payments on the short become yield. It works while funding is positive and exchanges stay solvent; it has not yet been through a long bear market at size.</p>
      <h2 id="depegs">When the peg breaks</h2>
      <ul>
        <li><strong>Terra UST, May 2022:</strong> an algorithmic design with no hard collateral, held up by a 20% yield and a reflexive loop with its sister token LUNA. Forty billion dollars went to zero in a week. Every "algorithmic" stablecoin since has had to explain why it is different.</li>
        <li><strong>USDC, March 2023:</strong> Circle disclosed $3.3bn of reserves stuck at Silicon Valley Bank. USDC traded at $0.88 for a weekend until the US government guaranteed deposits. Lesson: fiat-backed coins import banking risk.</li>
        <li><strong>USDT, repeatedly:</strong> brief dips to $0.95–0.97 during panics (2017, 2018, 2022), always recovered, always accompanied by arguments about reserves. The 2021 settlement with New York's attorney general established that reserves had not always been what was claimed.</li>
      </ul>
      <h2 id="regulation">Regulation</h2>
      <p>The US passed its first federal stablecoin law in 2025, requiring full reserves in cash and short Treasuries, monthly disclosure and bank-style supervision for large issuers. The EU's MiCA regime, in force since 2024, led exchanges to delist non-compliant coins (including USDT) for EU customers. The effect is a two-tier market: regulated, Treasury-backed coins for institutions, and whatever is most liquid for everyone else — which is still Tether.</p>
      <h2 id="why">Why supply matters more than price</h2>
      <p>A stablecoin's price tells you nothing; its supply tells you a lot. Supply grows when people wire dollars in to buy crypto and shrinks when they cash out. It is the cleanest flow indicator the market has, and it is on-chain and public. The historical chart above is, in effect, a chart of net money entering the system.</p>
      <div class="callout warn"><strong>Stablecoins are not deposits.</strong> No deposit insurance covers them, issuers can freeze addresses, and redemption at par is a promise by a company, not a right. For most people most of the time the distinction does not matter. It mattered a great deal in May 2022 and March 2023.</div>
    </div>
    ${toc([['designs', 'Three designs'], ['depegs', 'When the peg breaks'], ['regulation', 'Regulation'], ['why', 'Supply over price']])}
  </div>`
});

/* ---------------------------------------------------------------- 6. DeFi */
page('defi.html', {
  title: 'DeFi protocols', nav: 'defi',
  description: 'Decentralised finance explained with the eight largest protocols — Aave, Lido, Sky, Uniswap, Hyperliquid, Jupiter, EigenLayer, Pendle — their TVL, fees, token value accrual and risks.',
  content: `
  ${hero('DeFi', 'Finance as open-source software', 'Lending, trading, staking and derivatives implemented as contracts anyone can use and audit. It is the one sector where tokens have revenue you can check on-chain.')}
  <div class="grid-2">
    ${chart('chart-defi-tvl', 'Total value locked by protocol', 'Approximate. TVL counts deposits, not revenue — EigenLayer secures a lot and earns little; Hyperliquid earns a lot on comparatively little.', 'tall')}
    ${chart('chart-defi-ps', 'Market cap ÷ annual fees (protocols with a token in the top 24)', 'A crude price-to-sales multiple. Low is "cheap" only if the fees actually reach token holders — check the value-accrual column.', 'tall')}
  </div>
  <div class="section">${table(['Protocol', 'Token', 'Category', '#TVL', '#Annual fees', 'Note'], D.defi.map((p) => [`<strong>${p.name}</strong>`, p.token, p.category, num(compact(p.tvlUsd)), num(compact(p.annualFeesUsd)), wrap(esc(p.note))]))}</div>
  <div class="section">${chart('chart-defi-history', 'Total DeFi TVL, 2019 → today', 'Approximate year-end, billions. "DeFi summer" in 2020 took it from under $1bn to $15bn; the 2021 peak was ~$170bn; the sector has recovered to new highs in dollar terms but not in ETH terms.')}</div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="primitives">The four primitives</h2>
      <p><strong>Automated market makers</strong> (Uniswap, Jupiter's routed pools) replace order books with a formula: a pool of two assets, priced by their ratio. Anyone can supply liquidity and earn fees; the cost is impermanent loss when the two assets diverge. <strong>Lending markets</strong> (Aave, Sky) let you deposit one asset and borrow another against it, with rates set by utilisation and positions liquidated automatically if collateral falls. <strong>Liquid staking</strong> (Lido) turns locked staking positions into tradable tokens; <strong>restaking</strong> (EigenLayer) re-uses them as security for other services. <strong>Derivatives</strong> (Hyperliquid, Pendle) bring perpetual futures and yield-splitting on-chain, and are where most of the sector's fee growth is now.</p>
      <h2 id="accrual">Where the fees go</h2>
      <p>This is the only question that matters for valuing a DeFi token, and the answers vary wildly. Hyperliquid routes nearly all fees to buying back HYPE. Aave directs a portion to its safety module and treasury. Uniswap's fees went entirely to liquidity providers for years while UNI holders argued about a "fee switch". Lido takes 10% of staking rewards, split between node operators and the DAO treasury — not holders. EigenLayer's token is almost pure governance. Two protocols with identical TVL can have tokens worth ten times more or less because of this one design choice.</p>
      <h2 id="risks">What goes wrong</h2>
      <ul>
        <li><strong>Smart-contract bugs.</strong> Reentrancy, oracle manipulation, flawed maths. Audits reduce but do not eliminate this; the largest protocols have survived years without a critical exploit, which is itself information.</li>
        <li><strong>Oracle failures.</strong> Lending markets liquidate based on a price feed. A manipulated or stale feed causes wrongful liquidations or lets attackers borrow against worthless collateral.</li>
        <li><strong>Governance capture.</strong> Token-weighted votes can be bought. Several smaller protocols have had their treasuries voted away.</li>
        <li><strong>Composability contagion.</strong> Protocols stack on each other. When Terra fell, the lending markets that accepted UST as collateral were drained within hours.</li>
        <li><strong>Regulatory.</strong> Front-ends are companies in jurisdictions; the contracts may be unstoppable but the website is not.</li>
      </ul>
      <h2 id="tvl">Reading TVL properly</h2>
      <p>TVL is denominated in dollars, so it rises when prices rise even if not a single new coin is deposited. It also double-counts: ETH staked in Lido, restaked in EigenLayer and used as collateral in Aave is counted three times. For trend, use TVL in ETH or BTC terms; for substance, use fees. The protocols whose fees have grown through a bear market (Aave, Uniswap, Lido) are a short list and a useful one.</p>
    </div>
    ${toc([['primitives', 'The four primitives'], ['accrual', 'Where fees go'], ['risks', 'What goes wrong'], ['tvl', 'Reading TVL']])}
  </div>`
});

/* ---------------------------------------------------------------- 7. Memecoins */
page('memecoins.html', {
  title: 'Memecoins', nav: 'memecoins',
  description: 'Memecoins explained: Dogecoin, Shiba Inu, Pepe, Bonk, dogwifhat and political tokens — how launches work, the typical lifecycle, drawdowns, and why they persist.',
  content: `
  ${hero('Memecoins', 'Attention, tokenised', 'No product, no revenue, no roadmap, and a combined market cap larger than most national stock exchanges. Memecoins are the purest expression of what crypto markets are: a mechanism for pricing attention in real time.')}
  <div class="grid-2">
    ${chart('chart-meme-cap', 'Market cap of six representative memecoins', 'Approximate. Dogecoin alone is three-quarters of the sector; the rest cycle in and out of the top 100 with each wave.', 'tall')}
    ${chart('chart-meme-dd', 'Largest drawdown from all-time high', 'Every one has lost 75–92% at least once. Several have done it twice. This is the base rate.', 'tall')}
  </div>
  <div class="section">${table(['Token', 'Chain', '#Launched', '#Market cap', '#Max drawdown', 'Note'], D.memecoins.map((m) => [`<strong>${m.name}</strong> <span class="muted">${m.symbol}</span>`, m.chain, num(m.launched), num(compact(m.marketCap)), num(m.peakDrawdown + '%'), wrap(esc(m.note))]))}</div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="lifecycle">The lifecycle</h2>
      <p>A memecoin is launched, usually on Solana or an Ethereum L2, through a launchpad that creates the token and a liquidity pool in one click. Thousands launch every day; almost all die within hours. The few that catch attention go through a recognisable arc: an early community of hundreds, a viral moment (a celebrity post, a listing, a news event), a parabolic rise as newcomers chase it, a peak when the last marginal buyer arrives, and then a slow bleed punctuated by dead-cat bounces. The entire cycle can take a weekend or, for Dogecoin, a decade.</p>
      <h2 id="mechanics">Why they move the way they do</h2>
      <p>With no fundamental anchor, price is set entirely by flow. Thin liquidity means small buys move price a lot, which attracts more buys — reflexivity in its purest form. Holdings are concentrated: in most memecoins the top 100 wallets hold more than half the supply, and when they sell there is no bid. The combination produces the drawdown chart above, and it produces it every time.</p>
      <h2 id="rugs">Rugs, snipers and insiders</h2>
      <p>Most memecoin losses are not from the market but from the launch. A <strong>rug pull</strong> removes the liquidity the developer provided. <strong>Snipers</strong> buy in the same block the token launches and sell into the first wave. <strong>Insider allocations</strong> are distributed to friends before the public sees the contract. Launchpads have reduced the crudest versions (liquidity is often locked by default) but not the subtler ones. The political memecoins of 2025 showed the pattern at the largest scale yet: more than 80% of supply held by insiders, a $14bn peak within 48 hours, and most of it gone within weeks.</p>
      <h2 id="persist">Why they persist</h2>
      <p>Because they work as entertainment and occasionally as lottery tickets, and because they are the cheapest way to bootstrap a community. Bonk's airdrop is credited with reviving Solana's user base after FTX. Dogecoin has outlived hundreds of "serious" projects. Exchanges list them because they generate volume. None of that makes them investments; it does make them a permanent feature of the market, and a sector worth understanding for what it reveals about the rest.</p>
      <div class="callout warn"><strong>Base rates.</strong> If you must: size positions as if the expected value is negative, because across the population it is. The handful of thousand-× winners are what you hear about; the millions of zeros are not.</div>
    </div>
    ${toc([['lifecycle', 'The lifecycle'], ['mechanics', 'Why they move'], ['rugs', 'Rugs and insiders'], ['persist', 'Why they persist']])}
  </div>`
});

/* ---------------------------------------------------------------- 8. Exchange tokens */
page('exchange-tokens.html', {
  title: 'Exchange tokens', nav: 'exchange',
  description: 'Exchange tokens explained — BNB, OKB, CRO, LEO, KCS, GT — utility, burn mechanics, how they resemble equity, and the regulatory and concentration risks that come with them.',
  content: `
  ${hero('Exchange tokens', 'Equity-shaped, with the rights removed', 'A token issued by a trading venue, supported by that venue\'s profits, useful mainly on that venue. The closest thing crypto has to a share in a company — and a reminder of why shares come with legal rights.')}
  <div class="section">${chart('chart-ex-cap', 'Market cap by exchange token', 'Approximate. BNB is in a different league because BNB Chain gave it a second life as a Layer-1 gas token.', 'tall')}</div>
  <div class="section">${table(['Token', 'Exchange', '#Market cap', 'Utility', 'Supply mechanism'], D.exchangeTokens.map((t) => [`<strong>${t.name}</strong>`, t.exchange, num(compact(t.marketCap)), wrap(esc(t.utility)), wrap(esc(t.burn))]))}</div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="model">The model</h2>
      <p>An exchange issues a token and gives it three jobs: discounts on trading fees for holders, priority access to new listings and launchpad sales, and a supply that shrinks as the exchange uses profits to buy back and burn tokens. The burn is the key mechanism: it ties the token's scarcity to the exchange's revenue in a way that looks a lot like a share buyback. Binance has burned roughly half of BNB's original supply this way, and BNB's chart tracks Binance's market share almost perfectly.</p>
      <h2 id="equity">How it differs from equity</h2>
      <p>A shareholder owns a slice of the company: a claim on assets in bankruptcy, a vote, audited accounts, and legal recourse. A token holder has none of these. The burn is a policy the exchange can change (Crypto.com re-minted 70 billion previously burned CRO in 2025, with a vote dominated by the company's own holdings). Disclosure is whatever the exchange chooses. And the token's value is inseparable from the exchange's legal status: when the US sued Binance in 2023, BNB fell 25% in days, and when FTX collapsed, its FTT token — the collateral for much of the group's borrowing — went to zero in a week and took the exchange with it.</p>
      <h2 id="ftt">The FTT lesson</h2>
      <p>FTX's token was 'backed' by nothing but FTX, and FTX was backed in part by FTT. The exchange's affiliated trading firm held billions of FTT at inflated marks and borrowed customer deposits against it. When a rival exchange announced it would sell its FTT, the token's price collapsed, the loans went bad, and the hole in customer funds was exposed. The structure — a venue's own token as its own collateral — is the single most important thing to check about any exchange token, and it is not always visible from outside.</p>
      <h2 id="checklist">What to check</h2>
      <ul>
        <li>Is the exchange's revenue growing, and is the burn actually funded from it or from the treasury's own tokens?</li>
        <li>What share of supply does the exchange still hold? Large holdings mean the 'market cap' is mostly a number.</li>
        <li>Does the token have a life outside the exchange (BNB on BNB Chain, OKB on X Layer) or only inside it (LEO, KCS)?</li>
        <li>Where is the exchange licensed, and what happened to the token the last time a regulator acted?</li>
      </ul>
    </div>
    ${toc([['model', 'The model'], ['equity', 'Versus equity'], ['ftt', 'The FTT lesson'], ['checklist', 'What to check']])}
  </div>`
});

/* ---------------------------------------------------------------- 9. Dominance */
page('dominance.html', {
  title: 'Bitcoin dominance and altseasons', nav: 'dominance',
  description: 'Bitcoin dominance since 2017, the shares of Ethereum and stablecoins, what the ratio signals about risk appetite, and how to read an altseason.',
  content: `
  ${hero('Dominance', 'One ratio that explains the market', 'Bitcoin\'s share of total crypto market cap is the market\'s risk gauge. When it rises, money is hiding in the biggest asset. When it falls, money is reaching for everything else.')}
  <section class="tiles">${tile('BTC dominance now', 'dom-now', 'Live when reachable')}<div class="tile"><div class="label">2017 low</div><div class="value">~33%</div><div class="sub">ICO mania, Jan 2018</div></div><div class="tile"><div class="label">2019–20 high</div><div class="value">~70%</div><div class="sub">Post-crash flight to quality</div></div><div class="tile"><div class="label">2021 low</div><div class="value">~40%</div><div class="sub">DeFi, NFTs, memecoins</div></div></section>
  <div class="grid-2">
    ${chart('chart-dominance', 'Share of total market cap: Bitcoin, Ethereum, stablecoins', 'Approximate year-end values. Stablecoins\' share spikes in bear markets (2022) because everything else shrinks while they hold value.', 'tall')}
    ${chart('chart-stack', 'Composition of the market by year', 'Same data stacked to 100%. "Everything else" is the altcoin universe; its share is what people mean by altseason.', 'tall')}
  </div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="cycle">The dominance cycle</h2>
      <p>The pattern has repeated three times. Early in a cycle Bitcoin leads: it is the most liquid, the first asset institutions buy, and the one with a narrative (halving, ETFs) that does not depend on anything shipping. Dominance rises. Then Bitcoin stalls, capital rotates to Ethereum, and from Ethereum to the large alternative platforms, and from those to the small caps and memecoins. Dominance falls steeply — from 70% to 40% in the first half of 2021 — and the fall is itself the signal that the cycle is maturing. In the bust, everything falls but Bitcoin falls least, and dominance climbs back.</p>
      <h2 id="altseason">Reading an altseason</h2>
      <p>The common definition is that 75% of the top 50 coins outperform Bitcoin over 90 days. By that measure full altseasons are rare — a few months in 2017–18, a few in 2021 — and most of the time Bitcoin wins. The practical implication is uncomfortable for altcoin holders: over any full cycle, the median altcoin has underperformed Bitcoin badly, and the ones that outperformed were a small, hard-to-predict set. The 2024–25 cycle was unusual in that dominance kept rising through the bull market, because ETF money could only buy Bitcoin.</p>
      <h2 id="eth">The Ethereum ratio</h2>
      <p>ETH/BTC is the second-most-watched ratio. It peaked near 0.15 in 2017 and 0.085 in 2021, and spent 2024–25 below 0.04, its lowest in years, as capital flowed to Bitcoin ETFs and to Solana. Whether this reflects a permanent change in Ethereum's standing or a cyclical low is a live debate; the ratio has made fools of confident forecasters in both directions.</p>
      <h2 id="stables">Stablecoins as a share</h2>
      <p>Stablecoin dominance is the inverse signal: it rises when people sell into cash and wait. Its 2022 peak of about 17% marked the bottom of that bear market within a few weeks. Watching the three series together — Bitcoin, Ethereum, stablecoins — is as good a one-chart summary of market regime as exists.</p>
    </div>
    ${toc([['cycle', 'The dominance cycle'], ['altseason', 'Reading an altseason'], ['eth', 'The ETH/BTC ratio'], ['stables', 'Stablecoin share']])}
  </div>`
});

/* ---------------------------------------------------------------- 10. Cycles */
page('cycles.html', {
  title: 'Crypto market cycles', nav: 'cycles',
  description: 'The four crypto market cycles since 2011 compared: peaks, troughs, drawdowns, narratives, the halving, and what has changed with ETFs and institutional participation.',
  content: `
  ${hero('Cycles', 'Four booms, three busts', 'Crypto has gone through a four-year rhythm of mania and collapse since it was big enough to measure. Each cycle had a different story and the same shape.')}
  <div class="grid-2">
    ${chart('chart-cycles', 'Total market cap, log scale', 'Approximate year-end, billions. Each peak is roughly an order of magnitude above the last; each trough is roughly the previous peak.', 'tall')}
    ${chart('chart-cycle-dd', 'Peak-to-trough drawdown of completed cycles', 'The busts have become slightly shallower as the market has grown and diversified — 85%, 88%, 75% — but “shallower” still means losing three-quarters.', 'tall')}
  </div>
  <div class="section">${table(['Cycle', '#Peak cap', '#Trough cap', 'Peak', 'Trough', '#Drawdown', 'Narrative'], D.cycles.map((c) => [`<strong>${c.cycle}</strong>`, num('$' + c.peakCap + 'B'), num(c.troughCap == null ? '—' : '$' + c.troughCap + 'B'), c.peakDate, c.troughDate, num(c.drawdown == null ? '—' : c.drawdown + '%'), wrap(esc(c.narrative))]))}</div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="anatomy">Anatomy of a cycle</h2>
      <p><strong>Accumulation.</strong> After a crash, prices drift for a year while the people who were going to sell have sold. Volume is low, news is bad, and the builders who remain ship the things that will matter next cycle (Uniswap and Aave were built in the 2018–19 bear).</p>
      <p><strong>Markup.</strong> Bitcoin breaks its previous high. Media attention returns. New entrants arrive and buy the things they recognise, then the things their friends mention. Stablecoin supply rises.</p>
      <p><strong>Mania.</strong> Leverage builds. Funding rates on perpetuals go persistently positive. A new category captures the moment — ICOs in 2017, NFTs and DeFi in 2021, memecoins in 2024. Dominance falls as money reaches further down the list.</p>
      <p><strong>Collapse.</strong> A trigger (a hack, an exchange failure, a macro shock) forces leveraged positions to close. Selling begets selling. The category that defined the mania loses 90%+, and a few of the companies that grew with it turn out to have been insolvent.</p>
      <h2 id="halving">The halving story</h2>
      <p>Bitcoin's supply halves every four years and each halving has been followed by a cycle peak 12–18 months later. The mechanism is debated — reduced issuance is small relative to volume, and the correlation could be coincidence with global liquidity cycles, which have run on a similar rhythm. The honest statement is that the halving is a well-known schedule that market participants organise expectations around, which can make it self-fulfilling until it is not.</p>
      <h2 id="changed">What has changed</h2>
      <p>The 2024–25 cycle differed in kind. Spot ETFs gave pensions and advisers a way in that did not exist before, and they bought Bitcoin almost exclusively. Corporate treasuries accumulated. Stablecoins got a legal framework. The result was a cycle where Bitcoin dominance rose instead of falling, where the altcoin mania was concentrated in memecoins rather than spread across new platforms, and where drawdowns during the bull market were shallower than in any previous one. Whether this means the four-year cycle is dampening into something more like an ordinary asset class, or merely that the next bust is deferred, is the question of the current moment.</p>
      <h2 id="use">How to use this</h2>
      <p>Not for timing — nobody calls the top, and the people who called the last one were wrong about the previous three. The useful lessons are about behaviour: that the asset you buy at the top of a mania can take four years to recover or never; that leverage is what turns a correction into a wipeout; that the companies around the assets fail more often than the assets; and that boredom, not fear, is what the bottom feels like.</p>
    </div>
    ${toc([['anatomy', 'Anatomy of a cycle'], ['halving', 'The halving'], ['changed', 'What has changed'], ['use', 'How to use this']])}
  </div>`
});

/* ---------------------------------------------------------------- 11. Evaluate */
page('evaluate.html', {
  title: 'How to evaluate a crypto asset', nav: 'evaluate',
  description: 'A checklist for evaluating any crypto token: market cap vs FDV, unlocks, revenue and value accrual, liquidity and turnover, holders, and the red flags — with an interactive FDV calculator.',
  content: `
  ${hero('How to evaluate', 'Size is not substance', 'Market cap tells you how big something is. These are the questions that tell you whether it should be.')}
  <div class="grid-2">
    <div class="panel">
      <h2 style="margin-top:0;font-size:1.2rem">Market cap vs fully diluted value</h2>
      <form id="eval-form" onsubmit="return false"><div class="score">
        <div><label for="price">Price (USD)</label><input id="price" name="price" type="number" step="any" value="1.25"></div>
        <div><label for="circ">Circulating supply</label><input id="circ" name="circ" type="number" step="any" value="400000000"></div>
        <div><label for="max">Max / total supply</label><input id="max" name="max" type="number" step="any" value="1000000000"></div>
        <div><label for="fees">Annual protocol fees (USD)</label><input id="fees" name="fees" type="number" step="any" value="40000000"></div>
      </div></form>
      <div class="score" style="margin-top:1rem">
        <div class="tile"><div class="label">Market cap</div><div class="value" id="ev-mc">—</div></div>
        <div class="tile"><div class="label">FDV</div><div class="value" id="ev-fdv">—</div></div>
        <div class="tile"><div class="label">Cap ÷ FDV</div><div class="value" id="ev-ratio">—</div></div>
        <div class="tile"><div class="label">Cap ÷ fees</div><div class="value" id="ev-ps">—</div></div>
      </div>
      <p class="chart-caption" id="ev-verdict"></p>
    </div>
    ${chart('chart-turnover-top', 'Daily turnover, top 12 assets', 'Volume ÷ market cap from the live table. Very high turnover on a small cap usually means wash trading or a leveraged frenzy; very low turnover on a large cap means the cap is mostly held, not traded.', 'tall')}
  </div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="supply">1. Supply: who is going to sell to you</h2>
      <p>Market cap uses circulating supply. <strong>FDV</strong> uses everything that will ever exist. The gap between them is tokens that investors, the team and the treasury will receive on a vesting schedule — and will, in aggregate, sell. A token with 20% of supply circulating at a $1bn market cap is really a $5bn asset with $4bn of overhang. Find the unlock schedule (Tokenomist, the project's own docs) and look at the next twelve months. Prices around large unlocks are reliably weak.</p>
      <h2 id="accrual">2. Revenue and value accrual</h2>
      <p>Does the protocol earn anything, and does any of it reach the token? Fees on DefiLlama or Token Terminal; the accrual mechanism in the docs. Four answers in descending order of quality: buybacks or distributions to holders; fee burn; staking rewards funded by fees rather than issuance; nothing. A high "price to fees" multiple is fine for something growing fast with a clear accrual path and a warning sign otherwise. For assets with no fees by design — Bitcoin, memecoins — this question does not apply, and the valuation case must be made some other way.</p>
      <h2 id="liquidity">3. Liquidity</h2>
      <p>Turnover (volume ÷ cap) is the quick check; order-book depth at ±2% on the main venues is the real one. A market cap that could not absorb a $5m sale without a 20% drop is not really a market cap. Be suspicious of volume concentrated on one small exchange, or volume that is a large multiple of cap every day.</p>
      <h2 id="holders">4. Holders and concentration</h2>
      <p>Block explorers show the top holders. Exclude exchange and contract addresses, then ask what share the top 20 control. Above 50% means a handful of wallets set the price. Look also at how the initial distribution happened: a fair launch, a public sale, a VC round at a 100× lower price, or an insider allocation.</p>
      <h2 id="usage">5. Usage that is not incentivised</h2>
      <p>Active addresses, transactions and TVL all inflate when a protocol pays people to use it. Check what happened to the numbers when the incentive programme ended; for chains, check stablecoin supply and DEX volume, which are harder to fake than address counts.</p>
      <h2 id="flags">Red flags</h2>
      <ul>
        <li>The documentation describes the token's "utility" without ever stating a cash flow.</li>
        <li>Most of the circulating supply is on one exchange.</li>
        <li>The team is anonymous <em>and</em> controls an upgrade key or a large treasury.</li>
        <li>The roadmap is a list of partnerships rather than shipped features.</li>
        <li>Yield is quoted without saying where it comes from. If you cannot find the source of the yield, you are the source.</li>
      </ul>
      <div class="callout"><strong>None of this predicts price.</strong> Fundamentally sound tokens fall 80% in bear markets alongside the rest. What the checklist does is separate the assets that might still exist in five years from those that will not, which over a full cycle is most of the game.</div>
    </div>
    ${toc([['supply', '1. Supply'], ['accrual', '2. Value accrual'], ['liquidity', '3. Liquidity'], ['holders', '4. Holders'], ['usage', '5. Usage'], ['flags', 'Red flags']])}
  </div>`
});

/* ---------------------------------------------------------------- 12. Risks */
page('risks.html', {
  title: 'How people lose money in crypto', nav: 'risks',
  description: 'The ten largest crypto losses from Mt. Gox to Bybit, ranked and categorised — exchange failures, bridge hacks, stablecoin collapses — plus the everyday risks: custody, leverage, scams and regulation.',
  content: `
  ${hero('Risks', 'How the money actually gets lost', 'Not, mostly, from the assets going to zero. From the companies around them, the bridges between them, the leverage on top of them, and the humans holding the keys.')}
  <div class="grid-2">
    ${chart('chart-incidents', 'Ten defining incidents, by loss', 'Approximate losses at the time. Terra is off the scale: a $40bn collapse that then took down lenders and funds holding its tokens.', 'tall')}
    ${chart('chart-incident-types', 'Losses by category', 'Stablecoin design failure and exchange fraud dwarf hacks. The protocol-level exploits that get the headlines are, by dollar value, the smaller problem.', 'tall')}
  </div>
  <div class="section">${table(['Date', 'Incident', 'Type', '#Loss', 'Lesson'], [...D.incidents].sort((a, b) => a.date.localeCompare(b.date)).map((i) => [i.date, `<strong>${i.name}</strong>`, i.type, num(compact(i.lossUsd)), wrap(esc(i.lesson))]))}</div>
  <div class="two-col section">
    <div class="prose">
      <h2 id="custody">Custody: the exchange is not a bank</h2>
      <p>Mt. Gox, FTX, Celsius, Voyager, BlockFi, WazirX: every cycle, the largest losses come from venues that held customer assets and did not have them. Exchanges are not banks; deposits are unsecured claims, insurance is whatever the company says, and proof-of-reserves is a snapshot that can be borrowed for. The rule that survives every cycle: keep on an exchange only what you are actively trading.</p>
      <h2 id="leverage">Leverage</h2>
      <p>Perpetual futures with 20–100× leverage are the main product of most crypto exchanges, and liquidation cascades are the mechanism that turns a 10% move into a 40% one. Open interest and funding rates are public; when both are at extremes, the next move is likely to be violent in the direction that hurts the crowd. Most individual losses in crypto are not hacks; they are liquidations.</p>
      <h2 id="bridges">Bridges and smart contracts</h2>
      <p>Bridges hold large pools of assets behind a small number of keys or a complex contract, which makes them the richest targets in the system: Ronin, Poly Network, Wormhole, Nomad, Multichain. Use canonical bridges where they exist, move only what you need, and treat any "wrapped" asset as a claim on the bridge, not on the underlying coin.</p>
      <h2 id="scams">Scams</h2>
      <p>By count, far more money is lost to fraud than to hacks: fake support agents asking for seed phrases, address-poisoning (a lookalike address placed in your transaction history), approval phishing (signing a message that lets a contract drain your wallet), romance and "pig butchering" schemes, and fake exchanges. The common thread is urgency and a request to act. Nothing legitimate in crypto needs your seed phrase, ever.</p>
      <h2 id="regulation">Regulation and jurisdiction</h2>
      <p>A token can be delisted, an exchange can lose its licence, a stablecoin can be banned for retail in a region, and a government can declare the whole activity illegal. These do not destroy the assets but they can trap them, and they move prices sharply. Diversification across venues and jurisdictions is as important as across assets.</p>
      <h2 id="volatility">And then the ordinary risk</h2>
      <p>Bitcoin has fallen more than 75% four times. Most altcoins that existed in 2017 no longer trade. The sector's history is that the assets which survive deliver enormous returns and the median asset goes to zero — which is a reason to size positions for a 90% loss and to be sceptical of any projection that assumes otherwise.</p>
    </div>
    ${toc([['custody', 'Custody'], ['leverage', 'Leverage'], ['bridges', 'Bridges'], ['scams', 'Scams'], ['regulation', 'Regulation'], ['volatility', 'Volatility']])}
  </div>`
});

/* ---------------------------------------------------------------- 13. Glossary */
page('glossary.html', {
  title: 'Crypto glossary', nav: 'glossary',
  description: 'Thirty-eight crypto market terms — from altseason to yield farming — defined in one or two plain sentences each.',
  content: `${hero('Glossary', 'Thirty-eight terms, plainly', 'Every term used across the site, in alphabetical order.')}<dl class="glossary">${D.glossary.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>`
});

/* ---------------------------------------------------------------- 14. About */
page('about.html', {
  title: 'About Abacus Markets', nav: 'about',
  description: 'Abacus Markets is an open-source, dependency-free static site that maps the crypto market by sector with live data and editorial analysis.',
  content: `${hero('About', 'A map, not a tip sheet', 'Abacus Markets exists to explain the structure of the crypto market: what the pieces are, how big they are, and how to tell size from substance.')}
  <div class="two-col">
    <div class="prose">
      <h2>Principles</h2>
      <ul>
        <li><strong>Sector first.</strong> Every asset is explained in the context of what it is for, because a store of value, a computing platform and a joke should not be judged by the same chart.</li>
        <li><strong>Numbers labelled.</strong> Live figures say "live"; editorial estimates say "approximate". Historical series are rounded year-end values meant to show shape, not to be quoted to the dollar.</li>
        <li><strong>Trade-offs stated.</strong> Every page that explains why something works also explains how it fails.</li>
        <li><strong>No accounts, no cookies, no ads, no affiliate links.</strong></li>
      </ul>
      <h2>Data</h2>
      <p>Coin prices, caps, volumes and 7-day sparklines come from the free CoinGecko API at page load. Sector sizes, TVL, stablecoin supply, incident losses and historical series are maintained by hand in <code>src/data/market.json</code> and refreshed with each release. If a number looks wrong, the file is the place to fix it and a pull request is the way.</p>
      <h2>Open source</h2>
      <p>One Node.js build script, one JSON data file, one stylesheet, one browser script. Chart.js vendored as a single file. No framework, no bundler, no <code>npm install</code>.</p>
      <pre><code>git clone ${esc(config.repoUrl)}.git
cd abacus-markets
npm run dev     # build + preview at http://localhost:8080
npm run fetch   # refresh the coin snapshot from CoinGecko
npm test        # build + link check</code></pre>
      <h2>Disclaimer</h2>
      <p>Abacus Markets is an information site. Nothing here is a recommendation to buy, sell or hold any asset. Crypto assets are volatile and the companies around them fail regularly; the <a href="risks.html">risks page</a> is the most important one on the site.</p>
    </div>
    <div class="cards" style="margin-top:0"><a class="card" href="${esc(config.repoUrl)}"><span class="k">GitHub</span><h3>Source code</h3><p>MIT licensed. Fork it and swap the data file.</p></a><a class="card" href="sectors.html"><span class="k">Start</span><h3>Sectors</h3><p>The map of the market, page one.</p></a></div>
  </div>`
});

/* assets */
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
['style.css'].forEach((f) => fs.copyFileSync(path.join(SRC, 'css', f), path.join(DIST, 'assets', f)));
fs.copyFileSync(path.join(SRC, 'js', 'app.js'), path.join(DIST, 'assets', 'app.js'));
fs.copyFileSync(path.join(SRC, 'vendor', 'chart.umd.min.js'), path.join(DIST, 'assets', 'chart.umd.min.js'));
fs.copyFileSync(path.join(SRC, 'favicon.svg'), path.join(DIST, 'favicon.svg'));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${config.siteUrl}/${p}</loc><lastmod>${D.snapshotDate}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.mkdirSync(path.join(DIST, 'images'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'images', 'og.svg'), seo.ogCard('The crypto market, sector by sector', 'Sizes, trade-offs and how to evaluate a token', '#2a78d6', '#0e1319'));
if (fs.existsSync(path.join(SRC, 'og.png'))) fs.copyFileSync(path.join(SRC, 'og.png'), path.join(DIST, 'images', 'og.png'));
seo.writeIndexNow(DIST, config, pages.map((p) => `${config.siteUrl.replace(/\/$/, '')}/${p}`));
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}/sitemap.xml\n`);
console.log(`Built ${pages.length} pages:\n  ${pages.join('\n  ')}`);
