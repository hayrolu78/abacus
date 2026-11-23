#!/usr/bin/env node
// Smoke test: every page exists, has a title, and every internal link resolves.
'use strict';
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, '..', 'dist');

const pages = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.html')) pages.push(p);
  }
})(DIST);

let errors = 0;
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) { console.error('No title:', p); errors++; }
  for (const m of html.matchAll(/href="([^"#:]+)"/g)) {
    const target = path.resolve(path.dirname(p), m[1]);
    if (!fs.existsSync(target)) { console.error(`Broken link in ${path.relative(DIST, p)}: ${m[1]}`); errors++; }
  }
}
console.log(`${pages.length} pages checked, ${errors} error(s).`);
process.exit(errors ? 1 : 0);
