#!/usr/bin/env node
// Tiny static file server for local preview. No dependencies.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = process.env.PORT || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };

http.createServer((req, res) => {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (file.endsWith('/')) file += 'index.html';
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`Abacus Markets preview → http://localhost:${PORT}`));
