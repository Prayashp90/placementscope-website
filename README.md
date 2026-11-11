# PlacementScope website

A static, mobile-first companion site to the PlacementScope guide (Sahyog'26, Students' Welfare Board × Academic Initiatives Club, IIT Guwahati).

- **No dependencies.** Node 18+ runs a small build script; the output is plain HTML, CSS and JS.
- **One content file.** Everything lives in [`src/data/domains.json`](src/data/domains.json). Edit it and rebuild; no layout code needs touching.
- **Gaps are visible.** Any field set to `null` renders a "Data needed" card and is listed automatically in [`TODO_CONTENT.md`](TODO_CONTENT.md) on every build.

## Quick start

```bash
npm run build     # generate dist/ (also regenerates TODO_CONTENT.md)
npm run serve     # preview at http://localhost:8080  (or: npm start to build + serve)
npm run check     # build + broken-link check + accessibility check
```

No `npm install` is needed.

## Project layout

```
content/               Source PDFs (guide draft and problem statement). Not published.
src/data/domains.json  ALL site content: domains, quiz rules, alumni rows, content gaps
src/assets/            styles.css and app.js (copied to dist/assets)
public/                Copied as-is to the site root (favicon, guide PDF)
scripts/build.mjs      Static site generator
scripts/check-links.mjs  Internal link + #anchor checker (--external also pings outside links)
scripts/check-a11y.mjs   Static accessibility + WCAG AA contrast checks
dist/                  Build output: deploy this folder
```

## Editing content

1. Open `src/data/domains.json`.
2. Replace a `null` with real data, following the shape of a filled-in domain (Product Management and SDE are the most complete examples).
3. Run `npm run build`. `TODO_CONTENT.md` updates itself.

Notes:
- Roadmap steps need a `stage` matching an id in `roadmapStages`; that's how the Roadmap hub groups them.
- Interview questions take `"kind": "recalled"` (actually asked) or `"typical"` (a type of question the senior described).
- Advice attributions are `{ "role": "...", "degree": "..." }`. **Never add names or hostel names.** The footer shows only `Hostel ID: 2602`.
- Contacts in `alumni` stay as "Provided in PDF annexure" unless you deliberately add details.

## Before you publish

1. **Add the guide PDF** at `public/PlacementScope_Guide.pdf`. Until then the Download buttons return 404, and the build prints a warning.
2. **Set the site URL** in `site.baseUrl` (or the `SITE_URL` environment variable). It's used for canonical links, Open Graph tags and `sitemap.xml`.

## Deploy

### Option A: Netlify drag-and-drop (fastest)
1. `npm run build`
2. Go to <https://app.netlify.com/drop> and drag the **`dist`** folder onto the page.
3. Netlify gives you a URL. Put it in `site.baseUrl`, rebuild and drop again so the sitemap and canonical links match.

### Option B: Netlify from Git
Push the repo and import it in Netlify. `netlify.toml` already sets the build command (`npm run build`) and publish folder (`dist`).

### Option C: GitHub Pages
1. Push this folder to a GitHub repository (branch `main`).
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Optional: in **Settings → Variables → Actions**, add `SITE_URL` (e.g. `https://<user>.github.io/<repo>`).
4. Every push to `main` runs `.github/workflows/pages.yml`, which builds, runs the link and accessibility checks, and deploys `dist/`.

All internal links are relative, so the site works under a sub-path like `/<repo>/`. The only exception is `404.html`, which uses root-relative links so it works at any depth; on a project sub-path its links point to the domain root.

### Any other static host (Vercel, Cloudflare Pages, S3…)
Build command `npm run build`, output directory `dist`.

## Quality checks

`npm run check` builds the site, then:
- **Links:** every internal `href`/`src` and `#anchor` must resolve. The not-yet-added guide PDF is reported as a warning, not a failure.
- **Accessibility:** `lang`, titles, meta descriptions, a single `h1`, no skipped heading levels, labelled form controls, named buttons and links, valid ARIA references, `rel="noopener"` on new-tab links, table header scope, and WCAG AA (4.5:1) contrast for every theme colour pair in light and dark mode.

Lighthouse (Chrome, mobile, local server) on the home, Civil Core and Companies pages: **Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100.** One Civil Core run scored 94 on Performance; repeat runs scored 100.

## Features

- Home: hero, full-text search across all domain content, category filter chips, and a 4-question "Which domain fits me?" quiz (rules in `quiz` in the data file).
- 11 domain pages with 13 fixed sections, a sticky table of contents on desktop, collapsible sections on mobile, B.Tech/M.Tech/PhD tabs, a roadmap stepper, myth/reality cards, quote callouts and a self-check list saved in `localStorage`.
- Roadmap hub (semester by semester, filterable by domain), sortable/filterable company directory, interview question bank, resources, alumni annexure, and About page.
- Light/dark mode (follows the system, with a toggle), print stylesheet for domain pages, `prefers-reduced-motion` support, sitemap.xml, robots.txt, Open Graph tags. No analytics, no external requests.
