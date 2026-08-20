# The Daily Grind — website

A five-page, mobile-responsive site for a San Francisco coffee shop. Plain HTML, CSS,
and JavaScript — no build step, no framework, no dependencies. Open `index.html` in a
browser and it works.

**Status: demo build.** All business details are realistic placeholders. See
[Before this goes live](#before-this-goes-live).

---

## Run it

Just double-click `index.html`.

For the Google Map iframe and the web fonts you'll need an internet connection. If you'd
rather serve it properly (recommended — matches production behaviour):

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Files

```
index.html             Home
menu.html              Menu (with category filter)
hours-location.html    Hours, address, embedded Google Map, getting here
about.html             Story, values, team
contact.html           Contact form, details, FAQ, map
css/styles.css         Entire design system — colours, type, components
js/main.js             All behaviour (see below)
assets/img/            SVG illustrations + favicon
robots.txt             Search engine directives
sitemap.xml            Page list for search engines
```

## What the JavaScript does

`js/main.js` is one file, commented by section:

| Section | Behaviour |
|---|---|
| 1 | **`HOURS` table — the single source of truth for opening hours** |
| 3 | Live "Open now / Closed" badge in the header, footer, and page bodies |
| 4 | Fills the hours table on Hours & Location and marks today's row |
| 5 | Mobile navigation (hamburger, Escape to close, closes on link click) |
| 6 | Sticky header shadow on scroll |
| 7 | Scroll-reveal animations (disabled under `prefers-reduced-motion`) |
| 8 | Menu category filter chips |
| 9 | Contact form validation — **demo only, does not send** |
| 10 | Footer copyright year |

The open/closed badge is computed in `America/Los_Angeles`, so it reads correctly for a
visitor in any timezone.

## Editing the common things

**Opening hours** — edit the `HOURS` array at the top of `js/main.js`. That one edit updates
the header badge, the footer badge, and the hours table. Then update, in each page's
`<head>`, the `openingHoursSpecification` JSON-LD block, plus the static hours list in the
footer (kept static so it's readable without JavaScript).

**Colours and fonts** — every colour, font, spacing step, and radius is a custom property in
the `:root` block at the top of `css/styles.css`. Change them there and the whole site follows.

**Menu items** — `menu.html`, one `<li class="menu-item">` per item. Copy an existing one.
The `data-category` on each `<section class="menu-group">` must match a chip's `data-filter`.

**The map** — the `<iframe>` `src` on `hours-location.html` and `contact.html`. Replace the
address in the query string, or paste the embed URL Google Maps gives you under Share → Embed a map.

**Images** — the SVG illustrations are placeholders. See `assets/img/README.md`.

## Accessibility & SEO

- Skip link, semantic landmarks, visible focus rings, labelled form fields with `role="alert"` errors
- `prefers-reduced-motion` respected; site is fully usable with JavaScript disabled
- Unique `<title>` and meta description per page; canonical URLs; Open Graph + Twitter cards
- `CafeOrCoffeeShop` JSON-LD with address, geo coordinates, and opening hours — this is what
  feeds the Google "open now / hours" panel in local search
- `sitemap.xml` and `robots.txt` included

---

## Before this goes live

Everything below is placeholder content and **must** be replaced.

### 1. Business details (appear on every page)

| Placeholder | Where |
|---|---|
| `1247 Valencia Street, San Francisco, CA 94110` | all pages: footer, JSON-LD, map iframe, `<meta name="description">` |
| `(415) 555-0142` / `tel:+14155550142` | all pages: footer, contact, hours |
| `hello@thedailygrind.cafe` | all pages: footer, contact |
| `https://thedailygrind.cafe/` | `<link rel="canonical">`, Open Graph URLs, `sitemap.xml`, `robots.txt` |
| Latitude/longitude `37.7519, -122.4207` | JSON-LD on `index.html` and `hours-location.html` |
| Instagram / Facebook links (`https://instagram.com/`) | footer on all pages, contact page |
| Opening hours | `js/main.js` `HOURS`, JSON-LD, footer lists |

### 2. Content written as filler

- **Menu items and prices** (`menu.html`) — invented, though sized for SF.
- **Customer reviews** (`index.html`, "From the neighborhood") — invented. Replace with real,
  attributable quotes, or delete the section. Do not publish these as if they were real reviews.
- **The founding story and team** (`about.html`) — Elena, Marcus, and Thandi are invented, as is
  the 2016 hardware-store origin. Same rule: real names and real history, or cut it.
- **The "4.8 out of 5 across 600+ reviews" badge** (`index.html` hero) — invented figure.

### 3. Make the contact form actually send

The form validates but goes nowhere. Pick a handler and wire it up:

```html
<!-- contact.html -->
<form class="form" data-contact-form novalidate
      action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

Then delete the demo branch in `js/main.js` section 9 (the `setTimeout` that fakes success)
so the browser submits normally. Formspree, Netlify Forms, and Basin all work with no backend.

### 4. Images

Replace the SVG illustrations with the client's photos — see `assets/img/README.md` for
sizes and the exact lines to change.

---

## Note on the WordPress requirement

The original scope called for WordPress + Elementor so the client can edit the site
themselves through wp-admin. This build is static HTML/CSS/JS, which means **there is no
admin login — content changes happen by editing these files.**

Porting it later is straightforward: the design system lives entirely in CSS custom
properties, each page is one flat column of sections, and there's no framework to unpick.
The usual route is a lightweight theme (or a blank Elementor canvas) with each `<section>`
rebuilt as an Elementor section, `styles.css` loaded as the theme stylesheet, and the SEO
meta moved into Yoast or Rank Math.

Hosting this version as-is works on any static host — Netlify, Cloudflare Pages, GitHub
Pages, or plain shared hosting — but the client would need someone to make text changes.
