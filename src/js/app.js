/* Abacus Markets — client script: theme, live coin data (CoinGecko) with snapshot fallback, charts. */
(function () {
  'use strict';
  const D = window.ABACUS || {};
  const root = document.documentElement;
  const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const $ = (id) => document.getElementById(id);
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const SERIES = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => '--series-' + i);

  const fmt = {
    usd(n) { if (n == null) return '—'; if (n >= 1000) return '$' + Math.round(n).toLocaleString('en-US'); if (n >= 1) return '$' + n.toFixed(2); if (n >= 0.01) return '$' + n.toFixed(3); return '$' + n.toPrecision(2); },
    compact(n) { if (n == null) return '—'; const a = Math.abs(n); if (a >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'; if (a >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'; if (a >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M'; return '$' + Math.round(n).toLocaleString('en-US'); },
    pct(n) { if (n == null) return '—'; return (n > 0 ? '+' : '') + n.toFixed(1) + '%'; }
  };
  const pctClass = (n) => (n > 0.05 ? 'up' : n < -0.05 ? 'down' : '');

  /* theme / menu */
  $('theme-toggle') && $('theme-toggle').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('abacus-theme', root.dataset.theme); } catch (e) { /* ignore */ }
    rebuild();
  });
  $('menu-btn') && $('menu-btn').addEventListener('click', () => { const o = $('nav').classList.toggle('open'); $('menu-btn').setAttribute('aria-expanded', String(o)); });
  setText('year', String(new Date().getFullYear()));

  /* live */
  let coins = D.coins || [];
  let totals = { ...(D.totals || {}) };
  let isLive = false;

  async function getJSON(url, ms = 6000) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(t); }
  }
  async function refresh() {
    const [mk, gl] = await Promise.allSettled([
      getJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&sparkline=true&price_change_percentage=7d'),
      getJSON('https://api.coingecko.com/api/v3/global')
    ]);
    if (mk.status === 'fulfilled') {
      const sectorOf = Object.fromEntries(coins.map((c) => [c.id, c.sector]));
      coins = mk.value.slice(0, 24).map((r, i) => ({
        rank: i + 1, id: r.id, symbol: r.symbol.toUpperCase(), name: r.name, sector: sectorOf[r.id] || 'Other',
        price: r.current_price, marketCap: r.market_cap, volume24h: r.total_volume, change7d: r.price_change_percentage_7d_in_currency,
        spark: thin(r.sparkline_in_7d && r.sparkline_in_7d.price || [], 28)
      }));
      isLive = true;
    }
    if (gl.status === 'fulfilled' && gl.value.data) {
      const g = gl.value.data;
      totals.marketCapUsd = g.total_market_cap.usd; totals.volume24hUsd = g.total_volume.usd; totals.btcDominance = g.market_cap_percentage.btc;
      isLive = true;
    }
    paintStrip(); rebuild();
  }
  const thin = (a, n) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.floor(i * a.length / n)]));

  function paintStrip() {
    setText('s-cap', fmt.compact(totals.marketCapUsd)); setText('s-vol', fmt.compact(totals.volume24hUsd));
    setText('s-dom', totals.btcDominance ? totals.btcDominance.toFixed(1) + '%' : '—'); setText('s-stable', fmt.compact(totals.stablecoinSupplyUsd));
    const s = $('s-status'); if (s) { s.textContent = isLive ? 'live · CoinGecko' : 'snapshot ' + (D.snapshotDate || ''); s.classList.toggle('live', isLive); }
  }

  function sparkSVG(v, w = 96, h = 30) {
    if (!v || v.length < 2) return '';
    const mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1;
    const pts = v.map((y, i) => ((i / (v.length - 1)) * (w - 2) + 1).toFixed(1) + ',' + (h - 2 - ((y - mn) / r) * (h - 4)).toFixed(1));
    const ch = (v[v.length - 1] - v[0]) / v[0];
    return `<svg class="spark ${Math.abs(ch) < 0.003 ? 'flat' : ch >= 0 ? 'up' : 'down'}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M${pts.join(' L')}"/></svg>`;
  }

  /* charts */
  const charts = [];
  const keep = (c) => { charts.push(c); return c; };
  function rebuild() { while (charts.length) charts.pop().destroy(); render(); }
  function base(h = false) {
    const text = css('--text-secondary'), grid = css('--grid');
    const o = {
      responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, interaction: { mode: h ? 'nearest' : 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: css('--surface-1'), titleColor: css('--text-primary'), bodyColor: text, borderColor: css('--border'), borderWidth: 1, padding: 10, boxPadding: 4 } },
      scales: { x: { ticks: { color: text, maxRotation: 0, maxTicksLimit: 12 }, grid: { display: false }, border: { color: grid } }, y: { ticks: { color: text, maxTicksLimit: 7 }, grid: { color: grid }, border: { display: false } } }
    };
    if (h) { o.indexAxis = 'y'; o.scales.x.grid = { color: grid }; o.scales.y.grid = { display: false }; o.scales.y.ticks = { color: text, autoSkip: false }; }
    return o;
  }
  const line = (data, color, extra = {}) => ({ data, borderColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: color, pointHoverBorderColor: css('--surface-1'), pointHoverBorderWidth: 2, tension: 0.3, ...extra });
  const bar = (data, color, extra = {}) => ({ data, backgroundColor: color, borderRadius: 4, borderSkipped: 'start', barThickness: 16, ...extra });
  const legendOn = (o) => { o.plugins.legend = { display: true, position: 'bottom', labels: { color: css('--text-secondary'), usePointStyle: true, boxWidth: 8 } }; return o; };
  const endLabels = { id: 'endLabels', afterDatasetsDraw(c) { const { ctx } = c; ctx.save(); ctx.font = '600 11px ' + css('--font'); ctx.textBaseline = 'middle'; ctx.fillStyle = css('--text-secondary'); c.data.datasets.forEach((ds, i) => { const m = c.getDatasetMeta(i); const l = m.data[m.data.length - 1]; if (l && ds.label) ctx.fillText(ds.label, l.x + 6, l.y); }); ctx.restore(); } };

  function hbar(id, labels, values, { color = css('--series-1'), tick = (v) => v, tip = (v) => v, colors, max } = {}) {
    const ctx = $(id); if (!ctx || !window.Chart) return;
    const o = base(true); o.scales.x.ticks.callback = tick; if (max) o.scales.x.max = max;
    o.plugins.tooltip.callbacks = { label: (i) => ' ' + tip(i.raw) };
    keep(new Chart(ctx, { type: 'bar', data: { labels, datasets: [bar(values, colors || color)] }, options: o }));
  }
  function lines(id, labels, datasets, { tick = (v) => v, tip = (v) => v, log = false, legend = true, stacked = false, max, labelsAtEnd = true } = {}) {
    const ctx = $(id); if (!ctx || !window.Chart) return;
    const o = base(); if (log) o.scales.y.type = 'logarithmic'; if (stacked) o.scales.y.stacked = true; if (max) o.scales.y.max = max;
    o.scales.y.ticks.callback = tick; o.plugins.tooltip.callbacks = { label: (i) => ' ' + i.dataset.label + ': ' + tip(i.raw) };
    if (legend && datasets.length > 1) legendOn(o);
    if (labelsAtEnd && datasets.length > 1) o.layout = { padding: { right: 70 } };
    keep(new Chart(ctx, { type: 'line', data: { labels, datasets }, options: o, plugins: labelsAtEnd && datasets.length > 1 ? [endLabels] : [] }));
  }

  /* renderers */
  function render() {
    paintStrip();
    const R = { index: renderIndex, sectors: renderSectors, layer1: renderL1, layer2: renderL2, stablecoins: renderStables, defi: renderDefi, memecoins: renderMemes, exchange: renderExchange, dominance: renderDominance, cycles: renderCycles, evaluate: renderEvaluate, risks: renderRisks };
    (R[D.page] || (() => {}))();
  }

  function coinRow(c) {
    const col = css(SERIES[(c.rank - 1) % 8]);
    return `<tr><td class="num muted">${c.rank}</td><td><div class="coin-cell"><span class="avatar" style="background:${col}">${c.symbol.slice(0, 4)}</span><span><strong>${c.name}</strong> <span class="sym">${c.symbol}</span></span></div></td><td><span class="tag">${c.sector}</span></td><td class="num">${fmt.usd(c.price)}</td><td class="num"><span class="pct ${pctClass(c.change7d)}">${fmt.pct(c.change7d)}</span></td><td class="num">${fmt.compact(c.marketCap)}</td><td class="num">${fmt.compact(c.volume24h)}</td><td class="num">${c.marketCap ? ((c.volume24h / c.marketCap) * 100).toFixed(1) + '%' : '—'}</td><td>${sparkSVG(c.spark)}</td></tr>`;
  }

  function renderIndex() {
    const tb = $('coin-body'); if (tb) tb.innerHTML = coins.map(coinRow).join('');
    setText('tile-cap', fmt.compact(totals.marketCapUsd)); setText('tile-vol', fmt.compact(totals.volume24hUsd));
    setText('tile-dom', totals.btcDominance ? totals.btcDominance.toFixed(1) + '%' : '—'); setText('tile-stable', fmt.compact(totals.stablecoinSupplyUsd)); setText('tile-tvl', fmt.compact(totals.defiTvlUsd));
    const gainers = [...coins].filter((c) => c.change7d != null).sort((a, b) => b.change7d - a.change7d);
    const movers = (list) => list.slice(0, 5).map((c) => `<li><span>${c.name} <span class="muted">${c.symbol}</span></span><span class="pct ${pctClass(c.change7d)}">${fmt.pct(c.change7d)}</span></li>`).join('');
    const g = $('gainers'); if (g) g.innerHTML = movers(gainers);
    const l = $('losers'); if (l) l.innerHTML = movers([...gainers].reverse());
    lines('chart-total', D.totalCapHistory.map((p) => p.year), [line(D.totalCapHistory.map((p) => p.cap), css('--series-1'), { fill: { target: 'origin', above: css('--series-1') + '22' } })], { log: true, tick: (v) => ([1, 10, 100, 1000, 10000].includes(v) ? '$' + v + 'B' : ''), tip: (v) => '$' + v + 'B', legend: false });
    hbar('chart-sectors-mini', D.sectors.map((s) => s.name), D.sectors.map((s) => s.capUsd), { tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v), colors: D.sectors.map((_, i) => css(SERIES[i % 8])) });
  }

  function renderSectors() {
    hbar('chart-sectors', D.sectors.map((s) => s.name), D.sectors.map((s) => s.share), { tick: (v) => v + '%', tip: (v) => v + '% of total market cap', max: 70, colors: D.sectors.map((_, i) => css(SERIES[i % 8])) });
    const bySector = {};
    coins.forEach((c) => { bySector[c.sector] = (bySector[c.sector] || 0) + (c.volume24h || 0) / (c.marketCap || 1); });
    const sec = Object.keys(bySector);
    const counts = {}; coins.forEach((c) => { counts[c.sector] = (counts[c.sector] || 0) + 1; });
    hbar('chart-turnover', sec, sec.map((s) => (bySector[s] / counts[s]) * 100), { tick: (v) => v.toFixed(0) + '%', tip: (v) => v.toFixed(1) + '% average daily turnover (volume ÷ cap)' });
  }

  function renderL1() {
    hbar('chart-tps', D.layer1.map((c) => c.name), D.layer1.map((c) => c.tps), { tick: (v) => v, tip: (v) => v.toLocaleString('en-US') + ' TPS (claimed sustained)', colors: D.layer1.map((_, i) => css(SERIES[i % 8])) });
    const ctx = $('chart-fees'); if (ctx) { const o = base(true); o.scales.x.type = 'logarithmic'; o.scales.x.ticks.callback = (v) => ([0.001, 0.01, 0.1, 1, 10].includes(v) ? '$' + v : ''); o.plugins.tooltip.callbacks = { label: (i) => ' ~$' + i.raw + ' per simple transfer' }; keep(new Chart(ctx, { type: 'bar', data: { labels: D.layer1.map((c) => c.name), datasets: [bar(D.layer1.map((c) => c.feeUsd), D.layer1.map((_, i) => css(SERIES[i % 8])))] }, options: o })); }
    const l1coins = coins.filter((c) => c.sector === 'Layer 1' || c.id === 'bitcoin');
    hbar('chart-l1-cap', l1coins.map((c) => c.name), l1coins.map((c) => c.marketCap), { tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v) });
  }

  function renderL2() {
    hbar('chart-l2-tvl', D.layer2.map((c) => c.name), D.layer2.map((c) => c.tvlUsd), { tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v) + ' secured', colors: D.layer2.map((_, i) => css(SERIES[i % 8])) });
    const toks = D.layer2.filter((c) => c.token && !c.token.startsWith('—')).map((c) => ({ ...c, coin: coins.find((x) => x.symbol === c.token) })).filter((c) => c.coin);
    hbar('chart-l2-ratio', toks.map((c) => c.name), toks.map((c) => c.coin.marketCap / c.tvlUsd), { tick: (v) => v.toFixed(1) + '×', tip: (v) => 'Token market cap is ' + v.toFixed(2) + '× the value the chain secures' });
  }

  function renderStables() {
    hbar('chart-stable-supply', D.stablecoins.map((s) => s.symbol), D.stablecoins.map((s) => s.supplyUsd), { tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v) + ' in circulation', colors: D.stablecoins.map((_, i) => css(SERIES[i % 8])) });
    lines('chart-stable-history', D.stablecoinHistory.map((p) => p.year), [line(D.stablecoinHistory.map((p) => p.supply), css('--series-3'), { fill: { target: 'origin', above: css('--series-3') + '22' } })], { tick: (v) => '$' + v + 'B', tip: (v) => '$' + v + 'B total supply', legend: false });
  }

  function renderDefi() {
    hbar('chart-defi-tvl', D.defi.map((p) => p.name), D.defi.map((p) => p.tvlUsd), { tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v) + ' TVL', colors: D.defi.map((_, i) => css(SERIES[i % 8])) });
    const withTok = D.defi.map((p) => ({ ...p, coin: coins.find((c) => c.symbol === p.token) })).filter((p) => p.coin);
    hbar('chart-defi-ps', withTok.map((p) => p.name), withTok.map((p) => p.coin.marketCap / p.annualFeesUsd), { tick: (v) => v.toFixed(0) + '×', tip: (v) => 'Market cap ÷ annual fees = ' + v.toFixed(1) + '×' });
    lines('chart-defi-history', D.defiTvlHistory.map((p) => p.year), [line(D.defiTvlHistory.map((p) => p.tvl), css('--series-7'), { fill: { target: 'origin', above: css('--series-7') + '22' } })], { tick: (v) => '$' + v + 'B', tip: (v) => '$' + v + 'B locked', legend: false });
  }

  function renderMemes() {
    hbar('chart-meme-cap', D.memecoins.map((m) => m.name), D.memecoins.map((m) => m.marketCap), { tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v), colors: D.memecoins.map((_, i) => css(SERIES[i % 8])) });
    hbar('chart-meme-dd', D.memecoins.map((m) => m.name), D.memecoins.map((m) => m.peakDrawdown), { color: css('--down'), tick: (v) => v + '%', tip: (v) => v + '% from all-time high to the following low' });
  }

  function renderExchange() {
    hbar('chart-ex-cap', D.exchangeTokens.map((t) => t.name + ' (' + t.exchange + ')'), D.exchangeTokens.map((t) => t.marketCap), { tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v), colors: D.exchangeTokens.map((_, i) => css(SERIES[i % 8])) });
  }

  function renderDominance() {
    const H = D.dominanceHistory;
    lines('chart-dominance', H.map((p) => p.year), [line(H.map((p) => p.btc), css('--series-1'), { label: 'Bitcoin' }), line(H.map((p) => p.eth), css('--series-2'), { label: 'Ethereum' }), line(H.map((p) => p.stables), css('--series-3'), { label: 'Stablecoins' })], { tick: (v) => v + '%', tip: (v) => v + '%', max: 80 });
    const others = H.map((p) => 100 - p.btc - p.eth - p.stables);
    const ctx = $('chart-stack'); if (ctx) { const o = base(); o.scales.x.stacked = true; o.scales.y.stacked = true; o.scales.y.max = 100; o.scales.y.ticks.callback = (v) => v + '%'; legendOn(o); o.plugins.tooltip.callbacks = { label: (i) => ' ' + i.dataset.label + ': ' + i.raw + '%' }; const mk = (d, c, l) => ({ ...bar(d, c, { label: l, barThickness: 28 }), borderWidth: 1, borderColor: css('--surface-1') }); keep(new Chart(ctx, { type: 'bar', data: { labels: H.map((p) => p.year), datasets: [mk(H.map((p) => p.btc), css('--series-1'), 'Bitcoin'), mk(H.map((p) => p.eth), css('--series-2'), 'Ethereum'), mk(H.map((p) => p.stables), css('--series-3'), 'Stablecoins'), mk(others, css('--border'), 'Everything else')] }, options: o })); }
    setText('dom-now', totals.btcDominance ? totals.btcDominance.toFixed(1) + '%' : '—');
  }

  function renderCycles() {
    lines('chart-cycles', D.totalCapHistory.map((p) => p.year), [line(D.totalCapHistory.map((p) => p.cap), css('--series-1'))], { log: true, tick: (v) => ([1, 10, 100, 1000, 10000].includes(v) ? '$' + v + 'B' : ''), tip: (v) => '$' + v + 'B', legend: false });
    const done = D.cycles.filter((c) => c.drawdown != null);
    hbar('chart-cycle-dd', done.map((c) => c.cycle), done.map((c) => c.drawdown), { color: css('--down'), tick: (v) => v + '%', tip: (v) => v + '% peak to trough' });
  }

  function renderEvaluate() {
    const f = $('eval-form'); if (!f) return;
    const run = () => {
      const price = +f.price.value || 0, circ = +f.circ.value || 0, max = +f.max.value || circ, fees = +f.fees.value || 0;
      const mc = price * circ, fdv = price * max;
      setText('ev-mc', fmt.compact(mc)); setText('ev-fdv', fmt.compact(fdv));
      setText('ev-ratio', fdv ? (mc / fdv * 100).toFixed(0) + '%' : '—'); setText('ev-ps', fees ? (mc / fees).toFixed(1) + '×' : '—');
      const v = $('ev-verdict'); if (v) { const r = mc / fdv; v.textContent = r < 0.3 ? 'Less than 30% of supply is out: large unlocks ahead, expect sell pressure.' : r < 0.7 ? 'Meaningful future unlocks; check the vesting schedule.' : 'Most supply is already circulating; FDV is close to market cap.'; }
    };
    f.oninput = run; run();
    const coinsWithRatio = coins.filter((c) => c.marketCap).slice(0, 12);
    hbar('chart-turnover-top', coinsWithRatio.map((c) => c.name), coinsWithRatio.map((c) => (c.volume24h / c.marketCap) * 100), { tick: (v) => v.toFixed(0) + '%', tip: (v) => v.toFixed(1) + '% of market cap traded per day' });
  }

  function renderRisks() {
    const inc = [...D.incidents].sort((a, b) => b.lossUsd - a.lossUsd);
    hbar('chart-incidents', inc.map((i) => i.name + ' · ' + i.date.slice(0, 4)), inc.map((i) => i.lossUsd), { color: css('--down'), tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v) + ' lost' });
    const byType = {}; D.incidents.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + i.lossUsd; });
    const t = Object.keys(byType).sort((a, b) => byType[b] - byType[a]);
    hbar('chart-incident-types', t, t.map((k) => byType[k]), { tick: (v) => fmt.compact(v), tip: (v) => fmt.compact(v), colors: t.map((_, i) => css(SERIES[i % 8])) });
  }

  render();
  refresh();
})();
