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
├── index.html            # Home page (hero video, dynamic news card-grid, reviews)
├── uber-uns.html         # About the club
├── mitfliegen.html       # Scenic flights & gift vouchers (with booking form)
├── ausbildung.html       # Pilot training & licensing (zoomable images, no booking form)
├── flugzeugpark.html     # Aircraft fleet showcase (fully dynamic via Firestore, no static cards)
├── veranstaltungen.html  # Events & photo galleries (slideshows, no booking form)
├── kontakt.html          # Contact page (map, contact form)
├── impressum.html        # Legal notice (Impressum — German legal requirement)
├── datenschutz.html      # Privacy policy & cookie consent
├── intern.html           # Members-only admin panel (3 tabs: News, Gastfluggebühren, Flugzeugpark)
│
├── script.js             # Shared UI logic: header/footer injection, mobile menu,
│                         #   accordion, cookie consent, lightbox, slideshow,
│                         #   reviews sidebar, back-to-top, AJAX forms, favicon
├── news-db.js            # Firebase integration: auth, Firestore CRUD for news feed,
│                         #   prices, and aircraft fleet; GitHub API image uploads
├── style.css             # All styling (CSS variables, responsive)
│
├── fonts/                # Self-hosted web fonts (WOFF2): Montserrat, Open Sans, Tangerine
├── lib/flatpickr/        # Self-hosted Flatpickr date picker (CSS, JS, German locale)
├── images/               # Static image assets (logos, aircraft, team photos, news images)
├── videos/               # Hero section .mp4 videos
│
├── favicon.ico           # Favicon (generated from logo.png, 16/32/48px)
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
| Dynamic content (news, prices, aircraft fleet) | Firebase Firestore + real-time `onSnapshot` listener |
| Form submissions | EmailJS (third-party service, no backend needed) — AJAX via EmailJS SDK |
| Authentication (admin) | Firebase Authentication (email/password) |
| News image hosting | GitHub repository (`images/` folder) via GitHub Contents API |
| Date picker | Flatpickr self-hosted in `lib/flatpickr/` (DSGVO-compliant, no CDN) |
| Fonts | Self-hosted in `fonts/` (WOFF2, DSGVO-compliant, no Google server contact) |
| Maps | Google Maps Embed API |

### Shared Header & Footer

`script.js` injects a common header, footer, Google Reviews sidebar, and login modal into every page at runtime using `innerHTML`. There is **no server-side templating**. Changes to the navigation must be made in the `headerHTML` template literal inside `script.js`.

All `target="_blank"` links must have `rel="noopener noreferrer"` — this applies in `script.js` (header/footer templates) and all HTML files.

The footer contains links to `impressum.html`, `datenschutz.html`, and `intern.html`. The `intern.html` link is visible in the footer on every page (it is not in the main nav, but is not hidden either).

### Firebase Integration (`news-db.js`)

The module is loaded as an **ES module** (`type="module"`) and handles:

1. `initFirebase()` — initialises Firebase app (`v11.6.1`), chooses collection path, calls `startNewsLogic()`, `startPricesLogic()`, and/or `startAircraftLogic()` depending on which containers exist on the page
2. `startNewsLogic()` — sets up `onAuthStateChanged` listener; renders news and admin UI accordingly
3. `startPricesLogic()` — real-time listener for the `prices` collection; renders public price list and admin edit UI
4. `startAircraftLogic()` — real-time listener for the `aircraft` collection; renders fleet cards on `flugzeugpark.html` and CRUD admin UI on `intern.html`
5. `onSnapshot()` — real-time listeners that re-render lists whenever Firestore data changes
6. Admin CRUD — `addDoc`, `updateDoc`, `deleteDoc` are called from the admin panel on `intern.html`
7. Image pipeline — `compressImage()` + `uploadToGitHub()` + `deleteFromGitHub()` manage images (news and aircraft) via GitHub API

**Firestore collections (production)**:
```
news/      — top-level collection, documents sorted descending by timestamp
prices/    — top-level collection, documents sorted ascending by order field
aircraft/  — top-level collection, documents sorted ascending by order field
```

