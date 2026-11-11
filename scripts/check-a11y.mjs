// Static accessibility checks on dist/ plus WCAG AA contrast checks on the theme tokens.
// Not a replacement for a browser audit (Lighthouse/axe), but catches the common structural failures.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(DIST).filter((f) => f.endsWith('.html'));
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, 'x').trim();

let errors = 0;
const fail = (f, m) => { console.error(`✗ ${path.relative(DIST, f)}: ${m}`); errors++; };

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  if (!/<html lang="[a-z-]+"/.test(html)) fail(f, 'missing <html lang>');
  const title = html.match(/<title>([^<]*)<\/title>/);
  if (!title || !title[1].trim()) fail(f, 'missing <title>');
  if (!/<meta name="description" content="[^"]+"/.test(html)) fail(f, 'missing meta description');
  if (/user-scalable=no|maximum-scale=1/.test(html)) fail(f, 'viewport blocks zoom');
  if (!/<main[\s>]/.test(html)) fail(f, 'missing <main> landmark');
  // Ignore headings inside the quiz JSON or scripts
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(f, `expected exactly one <h1>, found ${h1s}`);
  let prev = 0;
  for (const [, lvl] of body.matchAll(/<h([1-6])[\s>]/g)) {
    const n = Number(lvl);
    if (prev && n > prev + 1) fail(f, `heading level skips from h${prev} to h${n}`);
    prev = n;
  }
  const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail(f, `duplicate ids: ${[...new Set(dup)].join(', ')}`);
  const idSet = new Set(ids);
  for (const [, ref] of body.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) for (const r of ref.split(/\s+/)) if (!idSet.has(r)) fail(f, `aria reference to missing id "${r}"`);
  for (const [tag] of body.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(tag)) fail(f, `img without alt: ${tag.slice(0, 60)}`);
  for (const [tag] of body.matchAll(/<(input|select|textarea)\b[^>]*>/g)) {
    if (/type="hidden"/.test(tag)) continue;
    const id = (tag.match(/\sid="([^"]+)"/) || [])[1];
    const labelled = /aria-label=|aria-labelledby=/.test(tag) || (id && new RegExp(`<label[^>]*for="${id}"`).test(body));
    if (!labelled) fail(f, `form control without label: ${tag.slice(0, 80)}`);
  }
  for (const [, attrs, inner] of body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) if (!/aria-label="[^"]+"/.test(attrs) && !text(inner)) fail(f, 'button without accessible name');
  for (const [, attrs, inner] of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    if (!/aria-label="[^"]+"/.test(attrs) && !text(inner)) fail(f, `link without text: <a${attrs}>`);
    if (/target="_blank"/.test(attrs) && !/rel="[^"]*noopener/.test(attrs)) fail(f, 'target=_blank without rel=noopener');
  }
  for (const [, inner] of body.matchAll(/<table\b[\s\S]*?<thead>([\s\S]*?)<\/thead>/g)) if (!/<th\b[^>]*scope="col"/.test(inner)) fail(f, 'table header cells missing scope');
}

// ---- contrast ----
const css = fs.readFileSync(path.join(ROOT, 'src/assets/styles.css'), 'utf8');
const tokens = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})/gi)].map((m) => [m[1], m[2]]));
const light = tokens(css.match(/:root\s*\{([\s\S]*?)\n\}/)[1]);
const dark = { ...light, ...tokens(css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)[1]) };
const lum = (hex) => {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'],
  ['heading', 'bg'], ['heading', 'surface'], ['heading', 'surface-2'], ['link', 'bg'], ['link', 'surface'], ['accent-text', 'surface'], ['accent-text', 'surface-2'],
  ['navy-ink', 'navy'], ['accent-ink', 'accent'], ['dn-text', 'dn-bg'], ['myth-text', 'myth-bg'], ['truth-text', 'truth-bg'],
];
const fixed = [
  ['hero text #e3ecf7 on navy', '#e3ecf7', '#003366'], ['hero subtitle #ffb066 on navy', '#ffb066', '#003366'], ['eyebrow #ffc285 on navy', '#ffc285', '#003366'],
  ['footer text #d9e4f1 on navy', '#d9e4f1', '#003366'], ['footer link #ffc285 on navy', '#ffc285', '#003366'], ['footer link on dark navy', '#ffc285', '#0d2a4a'],
  ['badge core', '#00336a', '#e3ecf8'], ['badge tech', '#0b5249', '#e6f3f1'], ['badge finance', '#6a4300', '#f3ecdf'], ['badge business', '#4c2a73', '#efe8f6'], ['badge public', '#7a2323', '#f6e7e7'],
];
const rows = [];
for (const [theme, t] of [['light', light], ['dark', dark]]) for (const [fg, bg] of pairs) rows.push([`${theme}: --${fg} on --${bg}`, t[fg], t[bg]]);
rows.push(...fixed);
let low = 0;
for (const [label, fg, bg] of rows) {
  const r = ratio(fg, bg);
  if (r < 4.5) { console.error(`✗ contrast ${r.toFixed(2)}:1 < 4.5 for ${label} (${fg} on ${bg})`); low++; }
}
errors += low;
console.log(`Checked ${files.length} pages and ${rows.length} colour pairs.`);
if (errors) { console.error(`${errors} accessibility issue(s).`); process.exit(1); }
console.log('No accessibility issues found by static checks.');
