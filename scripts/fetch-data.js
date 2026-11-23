#!/usr/bin/env node
/** Refresh the coin table and market totals in src/data/market.json from CoinGecko. Sector labels and editorial data are preserved. */
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.resolve(__dirname, '..', 'src', 'data', 'market.json');
const get = async (u) => { const r = await fetch(u, { headers: { accept: 'application/json' } }); if (!r.ok) throw new Error(`${u} → ${r.status}`); return r.json(); };

(async () => {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const sectorOf = Object.fromEntries(data.coins.map((c) => [c.id, c.sector]));
  const [mk, gl] = await Promise.all([
    get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&sparkline=true&price_change_percentage=7d'),
    get('https://api.coingecko.com/api/v3/global')
  ]);
  const missing = [];
  data.coins = mk.slice(0, 24).map((r, i) => {
    if (!sectorOf[r.id]) missing.push(`${r.name} (${r.id})`);
    const s = r.sparkline_in_7d?.price || [];
    return { rank: i + 1, id: r.id, symbol: r.symbol.toUpperCase(), name: r.name, sector: sectorOf[r.id] || 'Other', price: r.current_price, marketCap: r.market_cap, volume24h: r.total_volume, change7d: +(r.price_change_percentage_7d_in_currency ?? 0).toFixed(2), spark: Array.from({ length: 7 }, (_, k) => +(s[Math.floor(k * s.length / 7)] || r.current_price).toPrecision(4)) };
  });
  const g = gl.data;
  data.totals.marketCapUsd = Math.round(g.total_market_cap.usd);
  data.totals.volume24hUsd = Math.round(g.total_volume.usd);
  data.totals.btcDominance = +g.market_cap_percentage.btc.toFixed(1);
  data.snapshotDate = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${data.coins.length} coins and totals (snapshot ${data.snapshotDate}).`);
  if (missing.length) console.log('Assign a sector to new entrants in market.json:\n  ' + missing.join('\n  '));
})().catch((e) => { console.error(e.message); process.exit(1); });