**`news` document schema**:
```js
{
  title:     string,           // News headline
  date:      string,           // Display date, format "DD.MM.YYYY"
  text:      string,           // Body text (newlines preserved via white-space: pre-wrap)
  imageUrl:  string | null,    // First image URL (backward compat) or null
  imageUrls: string[],         // Array of GitHub raw URLs (multiple images per post)
  timestamp: number            // Unix ms — used for sort order (only set on create, not update)
}
```

**`aircraft` document schema**:
```js
{
  name:         string,        // Aircraft name, e.g. "DG-1001e neo"
  registration: string,        // Registration, e.g. "D-KSFP"
  type:         string,        // Type description, e.g. "Hochleistungs-Doppelsitzer"
  category:     string,        // "Segelflugzeuge" | "Motorflugzeuge" | "Oldtimer" | "Winde"
  specs:        string,        // Free-text specs, one entry per line (e.g. "Spannweite: 20 m")
  highlight:    boolean,       // If true, rendered with accent border and ★ badge
  imageUrl:     string | null, // GitHub raw URL (images/aircraft_<timestamp>.webp) or null
  order:        number         // Sort order (set to Date.now() on create; used for drag & drop)
}
```

### Image Upload Pipeline

Images for news posts and aircraft are **not** stored on a third-party service. The admin uploads a file through the admin panel and the following happens client-side:

1. `compressImage()` resizes the image to max 1200 px wide and encodes it as **WebP at 80% quality**.
2. `uploadToGitHub()` uploads the blob to `images/news_<timestamp>.webp` (or `images/aircraft_<timestamp>.webp`) in the repository via the GitHub Contents API (`PUT /repos/profex1337/segelfliegen/contents/...`).
3. The resulting `https://raw.githubusercontent.com/...` URL is stored in Firestore.
4. When an item is deleted, `deleteFromGitHub()` removes the corresponding file from the repository. The regex matches both `news_*.webp` and `aircraft_*.webp` patterns.

**GitHub Personal Access Token (PAT)**: The admin must provide a PAT with `contents: write` permission. It is stored in `localStorage` under the key `gh_pat` and persists across sessions. The admin panel on `intern.html` has a UI to enter, update, or remove the token.

### News Layout

On `index.html`, news posts are rendered as a **card-grid** (`.news-card-grid`): 3 columns on desktop, 2 on tablet, 1 on mobile. The **newest post** is displayed as a **featured card** (`.news-featured`) spanning the full grid width, with text on the left and image(s) on the right. Remaining posts use the standard card layout.

**Multiple images**: News posts support multiple images stored as `imageUrls` array (backward compatible with single `imageUrl`). When a post has multiple images, they are rendered as a **carousel** (`.news-carousel`) with prev/next buttons, dot indicators, and touch-swipe support on mobile. Clicking any image opens the lightbox.

On `intern.html`, all news items are rendered in the same card-grid layout (no featured card) with admin controls (Ändern / Löschen) visible in the top-right of each card. The admin form supports **multiple file uploads** — new images are added to existing ones. Thumbnails of existing images are shown with individual delete buttons.

The rendering mode is detected by the CSS class on the container: `news-card-grid` → card layout; otherwise → list layout (legacy, not currently used).

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

Deployment is automatic via **GitHub Pages**. Pushing to the `main` branch publishes changes live.

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
- **BEM-like class naming** — e.g., `.card-grid`, `.page-header`, `.hero-section`, `.news-card`.
- **Every page** must include `script.js` as a classic script (NOT `type="module"`) at the bottom of `<body>`:
  ```html
  <script src="script.js"></script>
  ```
  `script.js` does not use ES module syntax (`import`/`export`) and must not be loaded as a module.
- **Pages with dynamic Firestore content** (news, prices, aircraft) also include `news-db.js` as `type="module"`. Currently: `index.html`, `mitfliegen.html`, `intern.html`, `flugzeugpark.html`.
- **External links** (`target="_blank"`) must always have `rel="noopener noreferrer"`.
- **Favicon**: `<link rel="icon" href="favicon.ico" type="image/x-icon">` on every page.
- **Canonical URL**: `<link rel="canonical" href="https://www.segelfliegenaltdorf.de/...">` on every public page. Always use `www.` prefix.
- **Inline JSON-LD** schema.org markup is present on content pages for SEO — keep it accurate. All URLs must use `www.` prefix.
- **Open Graph** meta tags are on every page — update them when adding new pages. All URLs must use `www.` prefix.
- **Video poster**: All `<video>` hero elements must have a `poster` attribute pointing to a static image for faster visual load.
- **Language attribute**: `<html lang="de">` on all pages.
- **Embedded iframes** (Google Maps, YouTube) must use the consent overlay pattern: wrap in a `<div class="consent-overlay" data-src="..." data-title="...">`. On cookie accept, `embedConsentContent()` in `script.js` replaces these with real `<iframe>` elements.

