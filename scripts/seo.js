/** Shared SEO helpers: length clamps, Bing verification meta, JSON-LD builders, IndexNow key + submit script, OG card. */
'use strict';
const fs = require('fs');
const path = require('path');

const clamp = (s, max) => { s = String(s).replace(/\s+/g, ' ').trim(); if (s.length <= max) return s; const cut = s.slice(0, max); return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–-]$/, '') ; };
const bingMeta = (config) => (config.bingVerification ? `<meta name="msvalidate.01" content="${config.bingVerification}">` : '<!-- Bing Webmaster Tools: set "bingVerification" in site.config.json to emit <meta name="msvalidate.01"> -->');
const webPage = (SITE, { url, title, description, siteName, type = 'WebPage', dateModified }) => ({ '@context': 'https://schema.org', '@graph': [
  { '@type': 'WebSite', '@id': SITE + '/#website', name: siteName, url: SITE + '/', publisher: { '@type': 'Organization', name: 'Abacus', url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/images/og.png' } } },
  { '@type': type, '@id': url, url, name: title, description, isPartOf: { '@id': SITE + '/#website' }, inLanguage: 'en', ...(dateModified ? { dateModified } : {}) }
] });
const breadcrumb = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });

function writeIndexNow(DIST, config, pages) {
  if (!config.indexNowKey) return;
  fs.writeFileSync(path.join(DIST, `${config.indexNowKey}.txt`), config.indexNowKey);
  fs.writeFileSync(path.join(DIST, 'indexnow-urls.json'), JSON.stringify(pages, null, 2));
}
function ogCard(title, subtitle, accent = '#f2c14e', bg = '#0d0c10') {
  const lines = []; let cur = ''; title.split(' ').forEach((w) => { if ((cur + ' ' + w).trim().length > 28) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }); if (cur.trim()) lines.push(cur.trim());
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${bg}"/><circle cx="980" cy="320" r="260" fill="${accent}" opacity=".18"/><circle cx="980" cy="320" r="170" fill="${accent}" opacity=".25"/><g transform="translate(900 240)"><rect x="0" y="0" width="160" height="150" rx="22" fill="none" stroke="${accent}" stroke-width="10"/><line x1="0" y1="50" x2="160" y2="50" stroke="${accent}" stroke-width="10"/><line x1="0" y1="100" x2="160" y2="100" stroke="${accent}" stroke-width="10"/><circle cx="45" cy="50" r="16" fill="${accent}"/><circle cx="95" cy="50" r="16" fill="${accent}"/><circle cx="70" cy="100" r="16" fill="${accent}"/><circle cx="125" cy="100" r="16" fill="${accent}"/></g>${lines.slice(0, 3).map((l, i) => `<text x="70" y="${230 + i * 84}" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="70" fill="#f6f3ea">${l.replace(/&/g, '&amp;')}</text>`).join('')}<text x="70" y="${230 + Math.min(lines.length, 3) * 84 + 10}" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#b8b3a6">${subtitle.replace(/&/g, '&amp;')}</text><text x="70" y="560" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="26" fill="${accent}" letter-spacing="6">ABACUS</text></svg>`;
}
module.exports = { clamp, bingMeta, webPage, breadcrumb, writeIndexNow, ogCard };
