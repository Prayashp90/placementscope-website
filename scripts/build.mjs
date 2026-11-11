// PlacementScope static site generator. Zero dependencies.
// Reads src/data/domains.json and writes a complete static site to dist/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/domains.json'), 'utf8'));
const DIST = path.join(ROOT, 'dist');
const SITE = DATA.site;
const BASE = (process.env.SITE_URL || SITE.baseUrl || '').replace(/\/$/, '');
const domains = DATA.domains;
const catLabel = Object.fromEntries(DATA.categories.map((c) => [c.id, c.label]));
const stageLabel = Object.fromEntries(DATA.roadmapStages.map((s) => [s.id, s.label]));
const domainName = Object.fromEntries(domains.map((d) => [d.id, d.name]));

// ---------- helpers ----------
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const prefix = (depth) => (depth ? '../'.repeat(depth) : './');
const has = (v) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);
const domainHref = (r, id) => `${r}domains/${id}/index.html`;
const ext = (url, label) =>
  `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}<span class="vh"> (opens in a new tab)</span></a>`;

function dataNeeded(what) {
  return `<div class="data-needed" role="note"><p class="dn-label">Data needed</p><p><strong>${esc(what)}:</strong> not yet covered by our senior interviews. We will add this once it is verified.</p></div>`;
}
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const inlineNeeded = '<span class="dn-inline">Data needed</span>';
const list = (items, cls = '') => `<ul${cls ? ` class="${cls}"` : ''}>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

// ---------- layout ----------
const NAV = [
  ['index.html', 'Home', 'home'],
  ['roadmap/index.html', 'Roadmap', 'roadmap'],
  ['companies/index.html', 'Companies', 'companies'],
  ['questions/index.html', 'Questions', 'questions'],
  ['resources/index.html', 'Resources', 'resources'],
  ['alumni/index.html', 'Alumni', 'alumni'],
  ['about/index.html', 'About', 'about'],
];

const pages = [];
function page({ out, title, desc, body, active = '', bodyClass = '', noindex = false }) {
  const depth = out.split('/').length - 1;
  const r = prefix(depth);
  const fullTitle = title ? `${title} · ${SITE.title}` : `${SITE.title}: ${SITE.tagline}`;
  const pretty = out.replace(/index\.html$/, '');
  const url = BASE ? `${BASE}/${pretty}` : '';
  const nav = NAV.map(
    ([href, label, key]) =>
      `<li><a href="${r}${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a></li>`
  ).join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}${url ? `<link rel="canonical" href="${esc(url)}">\n<meta property="og:url" content="${esc(url)}">\n` : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.title)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#003366">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${r}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${r}assets/styles.css">