### CSS (`style.css`)

- **CSS custom properties** are declared in `:root` — use these variables rather than hardcoded values:
  ```css
  --primary:      #0f3460      /* Dark blue — brand primary */
  --accent:       #e94560      /* Red/pink — CTAs, highlights */
  --accent-hover: #d1344f      /* Darker accent for hover states */
  --text-main:    #333333
  --text-light:   #666666
  --bg-light:     #f4f6f8
  --white:        #ffffff
  --shadow:       0 10px 30px rgba(0,0,0,0.08)
  --radius:       12px
  --header-height: 80px
  ```
- **Mobile-first responsive** — base styles target mobile; media queries add larger-screen layouts.
- **Breakpoints**: 500 px, 600 px, 700 px, 768 px, 992 px.
- All new rules go into `style.css` — do not create additional CSS files.
- **`.badge-highlight`** is defined globally in `style.css` (used by dynamically rendered aircraft cards).
- **`.news-card-grid`** — card layout for news (3 col / 2 col / 1 col).
- **`.news-featured`** — full-width featured card for newest news (text left, image right; column-reverse on mobile).
- **`.news-carousel`** — image carousel with prev/next buttons, dots, and touch-swipe.
- **`.aircraft-card-grid`** — card layout for aircraft fleet (3 col / 2 col / 1 col).

### JavaScript

- **ES6+ syntax** — arrow functions, `const`/`let`, template literals, destructuring.
- **No framework** — vanilla DOM APIs only.
- **camelCase** for variables and functions; **PascalCase** is not used for functions.
- **Comments** in the source are written in German.
- Firebase SDK (`v11.6.1`) is imported directly from the Google CDN (gstatic) using ES module URLs — do **not** switch to npm imports.
- Never store sensitive logic client-side; secrets must remain in Firebase security rules or the EmailJS config.

### `script.js` Feature Inventory

| Function | Purpose |
|---|---|
| `injectLayout()` | Injects `headerHTML`, `footerHTML`, `reviewsHTML`, `loginModalHTML` into the page |
| `initFavicon()` | Dynamically sets `images/logo.png` as the page favicon |
| `initLightbox()` | Creates a lightbox overlay; triggered by clicking any `.zoomable` image |
| `initBackToTop()` | Shows/hides `#btn-back-to-top` on scroll; scrolls smoothly to top on click |
| `initSlideshows()` | Auto-plays `.slideshow-container` elements every 4 seconds; prev/next buttons reset the timer |
| `initCookieConsent()` | Shows DSGVO cookie banner; on accept, calls `embedConsentContent()` |
| `embedConsentContent()` | Replaces `.consent-overlay` divs with real `<iframe>` elements |
| `initReviews()` | Renders a static snapshot of Google reviews in the sidebar; opened via `#review-trigger-btn` |
| `initDatepickers()` | Applies Flatpickr to `#wunschtermin` input (weekends only, German locale) |
| `initForms()` | Intercepts all `form[data-emailjs]` submit events and sends via EmailJS SDK |
| `getAvatarColor()` | Returns a random brand colour for review avatar backgrounds |

### `news-db.js` Function & Constant Inventory

