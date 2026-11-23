#!/usr/bin/env node
/** Submit every built URL to Bing via IndexNow (also propagates to Yandex, Seznam, Naver). Run after deploying: `npm run indexnow`. */
'use strict';
const fs = require('fs');
const path = require('path');
const config = require(path.resolve(__dirname, '..', 'site.config.json'));
const urls = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'indexnow-urls.json'), 'utf8'));
const host = new URL(config.siteUrl).host;
(async () => {
  const r = await fetch('https://www.bing.com/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host, key: config.indexNowKey, keyLocation: `${config.siteUrl.replace(/\/$/, '')}/${config.indexNowKey}.txt`, urlList: urls }) });
  console.log(`IndexNow → ${r.status} ${r.statusText} (${urls.length} URLs for ${host})`);
  if (r.status === 422 || r.status === 403) console.log('Check that the key file is live at keyLocation and that siteUrl matches the deployed host.');
})().catch((e) => { console.error(e.message); process.exit(1); });