<script>(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('ps-theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t)}catch(e){}})();</script>
<script src="${r}assets/app.js" defer></script>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${r}index.html"><span class="brand-mark" aria-hidden="true">PS</span><span class="brand-text">PlacementScope</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="vh">Menu</span><span class="burger" aria-hidden="true"></span></button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>${nav}</ul>
    </nav>
    <button class="theme-toggle" type="button" aria-label="Toggle dark mode"><span class="ti" aria-hidden="true"></span></button>
  </div>
</header>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div>
      <p class="footer-brand">PlacementScope · ${esc(SITE.tagline)}</p>
      <p>${esc(SITE.event)} · ${esc(SITE.edition)}</p>
      <p class="hostel-id">Hostel ID: ${esc(SITE.hostelId)}</p>
    </div>
    <div>
      <p>${esc(SITE.disclaimer)}</p>
      <p><a href="${r}${SITE.pdfPath}" download>Download the full guide (PDF)</a> · <a href="${r}about/index.html">About this guide</a></p>
    </div>
  </div>
</footer>
</body>
</html>
`;
  pages.push({ out, html, url: pretty, noindex });
}

const sectionWrap = (id, title, inner) =>
  `<section class="dsec" id="${id}" aria-labelledby="${id}-h"><details open><summary><h2 id="${id}-h">${esc(title)}</h2></summary><div class="dsec-body">${inner}</div></details></section>`;

// ---------- domain section renderers ----------
function rOverview(d) {
  const o = d.overview;
  let h = o.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
  if (has(o.keyPoints)) h += `<div class="keypoints"><h3>Key points</h3>${list(o.keyPoints)}</div>`;
  if (has(d.tracks))
    h += `<div class="tracks">${d.tracks
      .map((t) => `<div class="card track"><h3>${esc(t.title)}</h3>${list(t.points)}</div>`)
      .join('')}</div>`;
  return h;
}

function rTimeline(d) {
  let h = '';
  if (has(d.timeline)) {
    h += `<ol class="timeline">${d.timeline
      .map(
        (t) =>
          `<li><div class="tl-head"><span class="tl-stage">${esc(t.stage)}</span>${t.when ? `<span class="tl-when">${esc(t.when)}</span>` : ''}</div><p>${esc(t.detail)}</p></li>`
      )
      .join('')}</ol>`;
  } else h += dataNeeded('The recruitment timeline for this domain');
  h += `<h3 class="sub">Questions asked</h3>`;
  if (has(d.interviewQuestions)) {
    h += `<ul class="qlist">${d.interviewQuestions
      .map(
        (q) =>
          `<li><p class="q">${esc(q.q)}</p>${q.a ? `<p class="a"><strong>Answer:</strong> ${esc(q.a)}</p>` : ''}<p class="tags"><span class="tag">${esc(q.round)}</span><span class="tag">${esc(q.topic)}</span><span class="tag tag-kind">${q.kind === 'recalled' ? 'Recalled by a senior' : 'Question type described by a senior'}</span></p></li>`
      )
      .join('')}</ul>`;
  } else h += dataNeeded('A list of recalled interview questions');
  return h;
}

function rEligibility(d) {
  const e = d.eligibility || {};
  let h = has(e.general) ? list(e.general) : dataNeeded('General eligibility (branches, CPI cutoffs)');
  const tabs = [
    ['btech', 'B.Tech'],
    ['mtech', 'M.Tech'],
    ['phd', 'PhD'],
  ];
  h += `<h3 class="sub">By degree</h3><div class="tabs" data-tabs><div class="tablist" role="tablist" aria-label="Eligibility by degree">${tabs
    .map(
      ([k, l], i) =>
        `<button type="button" role="tab" id="tab-${d.id}-${k}" aria-controls="panel-${d.id}-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${l}</button>`
    )
    .join('')}</div>${tabs
    .map(
      ([k, l]) =>
        `<div class="tabpanel" role="tabpanel" id="panel-${d.id}-${k}" aria-labelledby="tab-${d.id}-${k}" tabindex="0"><p class="panel-title">${l}</p>${
          has(e[k]) ? list(e[k]) : `<p class="not-covered">Not covered yet. The seniors interviewed did not describe ${l}-specific rules for this domain.</p>`
        }</div>`
    )
    .join('')}</div>`;
  return h;
}

function rSkills(d) {
  let h = has(d.skills)
    ? `<ul class="grid-cards skills">${d.skills.map((s) => `<li class="card"><h3>${esc(s.name)}</h3><p>${esc(s.detail)}</p></li>`).join('')}</ul>`
    : dataNeeded('Required skills');
  h += `<h3 class="sub">Certifications</h3>`;
  h += has(d.certifications) ? list(d.certifications) : dataNeeded('Recommended certifications');
  return h;
}

function rRoadmap(d) {
  if (!has(d.roadmap)) return dataNeeded('A preparation roadmap');
  return `<ol class="stepper">${d.roadmap
    .map(
      (s, i) =>
        `<li><span class="step-num" aria-hidden="true">${i + 1}</span><div class="step-body"><p class="step-when">${esc(s.when || stageLabel[s.stage])}</p><h3>${esc(s.title)}</h3>${list(s.actions)}${s.outcome ? `<p class="outcome"><strong>Outcome:</strong> ${esc(s.outcome)}</p>` : ''}</div></li>`
    )
    .join('')}</ol>`;
}

function resourceItem(x) {
  return `<li class="card res"><span class="badge">${esc(x.type)}</span><h3>${x.url ? ext(x.url, esc(x.title)) : esc(x.title)}</h3><p>${esc(x.use)}</p></li>`;
}
function rResources(d) {
  return has(d.resources) ? `<ul class="grid-cards">${d.resources.map(resourceItem).join('')}</ul>` : dataNeeded('Books, courses and tools for this domain');
}

function rPractical(d) {
  return has(d.practical)
    ? `<ul class="grid-cards">${d.practical.map((p) => `<li class="card"><h3>${esc(p.title)}</h3><p>${esc(p.detail)}</p></li>`).join('')}</ul>`
    : dataNeeded('Projects, clubs and practical experience');
}

function rMyths(d) {
  if (!has(d.myths)) return dataNeeded('Common misconceptions');
  return `<ul class="myths">${d.myths
    .map(
      (m) =>
        `<li class="myth-pair"><div class="myth"><p class="mlabel">Myth</p><p>${esc(m.myth)}</p></div><div class="truth"><p class="mlabel">Reality</p><p>${esc(m.reality)}</p></div></li>`
    )
    .join('')}</ul>`;
}

const attribution = (a) => `${esc(a.role)} · ${a.degree ? esc(a.degree) : 'degree not yet recorded'}`;
function rAdvice(d) {
  if (!has(d.advice)) return dataNeeded('Senior advice');
  return `<p class="note">Paraphrased from senior interviews. Seniors are identified by role and degree only.</p><div class="quotes">${d.advice
    .map((q) => `<figure class="quote"><blockquote><p>${esc(q.quote)}</p></blockquote><figcaption>${attribution(q.attribution)}</figcaption></figure>`)
    .join('')}</div>`;
}

function rSalaries(d) {
  const s = d.salaries;
  if (!s) return dataNeeded('Typical salaries and roles');
  let h = `<h3 class="sub">Typical range</h3>${s.typicalRange ? `<p class="big-figure">${esc(s.typicalRange)}</p>` : dataNeeded('A typical salary range')}`;
  h += `<h3 class="sub">Roles</h3>${has(s.roles) ? `<dl class="roles">${s.roles.map((r) => `<div><dt>${esc(r.role)}</dt><dd>${esc(r.detail)}</dd></div>`).join('')}</dl>` : dataNeeded('Role descriptions')}`;
  h += `<h3 class="sub">Reported compensation</h3>`;
  h += has(s.compensation)
    ? `<div class="table-wrap"><table class="simple"><thead><tr><th scope="col">Company</th><th scope="col">Figure</th><th scope="col">Note</th></tr></thead><tbody>${s.compensation
        .map((c) => `<tr><td>${esc(c.company)}</td><td>${esc(c.figure)}</td><td>${c.note ? esc(c.note) : '<span class="muted">-</span>'}</td></tr>`)
        .join('')}</tbody></table></div>`
    : dataNeeded('Company-wise compensation');
  return h;
}

const orNeeded = (v, fmt = esc) => (has(v) ? fmt(v) : inlineNeeded);
function companyCard(c) {
  return `<li class="card company"><h3>${esc(c.name)}</h3><dl>
<div><dt>Roles</dt><dd>${orNeeded(c.roles, (v) => esc(v.join(', ')))}</dd></div>
<div><dt>CPI cutoff</dt><dd>${orNeeded(c.cutoff)}</dd></div>
<div><dt>Interview focus</dt><dd>${orNeeded(c.interviewFocus, (v) => list(v))}</dd></div>
<div><dt>IITG history</dt><dd>${orNeeded(c.iitgHistory)}</dd></div>
<div><dt>Degree constraints</dt><dd>${orNeeded(c.degreeConstraints)}</dd></div>
${c.notes ? `<div><dt>Notes</dt><dd>${esc(c.notes)}</dd></div>` : ''}
</dl></li>`;
}
function rCompanies(d) {
  let h = d.companiesNote ? `<p class="note">${esc(d.companiesNote)}</p>` : '';
  h += has(d.companies) ? `<ul class="grid-cards companies">${d.companies.map(companyCard).join('')}</ul>` : dataNeeded('A directory of 2–3 key hiring companies');
  return h;
}

function rMarket(d) {
  return has(d.market)
    ? `<ul class="grid-cards">${d.market.map((m) => `<li class="card"><h3>${esc(m.title)}</h3><p>${esc(m.detail)}</p></li>`).join('')}</ul>`
    : dataNeeded('Market reality and hiring trends');
}

function rSelfCheck(d) {
  const sc = d.selfCheck;
  if (!sc || !has(sc.items)) return dataNeeded('A self-check list');
  return `<div class="checklist" data-checklist="${d.id}">
${sc.derived ? '<p class="note">Built from this domain’s senior advice. Your ticks are saved only in this browser.</p>' : ''}
<fieldset><legend class="vh">Self-check for ${esc(d.name)}</legend>
${sc.items.map((it, i) => `<div class="check"><input type="checkbox" id="chk-${d.id}-${i}" data-idx="${i}"><label for="chk-${d.id}-${i}">${esc(it)}</label></div>`).join('')}
</fieldset>
<div class="check-foot"><p class="progress" aria-live="polite"><span data-done>0</span> of ${sc.items.length} done</p><button type="button" class="btn btn-ghost" data-reset>Reset</button></div>
</div>`;
}

const SECTIONS = [
  ['overview', 'Overview', rOverview],
  ['timeline', 'Recruitment timeline', rTimeline],
  ['eligibility', 'Eligibility', rEligibility],
  ['skills', 'Skills needed', rSkills],
  ['roadmap', 'Preparation roadmap', rRoadmap],
  ['resources', 'Resources', rResources],
  ['practical', 'Projects, clubs & practical experience', rPractical],
  ['myths', 'Misconceptions vs reality', rMyths],
  ['advice', 'Senior advice', rAdvice],
  ['salaries', 'Salaries & roles', rSalaries],
  ['companies', 'Company directory', rCompanies],
  ['market', 'Market reality & trends', rMarket],
  ['selfcheck', 'Self-check', rSelfCheck],
];

// ---------- domain pages ----------
domains.forEach((d, i) => {
  const r = prefix(2);
  const prev = domains[i - 1];
  const next = domains[i + 1];
  const toc = SECTIONS.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('');
  const body = `
<div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${r}index.html">Home</a></li><li><a href="${r}index.html#domains">${esc(catLabel[d.category])}</a></li><li aria-current="page">${esc(d.name)}</li></ol></nav>
  <header class="domain-hero">
    <p class="badge badge-${d.category}">${esc(catLabel[d.category])}</p>
    <h1>${esc(d.name)}</h1>
    <p class="lede">${esc(d.summary)}</p>
    <div class="actions"><button type="button" class="btn" data-print>Print this domain</button><a class="btn btn-ghost" href="${r}${SITE.pdfPath}" download>Download full PDF</a></div>
  </header>
  <div class="domain-layout">
    <aside class="toc"><nav aria-label="On this page"><p class="toc-title">On this page</p><ol>${toc}</ol></nav></aside>
    <div class="domain-body">
      ${SECTIONS.map(([id, t, fn]) => sectionWrap(id, t, fn(d))).join('\n')}
    </div>
  </div>
  <nav class="pager" aria-label="Other domains">
    ${prev ? `<a class="pager-prev" href="${domainHref(r, prev.id)}"><span>Previous</span>${esc(prev.name)}</a>` : '<span></span>'}
    ${next ? `<a class="pager-next" href="${domainHref(r, next.id)}"><span>Next</span>${esc(next.name)}</a>` : '<span></span>'}
  </nav>
</div>`;
  page({
    out: `domains/${d.id}/index.html`,
    title: `${d.name} placement guide`,
    desc: `${d.name} at IIT Guwahati: ${d.summary}`,
    body,
    bodyClass: 'domain-page',
  });
});

// ---------- home ----------
const allCompanies = domains.flatMap((d) => (d.companies || []).map((c) => ({ ...c, domain: d.id })));
const allQuestions = domains.flatMap((d) => (d.interviewQuestions || []).map((q) => ({ ...q, domain: d.id })));
const allResources = domains.flatMap((d) => d.resources || []);

{
  const r = './';
  const chips = [`<button type="button" class="chip" data-cat="all" aria-pressed="true">All</button>`]
    .concat(DATA.categories.map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="false">${esc(c.label)}</button>`))
    .join('');
  const cards = domains
    .map(
      (d) => `<li class="dcard" data-id="${d.id}" data-cat="${d.category}">
  <p class="badge badge-${d.category}">${esc(catLabel[d.category])}</p>
  <h3><a href="${domainHref(r, d.id)}">${esc(d.name)}</a></h3>
  <p>${esc(d.summary)}</p>
  <p class="snippet" hidden></p>
  <p class="meta">${plural((d.companies || []).length, 'company', 'companies')} · ${plural((d.interviewQuestions || []).length, 'question')} · ${plural(d.roadmap.length, 'roadmap step')}</p>
</li>`
    )
    .join('');
  const quizData = {
    intro: DATA.quiz.intro,
    questions: DATA.quiz.questions,
    domains: Object.fromEntries(domains.map((d) => [d.id, { name: d.name, url: domainHref(r, d.id), summary: d.summary }])),
  };
  const quizForm = DATA.quiz.questions
    .map(
      (q, qi) => `<fieldset class="qq"><legend><span class="qn">${qi + 1}</span>${esc(q.text)}</legend>${q.options
        .map(
          (o, oi) =>
            `<div class="opt"><input type="radio" name="${q.id}" id="q-${q.id}-${oi}" value="${oi}"${oi === 0 && qi === 0 ? ' required' : ''}><label for="q-${q.id}-${oi}">${esc(o.label)}</label></div>`
        )
        .join('')}</fieldset>`
    )
    .join('');
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <p class="eyebrow">${esc(SITE.event)}</p>
    <h1>PlacementScope <span class="h1-sub">${esc(SITE.tagline)}</span></h1>
    <p class="hero-lede">${esc(SITE.purpose)}</p>
    <div class="actions"><a class="btn btn-accent" href="#domains">Explore domains</a><a class="btn btn-light" href="${r}roadmap/index.html">See the roadmap</a><a class="btn btn-light" href="${r}${SITE.pdfPath}" download>Download PDF</a></div>
    <ul class="stats" aria-label="Guide at a glance">
      <li><strong>${domains.length}</strong> domains</li>
      <li><strong>${allCompanies.length}</strong> companies</li>
      <li><strong>${allQuestions.length}</strong> interview questions</li>
      <li><strong>${allResources.length}</strong> resources</li>
    </ul>
  </div>
