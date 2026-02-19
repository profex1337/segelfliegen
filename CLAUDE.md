# CLAUDE.md — Segelflugplatz Altdorf Website

This file describes the codebase for AI assistants (Claude and others) working on this project.

---

## Project Overview

A static website for **Segelflugplatz Altdorf-Hagenhausen / Post-SV Nürnberg e.V.**, a German gliding club.

- **Live URL**: https://www.segelfliegenaltdorf.de
- **Hosting**: GitHub Pages (configured via `CNAME`)
- **Language**: German (all user-facing content is in German)
- **Stack**: Vanilla HTML5 / CSS3 / ES6+ JavaScript — no build step, no package manager

---

## Repository Structure

```
segelfliegen/
├── index.html            # Home page (hero video, dynamic news, reviews)
├── uber-uns.html         # About the club
├── mitfliegen.html       # Scenic flights & gift vouchers (with booking form)
├── ausbildung.html       # Pilot training & licensing (with inquiry form)
├── flugzeugpark.html     # Aircraft fleet showcase
├── veranstaltungen.html  # Events & photo galleries (with booking form)
├── kontakt.html          # Contact page (map, contact form)
├── impressum.html        # Legal notice (Impressum — German legal requirement)
├── datenschutz.html      # Privacy policy & cookie consent
├── intern.html           # Members-only admin panel (news CRUD)
│
├── script.js             # Shared UI logic: header/footer injection, mobile menu,
│                         #   accordion, cookie consent, video lazy-load
├── news-db.js            # Firebase integration: auth, Firestore CRUD for news feed
├── style.css             # All styling (1 500+ lines, CSS variables, responsive)
│
├── images/               # Static image assets (logos, aircraft, team photos, etc.)
├── videos/               # Hero section .mp4 videos
│
├── CNAME                 # GitHub Pages custom domain: www.segelfliegenaltdorf.de
├── robots.txt            # Search engine directives
└── sitemap.xml           # XML sitemap (update lastmod when pages change)
```

---

## Architecture

### Static + Serverless

There is **no server-side runtime** and **no build pipeline**. Every file is served exactly as committed.

| Concern | Solution |
|---|---|
| Dynamic content (news) | Firebase Firestore + real-time `onSnapshot` listener |
| Form submissions | Formspree (third-party service, no backend needed) |
| Authentication (admin) | Firebase Authentication (email/password) |
| Date picker | Flatpickr loaded from jsDelivr CDN |
| Fonts | Google Fonts CDN |
| Maps | Google Maps Embed API |

### Shared Header & Footer

`script.js` injects a common header and footer into every page at runtime using `innerHTML`. There is **no server-side templating**. Changes to the navigation must be made in the `headerHTML` template literal inside `script.js`.

### Firebase Integration (`news-db.js`)

The module is loaded as an **ES module** (`type="module"`) and handles:

1. `initFirebase()` — initialises Firebase app, chooses collection path, calls `startNewsLogic()`
2. `startNewsLogic()` — sets up `onAuthStateChanged` listener; renders news and admin UI accordingly
3. `onSnapshot()` — real-time listener that re-renders the news list whenever Firestore data changes
4. Admin CRUD — `addDoc`, `updateDoc`, `deleteDoc` are called from the admin panel on `intern.html`

**Firestore collection path (production)**:
```
news/  (top-level collection, documents sorted descending by timestamp)
```

**Document schema**:
```js
{
  title:     string,           // News headline
  date:      string,           // Display date, format "DD.MM.YYYY"
  text:      string,           // Body text (newlines preserved via white-space: pre-wrap)
  imageUrl:  string | null,    // Optional Imgur image URL
  timestamp: number            // Unix ms — used for sort order
}
```

---

## Development Workflow

### No Build Step

Edit files directly and open in a browser. No compilation, transpilation, or bundling is needed.

```bash
# Open the site locally — any static file server works, e.g.:
python3 -m http.server 8080
# then visit http://localhost:8080
```

### Deploying

Deployment is automatic via **GitHub Pages**. Pushing to the `main` branch (or whichever branch GitHub Pages is configured to serve) publishes the changes live within seconds.

```bash
git add <files>
git commit -m "Describe the change"
git push origin main
```

**After deploying**, update `sitemap.xml` `<lastmod>` timestamps for any pages that changed.

### No Tests or Linter

There is no test suite and no linter/formatter configuration. Validate changes by opening the affected pages in a browser.

---

## Key Conventions

### HTML

- **Semantic HTML5** — use `<section>`, `<article>`, `<header>`, `<nav>`, `<footer>` appropriately.
- **BEM-like class naming** — e.g., `.card-grid`, `.page-header`, `.hero-section`, `.news-item`.
- **Every page** must include `script.js` as `type="module"` at the bottom of `<body>`:
  ```html
  <script type="module" src="script.js"></script>
  ```