| Symbol | Purpose |
|---|---|
| `FLUGZEUGPARK_IMPORT_DATA` | Array of 12 aircraft objects used for one-time Firestore import (shown as button when `aircraft` collection is empty) |
| `initFirebase()` | Initialises Firebase app (`v11.6.1`), selects Firestore collection, dispatches to `startNewsLogic()` / `startPricesLogic()` / `startAircraftLogic()` based on page |
| `startNewsLogic()` | Sets up `onAuthStateChanged` listener; signs in anonymously if no user; sets up real-time `onSnapshot` listener for news |
| `startPricesLogic()` | Real-time listener for `prices` collection; renders public list and admin CRUD |
| `startAircraftLogic()` | Real-time listener for `aircraft` collection; renders fleet on `flugzeugpark.html` and CRUD admin UI on `intern.html` |
| `toggleAdminUI(isAdmin)` | Shows/hides edit+delete buttons on news items based on auth state |
| `handleInternPageVisibility(isAdmin)` | Shows admin dashboard or login prompt on `intern.html` based on auth state |
| `loadIntoForm(item)` | Populates the news edit form with an existing document's data |
| `resetForm()` | Clears the news form and resets it to "new post" mode |
| `deleteNewsItem(docId, imageUrls)` | Deletes a Firestore document and removes all associated GitHub image files |
| `renderAircraftPublic(container, items)` | Renders aircraft cards grouped by category (`.aircraft-card-grid`, 3-col) into a public container; adds section IDs for anchor links |
| `renderAircraftAdmin(container, items, isAdmin)` | Renders aircraft admin list grouped by category; supports drag & drop reordering within categories; shows import button when collection is empty; auto-migrates legacy category names |
| `handleLogin()` | Authenticates admin with `info@segelfliegen-altdorf.de` and entered password |
| `compressImage(file, maxWidth, quality)` | Resizes image to max 1200 px, encodes as WebP at 80% quality; returns a Blob |
| `uploadToGitHub(blob, filename, token)` | Uploads WebP blob to `images/<filename>` via GitHub Contents API; returns raw URL |
| `deleteFromGitHub(imageUrl, token)` | Deletes `images/news_*.webp` or `images/aircraft_*.webp` from the repository |

**Anonymous auth**: Non-admin visitors are signed in anonymously via `signInAnonymously()` so the `onSnapshot` listener can read Firestore data without a password.

### Adding a New Page

1. Copy an existing page as a template (e.g., `kontakt.html`).
2. Update `<title>`, Open Graph tags, and JSON-LD.
3. Add a `<nav>` link in the `headerHTML` template in `script.js`.
4. Add the URL to `sitemap.xml`.
5. If the page needs forms, add `data-emailjs="formtype"` attribute. See existing forms for the pattern.

---

## External Services & Configuration

| Service | Config location | Notes |
|---|---|---|
| **Firebase** | `news-db.js` lines 5–13 | Project ID: `segelfliegen`. SDK version: `11.6.1`. API key is public (restricted via Firebase console). |
| **GitHub API** | `news-db.js` `uploadToGitHub()` / `deleteFromGitHub()` | Used for news & aircraft image storage. Requires admin to supply a PAT with `contents: write`; stored in `localStorage`. |
| **EmailJS** | `data-emailjs` attributes on HTML forms | Service ID `service_cd14twj`, template `template_eakr6dl`; forms on `mitfliegen.html` and `kontakt.html`. Gutschein auto-reply uses `template_ygdqime`. |
| **Google Maps** | Embed `<iframe>` in `kontakt.html` | Uses consent overlay pattern; iframe only loads after cookie accept. |
| **Flatpickr** | Self-hosted in `lib/flatpickr/` | Loaded locally in `mitfliegen.html` and `kontakt.html`. No CDN requests. |
| **Fonts** | Self-hosted in `fonts/` | Montserrat, Open Sans, Tangerine as WOFF2. `@font-face` in `style.css`. No Google server contact. |
| **GitHub Pages** | `CNAME` file | Do not delete or rename this file — it maps the domain. |

---

## Admin Panel (`intern.html`)

- Protected by Firebase email/password authentication.
- Admin email: `info@segelfliegen-altdorf.de` (password managed in Firebase console).
- `intern.html` is linked in the footer of every page (not in the main nav). Clicking it opens a login modal if the user is not authenticated.
- When logged in, `body.admin-mode` CSS class is added to the page — used for admin-only styling.

The panel is organised in **three tabs**:

### Tab 1 — News
- Create, edit, and delete news posts (Firestore `news` collection).
- Optional image upload per post: compressed to WebP, uploaded to `images/news_<timestamp>.webp` via GitHub API.
- News list displayed as card-grid (same layout as public `index.html`), with Ändern/Löschen buttons visible per card.
- Quick-links to vereinsflieger.de (Flugbuch, Dokumente, Dienste) are shown below the news list.