</section>
<div class="wrap">
  <section id="domains" class="block" aria-labelledby="domains-h">
    <h2 id="domains-h">Explore domains</h2>
    <div class="finder">
      <div class="search"><label for="search">Search the whole guide</label><input id="search" type="search" placeholder="e.g. GATE, guesstimate, CPI, Rippling" autocomplete="off"></div>
      <div class="chips" role="group" aria-label="Filter by category">${chips}</div>
    </div>
    <p class="status" id="search-status" aria-live="polite"></p>
    <ul class="dgrid">${cards}</ul>
  </section>
  <section id="quiz" class="block quiz" aria-labelledby="quiz-h">
    <h2 id="quiz-h">Which domain fits me?</h2>
    <p>${esc(DATA.quiz.intro)}</p>
    <noscript><p class="note">The quiz needs JavaScript. You can still browse every domain above.</p></noscript>
    <form id="quiz-form" novalidate>${quizForm}<div class="quiz-actions"><button type="submit" class="btn btn-accent">Show my matches</button><button type="reset" class="btn btn-ghost">Start over</button></div></form>
    <div id="quiz-result" class="quiz-result" aria-live="polite" tabindex="-1"></div>
    <script type="application/json" id="quiz-data">${JSON.stringify(quizData).replace(/</g, '\\u003c')}</script>
  </section>