- **Pages with news** also include `news-db.js` as `type="module"`.
- **Inline JSON-LD** schema.org markup is present on content pages for SEO — keep it accurate.
- **Open Graph** meta tags are on every page — update them when adding new pages.
- **Language attribute**: `<html lang="de">` on all pages.

### CSS (`style.css`)

- **CSS custom properties** are declared in `:root` — use these variables rather than hardcoded values:
  ```css
  --primary: #0f3460      /* Dark blue — brand primary */
  --accent: #e94560       /* Red/pink — CTAs, highlights */
  --text-main: #333333
  --bg-light: #f4f6f8
  --white: #ffffff
  ```
- **Mobile-first responsive** — base styles target mobile; media queries add larger-screen layouts.
- **Breakpoints**: 500 px, 600 px, 700 px, 768 px, 992 px.
- All new rules go into `style.css` — do not create additional CSS files.

### JavaScript

- **ES6+ syntax** — arrow functions, `const`/`let`, template literals, destructuring.
- **No framework** — vanilla DOM APIs only.
- **camelCase** for variables and functions; **PascalCase** is not used for functions.
- **Comments** in the source are written in German.
- Firebase SDK is imported directly from the Google CDN (gstatic) using ES module URLs — do **not** switch to npm imports.
- Never store sensitive logic client-side; secrets must remain in Firebase security rules or the Formspree config.

### Adding a New Page

1. Copy an existing page as a template (e.g., `kontakt.html`).
2. Update `<title>`, Open Graph tags, and JSON-LD.
3. Add a `<nav>` link in the `headerHTML` template in `script.js`.
4. Add the URL to `sitemap.xml`.
5. If the page needs forms, point `action` to the correct Formspree endpoint.

---

## External Services & Configuration

| Service | Config location | Notes |
|---|---|---|
| **Firebase** | `news-db.js` lines 5–13 | Project ID: `segelfliegen`. API key is public (restricted via Firebase console). |
| **Formspree** | `action` attributes in HTML forms | One endpoint per form; find them in `mitfliegen.html`, `ausbildung.html`, `veranstaltungen.html`, `kontakt.html`. |
| **Google Maps** | Embed `<iframe>` in `kontakt.html` | Uses an embedded maps URL with API key. |
| **Flatpickr** | CDN `<script>` in booking-form pages | German locale (`flatpickr/dist/l10n/de.js`) is loaded separately. |
| **Google Fonts** | `<link>` in `<head>` of each page | Montserrat (headings) + Open Sans (body) + Tangerine (decorative). |
| **GitHub Pages** | `CNAME` file | Do not delete or rename this file — it maps the domain. |

---

## Admin Panel (`intern.html`)

- Protected by Firebase email/password authentication.
- Admin email: `info@segelfliegen-altdorf.de` (password managed in Firebase console).
- Admins can create, edit, and delete news posts.
- Image uploads use **Imgur** — admins copy-paste the direct image URL into the form.
- `intern.html` is not linked from the public navigation; access it directly at `/intern.html`.

---

## SEO & Legal Files

| File | Purpose | When to update |
|---|---|---|
| `sitemap.xml` | Tells search engines which pages exist | After adding/removing pages or significant content updates |
| `robots.txt` | Crawl directives | Only if crawl rules need to change |
| `impressum.html` | German legal requirement (Impressum) | If club contact details or responsible persons change |
| `datenschutz.html` | Privacy policy (DSGVO/GDPR) | If external services are added/removed |

---

## Images & Videos

- Images live in `images/` — use descriptive filenames (e.g., `duo-discus-start.jpg`).
- Videos live in `videos/` — used as `<source>` elements in hero `<video>` tags.
- Prefer `.webp` for new images (smaller file size); `.jpg` is also acceptable.
- Keep video files under ~10 MB where possible; the repository is already large (~357 MB).
- Always provide an `alt` attribute on `<img>` tags.

---

## Common Tasks

### Update the News Feed

News is managed through the admin panel at `/intern.html`. Admins log in with their Firebase credentials and create/edit/delete posts through the UI. No code changes are needed.

### Change Navigation Links

Edit the `headerHTML` template literal in `script.js`. The change applies to all pages automatically since the header is injected at runtime.

### Add/Update a Booking Form

1. Create a Formspree form at formspree.io and copy the endpoint URL.
2. Set the `action` attribute of the HTML `<form>` to that URL.
3. Ensure `method="POST"` and the hidden input `<input type="hidden" name="_subject" ...>` is present.
4. Add Flatpickr to date inputs if needed (see `mitfliegen.html` for the pattern).

### Modify Page Content

Edit the relevant `.html` file directly. Pages are self-contained — no template engine to re-run.

### Update CSS

Edit `style.css`. Use the existing CSS variables for colours and avoid hardcoding hex values inline.