### Tab 2 — Gastfluggebühren
- Edit the scenic-flight price list shown on `mitfliegen.html` (Firestore `prices` collection).
- Each price row has a label, description, and price field — inline editing with a "Speichern" button per row.
- "Standardpreise importieren" seeds the collection with default values if it is empty.

### Tab 3 — Flugzeugpark
- Full CRUD for the aircraft fleet (Firestore `aircraft` collection).
- Fields: Name, Kennzeichen, Typ, Kategorie (dropdown), Technische Daten (multiline), Highlight-Checkbox, Bild.
- Image uploads compressed to WebP and stored as `images/aircraft_<timestamp>.webp` via GitHub API.
- Admin list is **grouped by category** with drag & drop reordering within each category (updates `order` field in Firestore).
- When the collection is empty, an **import button** appears that seeds all 12 aircraft from `FLUGZEUGPARK_IMPORT_DATA` (incl. GitHub raw image URLs) into Firestore.
- **Auto-migration**: on admin load, any documents with the legacy category `'Motorsegler'` are automatically updated to `'Motorflugzeuge'`.
- Changes are immediately visible on `flugzeugpark.html` (real-time `onSnapshot` listener).
- When an aircraft with an image is deleted, the image is also removed from the repository automatically.

**GitHub PAT**: A PAT with `contents: write` must be entered once in the News tab; it is shared by both the news and aircraft image upload pipelines (stored in `localStorage` under `gh_pat`).

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
- News images are automatically named `news_<timestamp>.webp` by the upload pipeline.
- Aircraft images (admin-uploaded) are automatically named `aircraft_<timestamp>.webp` by the upload pipeline.
- Videos live in `videos/` — used as `<source>` elements in hero `<video>` tags.
- Prefer `.webp` for new images (smaller file size); `.jpg` is also acceptable.
- Keep video files under ~10 MB where possible; the repository is already large (~357 MB).
- Always provide an `alt` attribute on `<img>` tags.

---

## Common Tasks

### Update the News Feed

News is managed through the admin panel at `/intern.html` → Tab **News**. Admins log in with their Firebase credentials and create/edit/delete posts through the UI. A GitHub PAT must be stored to enable image uploads. No code changes are needed.

### Manage the Aircraft Fleet (Flugzeugpark)

Aircraft are managed through the admin panel at `/intern.html` → Tab **Flugzeugpark**. All entries are stored in Firestore (`aircraft` collection) and rendered fully dynamically on `flugzeugpark.html` — there are no static fallback cards. The display order can be adjusted via drag & drop in the admin list. No code changes are needed to add, update, or reorder aircraft.

### Manage Gastfluggebühren (Prices)

Prices are managed through the admin panel at `/intern.html` → Tab **Gastfluggebühren**. Entries are stored in Firestore (`prices` collection) and rendered on `mitfliegen.html`. No code changes are needed.

### Change Navigation Links

Edit the `headerHTML` template literal in `script.js`. The change applies to all pages automatically since the header is injected at runtime.

### Add/Update a Booking Form

1. Add `data-emailjs="formtype"` to the `<form>` element (e.g., `data-emailjs="kontakt"`, `data-emailjs="gutschein"`, `data-emailjs="gastflug"`).
2. Add the form type handling in `initForms()` in `script.js` to map form fields to EmailJS template parameters.
3. Add Flatpickr to date inputs if needed (see `mitfliegen.html` for the pattern).
4. Form submission is handled automatically via AJAX by `initForms()` in `script.js` — no extra JS needed.

### Embed Google Maps or YouTube

Use the consent overlay pattern so the iframe only loads after DSGVO cookie accept:

```html
<div class="consent-overlay" data-src="https://..." data-title="Map title">
    <div class="consent-message">
        <p>Zum Laden dieser Karte...</p>
        <button class="btn consent-accept-btn">Akzeptieren</button>
    </div>
</div>
```

`embedConsentContent()` in `script.js` replaces this with a real `<iframe>` on consent.

### Modify Page Content

Edit the relevant `.html` file directly. Pages are self-contained — no template engine to re-run.

### Update CSS

Edit `style.css`. Use the existing CSS variables for colours and avoid hardcoding hex values inline.