</div>`;
  page({ out: 'index.html', title: '', desc: `${SITE.purpose} Domain guides, roadmaps, companies and interview questions for IIT Guwahati students.`, body, active: 'home', bodyClass: 'home' });
}

// ---------- roadmap hub ----------
{
  const r = '../';
  const chips = [`<button type="button" class="chip" data-filter="all" aria-pressed="true">All domains</button>`]
    .concat(domains.map((d) => `<button type="button" class="chip" data-filter="${d.id}" aria-pressed="false">${esc(d.name)}</button>`))
    .join('');
  const stages = DATA.roadmapStages
    .map((s) => {
      const items = domains.flatMap((d) => d.roadmap.filter((x) => x.stage === s.id).map((x) => ({ ...x, d })));
      if (!items.length) return '';
      return `<li class="hub-stage" data-stage="${s.id}"><h2>${esc(s.label)}</h2><ul class="hub-items">${items
        .map(
          (x) =>
            `<li class="hub-item card" data-item="${x.d.id}"><p class="badge badge-${x.d.category}"><a href="${domainHref(r, x.d.id)}#roadmap">${esc(x.d.name)}</a></p><h3>${esc(x.title)}</h3>${x.when ? `<p class="step-when">${esc(x.when)}</p>` : ''}${list(x.actions)}</li>`
        )
        .join('')}</ul></li>`;
    })
    .join('');
  const body = `<div class="wrap">
  <header class="page-head"><h1>Roadmap: semester by semester</h1><p class="lede">Milestones from every domain on one timeline. Filter to the domains you care about.</p></header>
  <div class="chips scroll-chips" role="group" aria-label="Filter roadmap by domain" data-filter-group="hub">${chips}</div>
  <p class="status" aria-live="polite" data-filter-status="hub"></p>
  <ol class="hub">${stages}</ol>
