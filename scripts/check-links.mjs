// Checks every internal href/src (and #fragment) in dist/. Pass --external to also ping external links.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const PENDING = new Set(['PlacementScope_Guide.pdf']); // files the author will add later
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const idsCache = new Map();
const idsOf = (f) => {
  if (!idsCache.has(f)) idsCache.set(f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsCache.get(f);
};

let errors = 0, warnings = 0, checked = 0;
const external = new Set();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(DIST, file);
  for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const url = raw.replace(/&amp;/g, '&');
    if (/^(https?:)?\/\//.test(url)) { external.add(url); continue; }
    if (/^(mailto:|tel:|data:|javascript:)/.test(url)) continue;
    checked++;
    const [p, hash] = url.split('#');
    let target = file;
    if (p) {
      target = p.startsWith('/') ? path.join(DIST, p) : path.resolve(path.dirname(file), p);
      if (p.endsWith('/')) target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) {
        if (PENDING.has(path.basename(target))) { warnings++; continue; }
        console.error(`✗ ${rel}: ${attr}="${url}" → missing ${path.relative(DIST, target)}`); errors++; continue;
      }
    }
    if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) { console.error(`✗ ${rel}: #${hash} not found in ${path.relative(DIST, target)}`); errors++; }
  }
}

if (process.argv.includes('--external')) {
  for (const u of external) {
    try {
      const r = await fetch(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 (link-check)' } });
      if (r.status >= 400) { console.warn(`! external ${r.status}: ${u}`); warnings++; }
    } catch (e) { console.warn(`! external unreachable: ${u} (${e.message})`); warnings++; }
  }
}
if (warnings && !process.argv.includes('--external')) console.warn(`! ${warnings} link(s) point to the pending file(s): ${[...PENDING].join(', ')}`);
console.log(`Checked ${checked} internal links in ${htmlFiles.length} pages; ${external.size} unique external links${process.argv.includes('--external') ? ' pinged' : ' (run with --external to ping them)'}.`);
if (errors) { console.error(`${errors} broken link(s).`); process.exit(1); }
console.log('No broken internal links.');