</div>`;
  page({ out: 'roadmap/index.html', title: 'Semester-by-semester roadmap', desc: 'A combined preparation timeline from 1st year to the 1 December placement drive, across all 11 domains.', body, active: 'roadmap' });
}

// ---------- companies ----------
{
  const r = '../';
  const opts = domains.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  const rows = allCompanies
    .map(
      (c) => `<tr data-domain="${c.domain}">
<th scope="row" data-label="Company">${esc(c.name)}</th>
<td data-label="Domain"><a href="${domainHref(r, c.domain)}#companies">${esc(domainName[c.domain])}</a></td>
<td data-label="Roles">${esc((c.roles || []).join(', '))}</td>
<td data-label="CPI cutoff" data-sort="${esc(c.cutoff || '')}">${c.cutoff ? esc(c.cutoff) : inlineNeeded}</td>
<td data-label="Interview focus">${has(c.interviewFocus) ? esc(c.interviewFocus.join('; ')) : inlineNeeded}</td>
<td data-label="Notes">${esc([c.iitgHistory, c.degreeConstraints, c.notes].filter(Boolean).join(' '))}</td>
</tr>`
    )
    .join('');
  const sortBtn = (label, i) => `<th scope="col" aria-sort="none"><button type="button" data-sort-col="${i}">${label}<span class="sort-ind" aria-hidden="true"></span></button></th>`;
  const body = `<div class="wrap">
  <header class="page-head"><h1>Company directory</h1><p class="lede">Every company named by the seniors we interviewed, with the cutoffs and interview focus they reported. “Data needed” means the seniors didn’t mention it.</p></header>
  <div class="filters">
    <div><label for="co-domain">Domain</label><select id="co-domain"><option value="all">All domains</option>${opts}</select></div>
    <div><label for="co-text">Filter</label><input id="co-text" type="search" placeholder="Company, role or topic"></div>
  </div>
  <p class="status" id="co-status" aria-live="polite">${allCompanies.length} companies</p>
  <div class="table-wrap"><table class="data-table" id="co-table"><caption class="vh">Companies by domain. Column headers are sort buttons.</caption>
  <thead><tr>${['Company', 'Domain', 'Roles', 'CPI cutoff', 'Interview focus', 'Notes'].map(sortBtn).join('')}</tr></thead>
  <tbody>${rows}</tbody></table></div>
  <p class="note">Domains with no named companies in the guide yet: ${domains.filter((d) => !has(d.companies)).map((d) => `<a href="${domainHref(r, d.id)}#companies">${esc(d.name)}</a>`).join(', ')}.</p>
</div>`;
  page({ out: 'companies/index.html', title: 'Company directory', desc: 'Companies recruiting IIT Guwahati students across 11 domains, with CPI cutoffs, roles and interview focus reported by seniors.', body, active: 'companies' });
}

// ---------- questions ----------
{
  const r = '../';
  const qDomains = domains.filter((d) => has(d.interviewQuestions));
  const chips = [`<button type="button" class="chip" data-filter="all" aria-pressed="true">All</button>`]
    .concat(qDomains.map((d) => `<button type="button" class="chip" data-filter="${d.id}" aria-pressed="false">${esc(d.name)}</button>`))
    .join('');
  const items = allQuestions
    .map(
      (q) => `<li class="card qcard" data-item="${q.domain}"><p class="q">${esc(q.q)}</p>${q.a ? `<p class="a"><strong>Answer:</strong> ${esc(q.a)}</p>` : ''}<p class="tags"><a class="tag tag-domain" href="${domainHref(r, q.domain)}#timeline">${esc(domainName[q.domain])}</a><span class="tag">${esc(q.round)}</span><span class="tag">${esc(q.topic)}</span><span class="tag tag-kind">${q.kind === 'recalled' ? 'Recalled' : 'Question type'}</span></p></li>`
    )
    .join('');
  const body = `<div class="wrap">
  <header class="page-head"><h1>Interview question bank</h1><p class="lede">Questions seniors remember being asked (<strong>Recalled</strong>), and the kinds of question they said to expect (<strong>Question type</strong>).</p></header>
  <div class="chips scroll-chips" role="group" aria-label="Filter questions by domain" data-filter-group="q">${chips}</div>
  <p class="status" aria-live="polite" data-filter-status="q"></p>
  <ul class="grid-cards qbank">${items}</ul>
  <p class="note">No questions recorded yet for: ${domains.filter((d) => !has(d.interviewQuestions)).map((d) => esc(d.name)).join(', ')}.</p>
</div>`;
  page({ out: 'questions/index.html', title: 'Interview question bank', desc: 'Interview questions recalled by IIT Guwahati seniors in Civil, Product, Data Science, Consulting, Trading and SDE placements.', body, active: 'questions' });
}

// ---------- resources ----------
{
  const r = '../';
  const groups = domains
    .map(
      (d) => `<section class="res-group" aria-labelledby="res-${d.id}"><h2 id="res-${d.id}"><a href="${domainHref(r, d.id)}#resources">${esc(d.name)}</a></h2>${rResources(d)}</section>`
    )
    .join('');
  const body = `<div class="wrap">
  <header class="page-head"><h1>Resources</h1><p class="lede">Books, playlists, platforms and casebooks recommended by seniors, grouped by domain. External links open in a new tab.</p></header>
  ${groups}
</div>`;
  page({ out: 'resources/index.html', title: 'Resources', desc: 'Books, courses, platforms and casebooks recommended by IIT Guwahati seniors for each placement domain.', body, active: 'resources' });
}

// ---------- alumni ----------
{
  const r = '../';
  const rows = DATA.alumni
    .map(
      (a) => `<tr><th scope="row" data-label="Domain"><a href="${domainHref(r, a.domain)}">${esc(domainName[a.domain])}</a></th>
<td data-label="Senior">${esc(a.role)}</td>
<td data-label="Degree">${a.degree ? esc(a.degree) : inlineNeeded}</td>
<td data-label="Graduation year">${a.graduationYear ? esc(a.graduationYear) : inlineNeeded}</td>
<td data-label="Contact">${esc(a.contact)}</td>
<td data-label="Proof of conversation">${a.proofNote ? esc(a.proofNote) : '<span class="muted">Attached in PDF annexure</span>'}</td></tr>`
    )
    .join('');
  const body = `<div class="wrap">
  <header class="page-head"><h1>Alumni verification annexure</h1><p class="lede">The seniors interviewed for each domain. Names and contact details are withheld here; they are in the PDF annexure verified by the Sahyog OC.</p></header>
  <div class="table-wrap"><table class="data-table"><caption class="vh">Seniors interviewed, by domain</caption>
  <thead><tr><th scope="col">Domain</th><th scope="col">Senior</th><th scope="col">Degree</th><th scope="col">Graduation year</th><th scope="col">Contact</th><th scope="col">Proof of conversation</th></tr></thead>
  <tbody>${rows}</tbody></table></div>
</div>`;
  page({ out: 'alumni/index.html', title: 'Alumni annexure', desc: 'The IIT Guwahati seniors interviewed for each PlacementScope domain, by role, degree and year.', body, active: 'alumni' });
}

// ---------- about ----------
{
  const r = '../';
  const body = `<div class="wrap narrow">
  <header class="page-head"><h1>About PlacementScope</h1><p class="lede">${esc(SITE.purpose)}</p></header>
  <section class="block"><h2>The problem</h2>
  <p>Placement information at IIT Guwahati travels through WhatsApp forwards, half-true stories and guesswork. PlacementScope, a Sahyog'26 event by the Students' Welfare Board and the Academic Initiatives Club, asks each team to build one guide rooted in real experience, so that any student can open it and get real, usable help.</p>
  <p>The brief asks for 10 of 12 domains, each backed by interviews with seniors who were actually placed or went on to further studies, with B.Tech, M.Tech and PhD differences shown separately. For each domain it asks for:</p>
  ${list(['Recruitment timeline and process, from PPTs to interviews', 'Eligibility differences by degree', 'Practical experience, certifications and resources', 'Common misconceptions and verified senior advice', 'Typical salaries and roles', 'A directory of 2–3 key companies with degree constraints and IITG hiring history', 'Market realities, and self-check feedback loops'])}
  </section>
  <section class="block"><h2>How this guide was built</h2>
  <p>Our team interviewed seniors in each domain and wrote up what they told us. This site presents the same content as the PDF guide. It covers ${domains.length} domains (the required 10 plus one bonus); Chemical Core is not covered.</p>
  <p>Where the brief asks for something our interviews didn’t cover, you’ll see a <span class="dn-inline">Data needed</span> marker instead of a guess. We would rather leave a gap than invent a salary, a cutoff or a company.</p>
  <p>Self-check lists are built from each domain’s own senior advice. The “Which domain fits me?” quiz uses simple rules written by our team on top of the guide’s facts; treat it as a starting point.</p>
  </section>
  <section class="block"><h2>Disclaimer</h2><p>${esc(SITE.disclaimer)}</p><p>Senior names are withheld on this site; advice is attributed by role and degree only.</p></section>
  <section class="block"><h2>Download</h2><p><a class="btn btn-accent" href="${r}${SITE.pdfPath}" download>Download the full guide (PDF)</a></p></section>
</div>`;
  page({ out: 'about/index.html', title: 'About', desc: 'How PlacementScope was built, what the Sahyog problem statement asks for, and how to read this guide.', body, active: 'about' });
}

// ---------- 404 ----------
page({
  out: '404.html',
  title: 'Page not found',
  desc: 'This page does not exist.',
  body: `<div class="wrap narrow"><header class="page-head"><h1>Page not found</h1><p class="lede">That page doesn’t exist. Try the <a href="./index.html">home page</a>.</p></header></div>`,
  noindex: true,
});

// ---------- write ----------
fs.rmSync(DIST, { recursive: true, force: true });
const copyDir = (src, dst) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const t = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, t) : fs.copyFileSync(s, t);
  }
};
copyDir(path.join(ROOT, 'public'), DIST);
copyDir(path.join(ROOT, 'src/assets'), path.join(DIST, 'assets'));
for (const p of pages) {
  const f = path.join(DIST, p.out);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  // The 404 page is served from arbitrary depths, so make its links root-relative.
  const html = p.out === '404.html' ? p.html.replace(/(href|src)="\.\//g, '$1="/') : p.html;
  fs.writeFileSync(f, html);
}

// search index
const strip = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(strip).join(' ') : typeof v === 'object' ? Object.values(v).map(strip).join(' ') : String(v));
const index = domains.map((d) => {
  const { id, category, ...rest } = d;
  return { id, text: strip(rest).replace(/\s+/g, ' ') };
});
fs.writeFileSync(path.join(DIST, 'search-index.json'), JSON.stringify(index));

// sitemap + robots
const today = new Date().toISOString().slice(0, 10);
if (BASE) {
  const urls = pages.filter((p) => !p.noindex).map((p) => `  <url><loc>${BASE}/${p.url}</loc><lastmod>${today}</lastmod></url>`);
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n${BASE ? `Sitemap: ${BASE}/sitemap.xml\n` : ''}`);

// ---------- TODO_CONTENT.md ----------
const LABELS = {
  timeline: 'Recruitment timeline',
  interviewQuestions: 'Recalled interview questions',
  skills: 'Skills',
  certifications: 'Certifications',
  roadmap: 'Preparation roadmap',
  resources: 'Resources (books, courses, tools)',
  practical: 'Projects / clubs / practical experience',
  myths: 'Misconceptions vs reality',
  advice: 'Senior advice',
  salaries: 'Salaries & roles',
  companies: 'Company directory (2–3 companies)',
  market: 'Market reality & trends',
  selfCheck: 'Self-check list',
};
const todo = [
  '# TODO_CONTENT',
  '',
  `_Generated by \`npm run build\` on ${today}. Do not edit by hand: fill the gaps in \`src/data/domains.json\` and rebuild._`,
  '',
  'Every item below renders as a "Data needed" or "Not covered yet" marker on the site. Fill in only facts confirmed by seniors.',
  '',
  '## General',
  '',
  ...DATA.contentGaps.map((g) => `- [ ] ${g}`),
  '',
];
for (const d of domains) {
  const gaps = [];
  for (const [k, l] of Object.entries(LABELS)) if (!has(d[k])) gaps.push(l);
  const e = d.eligibility || {};
  if (!has(e.general)) gaps.push('General eligibility (branches, CPI)');
  for (const [k, l] of [['btech', 'B.Tech'], ['mtech', 'M.Tech'], ['phd', 'PhD']]) if (!has(e[k])) gaps.push(`Eligibility: ${l}`);
  if (d.salaries) {
    if (!d.salaries.typicalRange) gaps.push('Typical salary range');
    if (!has(d.salaries.compensation)) gaps.push('Company-wise compensation');
  }
  for (const c of d.companies || []) {
    const miss = [['cutoff', 'CPI cutoff'], ['interviewFocus', 'interview focus'], ['degreeConstraints', 'degree constraints']].filter(([k]) => !has(c[k])).map(([, l]) => l);
    if (miss.length) gaps.push(`${c.name}: ${miss.join(', ')}`);
  }
  for (const r of (d.resources || []).filter((x) => !x.url)) gaps.push(`Resource link: ${r.title}`);
  const advNoDeg = (d.advice || []).filter((a) => !a.attribution.degree).length;
  if (advNoDeg) gaps.push(`Degree for ${advNoDeg} advice attribution(s)`);
  todo.push(`## ${d.name}`, '', ...(gaps.length ? gaps.map((g) => `- [ ] ${g}`) : ['- Nothing missing.']), '');
}
const alumniGaps = DATA.alumni.filter((a) => !a.degree || !a.graduationYear || !a.proofNote);
todo.push('## Alumni annexure', '', ...alumniGaps.map((a) => `- [ ] ${domainName[a.domain]} (${a.role}): ${[!a.degree && 'degree', !a.graduationYear && 'graduation year', !a.proofNote && 'proof note'].filter(Boolean).join(', ')}`), '');
fs.writeFileSync(path.join(ROOT, 'TODO_CONTENT.md'), todo.join('\n'));

if (!fs.existsSync(path.join(DIST, SITE.pdfPath))) console.warn(`! ${SITE.pdfPath} not found in public/. The Download button will 404 until you add it.`);
console.log(`Built ${pages.length} pages into dist/ (base URL: ${BASE || 'none'})`);
