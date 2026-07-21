# CLAUDE.md — Segelflugplatz Altdorf Website

This file describes the codebase for AI assistants (Claude and others) working on this project.

---

## Project Overview

A static website for **Segelflugplatz Altdorf-Hagenhausen / Post-SV Nürnberg e.V.**, a German gliding club.

- **Live URL**: https://www.segelfliegenaltdorf.de
- **Hosting**: GitHub Pages (configured via `CNAME`)
- **Language**: German (all user-facing content is in German)
- **Address form**: Informal "Du" on all public pages. Exception: `datenschutz.html`, `impressum.html`, and `widerruf.html` use formal "Sie" (legal requirement — these pages consist largely of statutory text).
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
├── veranstaltungen.html  # Events & photo galleries (dynamic upcoming events via Firestore, slideshows)
├── kontakt.html          # Contact page (map, contact form)
├── impressum.html        # Legal notice (Impressum — German legal requirement)
├── datenschutz.html      # Privacy policy & cookie consent
├── widerruf.html         # Withdrawal button + Widerrufsbelehrung + Muster-Widerrufsformular (§ 356a BGB)
├── intern.html           # Members-only admin panel (5 tabs: News, Termine, Gastfluggebühren, Flugzeugpark, Gutscheine)
│
├── gutschein/            # Standalone voucher status page (open/redeemed)
│   └── index.html        #   Firebase Compat-SDK, login: gutschein@segelfliegen-altdorf.de
├── bestellungen/         # Standalone order management page (paid/reminder)
│   └── index.html        #   Firebase Compat-SDK, login: bestellung@segelfliegen-altdorf.de
│
├── script.js             # Shared UI logic: header/footer injection, mobile menu,
│                         #   accordion, cookie consent, lightbox, slideshow,
│                         #   reviews sidebar, back-to-top, AJAX forms, favicon
├── news-db.js            # Firebase integration: auth, Firestore CRUD for news feed,
│                         #   prices, and aircraft fleet; GitHub API image uploads
├── style.css             # All styling (CSS variables, responsive)
│
├── fonts/                # Self-hosted web fonts (WOFF2): Montserrat, Tangerine
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
| Form submissions | Firebase Cloud Functions (`sendPublicEmail` via `fetch()`, `sendAdminEmail` via `httpsCallable()`) + Strato-SMTP |
| Authentication (role-based) | Firebase Authentication (email/password) — 3 accounts with different Firestore access |
| News image hosting | GitHub repository (`images/` folder) via GitHub Contents API |
| Fonts | Self-hosted in `fonts/` (WOFF2, DSGVO-compliant, no Google server contact) |
| Maps | Google Maps Embed API |

### Shared Header & Footer

`script.js` injects a common header, footer, Google Reviews sidebar, and login modal into every page at runtime using `innerHTML`. There is **no server-side templating**. Changes to the navigation must be made in the `headerHTML` template literal inside `script.js`.

All `target="_blank"` links must have `rel="noopener noreferrer"` — this applies in `script.js` (header/footer templates) and all HTML files.

The footer contains links to `impressum.html`, `datenschutz.html`, and `intern.html`. The `intern.html` link is visible in the footer on every page (it is not in the main nav, but is not hidden either).

### Firebase Integration (`news-db.js`)

The module is loaded as an **ES module** (`type="module"`) and handles:

1. `initFirebase()` — initialises Firebase app (`v11.6.1`), chooses collection path, calls `startNewsLogic()`, `startPricesLogic()`, `startAircraftLogic()`, and/or `startEventsLogic()` depending on which containers exist on the page
2. `startNewsLogic()` — sets up `onAuthStateChanged` listener; renders news and admin UI accordingly
3. `startPricesLogic()` — real-time listener for the `prices` collection; renders public price list and admin edit UI
4. `startAircraftLogic()` — real-time listener for the `aircraft` collection; renders fleet cards on `flugzeugpark.html` and CRUD admin UI on `intern.html`
5. `onSnapshot()` — real-time listeners that re-render lists whenever Firestore data changes
6. Admin CRUD — `addDoc`, `updateDoc`, `deleteDoc` are called from the admin panel on `intern.html`
7. Image pipeline — `compressImage()` + `uploadToGitHub()` + `deleteFromGitHub()` manage images (news and aircraft) via GitHub API

**Firestore collections (production)**:
```
news/           — top-level, sorted descending by timestamp (public read, admin write)
prices/         — top-level, sorted ascending by order field (public read, admin write)
aircraft/       — top-level, sorted ascending by order field (public read, admin write)
events/         — top-level, sorted ascending by order field (public read, admin write)
vouchers/       — top-level, sorted descending by timestamp (admin + gutschein@ user)
voucherOrders/  — top-level, sorted descending by timestamp (create: any auth, read/update: admin + bestellung@ user)
widerrufe/      — top-level, withdrawal log (§ 356a BGB); written server-side by Cloud Function (Admin-SDK), admin read
reviewsCache/   — top-level, single doc `latest`; Google-Reviews cache written/read server-side by `getGoogleReviews` (Admin-SDK)
rateLimits/     — top-level, one doc per IP; written server-side by `sendPublicEmail` rate limiter (Admin-SDK), never client-accessible
```

**Firestore security rules** are defined in `firestore-rules.txt` (must be manually pasted into Firebase Console → Firestore → Rules → Publish). Rules use helper functions `isAdmin()`, `isGutscheinUser()`, `isBestellungUser()` based on `request.auth.token.email`.

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

**`events` document schema**:
```js
{
  title:       string,        // Event title, e.g. "Hallenfest 2026"
  dateLabel:   string,        // Free-text date label, e.g. "September 2026" or "01.–04.05.2026"
  description: string,        // Short description text
  active:      boolean,       // If true, shown on public veranstaltungen.html
  validUntil:  string,        // Optional expiry date (YYYY-MM-DD); event auto-hidden on public page after this date
  order:       number         // Sort order (Date.now() on create; used for drag & drop)
}
```

**`vouchers` document schema**:
```js
{
  recipient:   string,           // Voucher recipient name
  flightType:  string,           // Flight type (e.g. "Segelflug (Windenstart)")
  greeting:    string,           // Greeting text for the voucher
  number:      string,           // Voucher number (e.g. "GS-2026-0314-1530")
  value:       string,           // Value in EUR (e.g. "80,00")
  validUntil:  string,           // Validity date (e.g. "14.03.2027")
  zusatzzeit:  string,           // Extra flight time in minutes (e.g. "10")
  showValue:   boolean,          // Whether to show value on PDF (default: true)
  redeemed:    boolean,          // Whether the voucher has been redeemed
  timestamp:   number            // Unix ms — creation timestamp
}
```

**`voucherOrders` document schema**:
```js
{
  name:          string,         // Customer name
  email:         string,         // Customer email
  telefon:       string,         // Customer phone
  flugart:       string,         // Flight type
  zusatzzeit:    string,         // Extra flight time in minutes
  wert:          string,         // Value in EUR (German decimal format, e.g. "80,00")
  empfaenger:    string,         // Gift recipient name
  grusstext:     string,         // Greeting text
  zustellung:    string,         // Delivery method ("E-Mail (Zahlung per Überweisung)" or "Abholung...")
  wertAnzeigen:  boolean,        // Whether to show value on voucher PDF (default: true)
  status:        string,         // "neu" | "abgeschlossen"
  paid:          boolean,        // Whether order has been paid
  timestamp:     number,         // Unix ms — order creation timestamp
  completedAt:   number | null   // Unix ms — when order was completed
}
```

### Image Upload Pipeline

Images for news posts and aircraft are **not** stored on a third-party service. The admin uploads a file through the admin panel and the following happens:

1. `compressImage()` (client-side) resizes the image to max 1200 px wide and encodes it as **WebP at 80% quality**.
2. `uploadToGitHub()` (client-side) sends the base64-encoded blob to the `uploadImage` Cloud Function, which uploads it to `images/news_<timestamp>.webp` (or `images/aircraft_<timestamp>.webp`) via the GitHub Contents API.
3. The resulting `https://raw.githubusercontent.com/...` URL is stored in Firestore.
4. When an item is deleted, `deleteFromGitHub()` (client-side) calls the `deleteImage` Cloud Function, which removes the corresponding file from the repository.

**GitHub Personal Access Token (PAT)**: Stored as Firebase Secret `GH_PAT`. The Cloud Functions `uploadImage` and `deleteImage` use this server-side — no client-side token needed. Admins no longer need to enter a PAT in the admin panel.

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
- **Pages with dynamic Firestore content** (news, prices, aircraft, events) also include `news-db.js` as `type="module"`. Currently: `index.html`, `mitfliegen.html`, `intern.html`, `flugzeugpark.html`, `veranstaltungen.html`.
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
  --accent:       #0ea5e9      /* Sky blue — CTAs, highlights */
  --accent-hover: #0284c7      /* Darker accent for hover states */
  --warn-red:     #d1344f      /* Warning/highlight red, independent of brand accent */
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
- **Nav hover animation** (desktop only) — `.nav-menu a::after` renders a glider (SVG mask) that flies in from left on hover; `.nav-menu a::before` is the trailing line. On mouse-leave, both **fade out in place** (opacity transition) rather than animating back. This is achieved by using `transition: left 0s 0.3s` (delayed reset after fadeout) in the default state, overridden by the real `left` transition in the `:hover` state.

### JavaScript

- **ES6+ syntax** — arrow functions, `const`/`let`, template literals, destructuring.
- **No framework** — vanilla DOM APIs only.
- **camelCase** for variables and functions; **PascalCase** is not used for functions.
- **Flight types** in forms and emails use: "Segelflug (Windenstart)", "Segelflug (F-Schlepp)", "Segelkunstflug", "Motorsegler" (NOT "Motorflug"). The voucher image file is still named `Gutschein_Motorflug.jpg`; the aerobatics voucher image is `Gutschein_Kunstflug.jpg` and `gutscheinImageMap` maps both "Kunstflug" and "Segelkunstflug" to it.
- **Comments** in the source are written in German.
- Firebase SDK (`v11.6.1`) is imported directly from the Google CDN (gstatic) using ES module URLs — do **not** switch to npm imports.
- Never store sensitive logic client-side; secrets must remain in Firebase security rules or Cloud Function secrets.

### `script.js` Feature Inventory

| Function | Purpose |
|---|---|
| `CLOUD_FUNCTION_URL` | URL constant for `sendPublicEmail` Cloud Function (used by `callCloudFunction()`) |
| `callCloudFunction(data)` | Sends form data to `sendPublicEmail` Cloud Function via `fetch()` POST |
| `injectLayout()` | Injects `headerHTML`, `footerHTML`, `reviewsHTML`, `loginModalHTML` into the page |
| `initFavicon()` | Dynamically sets `images/logo.png` as the page favicon |
| `initLightbox()` | Creates a lightbox overlay; triggered by clicking any `.zoomable` image |
| `initBackToTop()` | Shows/hides `#btn-back-to-top` on scroll; scrolls smoothly to top on click |
| `initSlideshows()` | Auto-plays `.slideshow-container` elements every 4 seconds; prev/next buttons reset the timer |
| `initCookieConsent()` | Shows DSGVO cookie banner; on accept, calls `embedConsentContent()` |
| `embedConsentContent()` | Replaces `.consent-overlay` divs with real `<iframe>` elements |
| `initReviews()` | Renders a static snapshot of Google reviews in the sidebar; opened via `#review-trigger-btn` (add this trigger markup on any page that should offer it — see `index.html`) |
| `showFormError(form, message)` | Renders a styled inline error message inside a form (replaces blocking `alert()` popups) |
| `getFlugdauer()` | Calculates flight duration string from flight type + extra time (e.g., "bis zu 20 Min. + 10 Min. zusätzlich") |
| `initForms()` | Intercepts all `form[data-emailjs]` submit events and sends via Cloud Function (`sendPublicEmail`) |
| `initSwipeNavigation()` | Mobile-only horizontal swipe between the 7 main pages (index/uber-uns/mitfliegen/flugzeugpark/ausbildung/veranstaltungen/kontakt). Prefetches neighbours via `<link rel="prefetch">`, fades `#main-content` on transition, respects `prefers-reduced-motion`, and ignores swipes inside slideshows, news-carousels, the lightbox, the reviews sidebar, form inputs, and when the mobile menu is open. |
| `getAvatarColor()` | Returns a random brand colour for review avatar backgrounds |
| `measureGliderUnderlines()` / `window.remeasureGliderUnderlines` | Measures the last line of every `.accent-kicker` heading and sets `--ulw` so the glider-underline width is exact; the `window`-exposed variant lets dynamically-rendered headings (e.g. Flugzeugpark categories) re-measure after render |
| `initSkipLink()` | Makes `#main-content` programmatically focusable (`tabindex="-1"`) and moves keyboard focus there when the skip-link is used |
| `initSecurityMeta()` | Injects a Content-Security-Policy and Referrer-Policy `<meta>` tag as early as possible (no server-header option on GitHub Pages) |

### `news-db.js` Function & Constant Inventory

| Symbol | Purpose |
|---|---|
| `FLUGZEUGPARK_IMPORT_DATA` | Array of 12 aircraft objects used for one-time Firestore import (shown as button when `aircraft` collection is empty) |
| `initFirebase()` | Initialises Firebase app (`v11.6.1`), selects Firestore collection, dispatches to `startNewsLogic()` / `startPricesLogic()` / `startAircraftLogic()` based on page |
| `startNewsLogic()` | Sets up `onAuthStateChanged` listener; signs in anonymously if no user; sets up real-time `onSnapshot` listener for news |
| `startPricesLogic()` | Real-time listener for `prices` collection; renders public list and admin CRUD |
| `startAircraftLogic()` | Real-time listener for `aircraft` collection; renders fleet on `flugzeugpark.html` and CRUD admin UI on `intern.html` |
| `startEventsLogic()` | Real-time listener for `events` collection; renders upcoming events on `veranstaltungen.html` and CRUD admin UI on `intern.html` |
| `toggleAdminUI(isAdmin)` | Shows/hides edit+delete buttons on news items based on auth state |
| `handleInternPageVisibility(isAdmin)` | Shows admin dashboard or login prompt on `intern.html` based on auth state |
| `loadIntoForm(item)` | Populates the news edit form with an existing document's data |
| `resetForm()` | Clears the news form and resets it to "new post" mode |
| `deleteNewsItem(docId, imageUrls)` | Deletes a Firestore document and removes all associated GitHub image files |
| `renderAircraftPublic(container, items)` | Renders aircraft cards grouped by category (`.aircraft-card-grid`, 3-col) into a public container; adds section IDs for anchor links |
| `renderAircraftAdmin(container, items, isAdmin)` | Renders aircraft admin list grouped by category; supports drag & drop reordering within categories; shows import button when collection is empty; auto-migrates legacy category names |
| `handleLogin()` | Authenticates admin with `info@segelfliegen-altdorf.de` and entered password |
| `compressImage(file, maxWidth, quality)` | Resizes image to max 1200 px, encodes as WebP at 80% quality; returns a Blob |
| `uploadToGitHub(blob, filename)` | Calls `uploadImage` Cloud Function; returns raw GitHub URL |
| `deleteFromGitHub(imageUrl)` | Calls `deleteImage` Cloud Function to remove the file from GitHub |
| `sendPaymentReminder(order)` | Sends payment/pickup reminder email to customer via Cloud Function `sendAdminEmail` (with confirm dialog) |
| `loadVoucherOrder(order)` | Populates the voucher PDF form with order data (only available after order is marked as paid) |
| `fillUnpersonalized()` | Fills voucher form with generic recipient ("Jemand Besonderes") and standard greeting text |

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
| **Firebase** | `news-db.js` lines 5–13, `functions/index.js` | Project ID: `segelfliegen`. SDK version: `11.6.1`. Cloud Functions (europe-west1): `sendPublicEmail` (onRequest, public forms; fail-open IP-Rate-Limit via `rateLimits` collection), `sendAdminEmail` (onCall, admin), `sendVoucherEmail` (onCall, PDF), `uploadImage` (onCall, GitHub upload), `deleteImage` (onCall, GitHub delete), `getGoogleReviews` (onRequest, public; Places-API-Cache in `reviewsCache/latest`), `generateGreetingText` (onCall, any authed user incl. anonymous; Gemini API). Secrets: `SMTP_USER`, `SMTP_PASS`, `GH_PAT`, `GOOGLE_PLACES_KEY`, `GEMINI_API_KEY`. |
| **GitHub API** | `functions/index.js` `uploadImage()` / `deleteImage()` | Used for news & aircraft image storage. PAT stored as Firebase Secret `GH_PAT` — no client-side token needed. Client calls Cloud Functions via `httpsCallable()`. |
| **Widerruf (§ 356a BGB)** | `widerruf.html`, `functions/index.js` (`formType: "widerruf"`), `functions/widerruf-mail.js` | Two-stage withdrawal button → customer Eingangsbestätigung (durable medium, server-side Europe/Berlin timestamp, no acknowledgement) + club notification (info@ + CC dan@ + Kassier) + Firestore log `widerrufe`. Widerrufsbelehrung also appended to gutschein confirmation mail (§ 312f BGB). Highlighted footer link `.footer-widerruf` on every page. |
| **Cloud Functions** | `functions/index.js`, `script.js`, `news-db.js`, `bestellungen/index.html` | `sendPublicEmail` (onRequest, public forms via `fetch()`), `sendAdminEmail` (onCall, admin actions via `httpsCallable()`), `sendVoucherEmail` (onCall, PDF email), `uploadImage` (onCall, image upload to GitHub), `deleteImage` (onCall, image delete from GitHub). SMTP functions use Strato-SMTP via Nodemailer; image functions use GitHub Contents API. All customer emails use "Du" form. **CC-Logik**: dan@ always; kassier@ on gutschein; joergsperber@ only on Abholung orders; Jeremy on Ausbildung. |
| **Google Maps** | Embed `<iframe>` in `kontakt.html` | Uses consent overlay pattern; iframe only loads after cookie accept. |
| **Fly Dash (Livebetrieb)** | Embed `<iframe>` in `uber-uns.html` (`#Livebetrieb`) | Live glider-tracking widget from `https://fly.kyth.systems/v/altdorf/embed` (Open Glider Network data, OSM/CARTO tiles). Consent overlay pattern; `fly.kyth.systems` allow-listed in CSP `frame-src`. Backend is a separate system — if the iframe is blocked, the site domain must be allow-listed there (`EMBED_ALLOWED_ORIGINS`), not in this repo. |
| **Fonts** | Self-hosted in `fonts/` | Montserrat, Tangerine as WOFF2. `@font-face` in `style.css`. No Google server contact. |
| **GitHub Pages** | `CNAME` file | Do not delete or rename this file — it maps the domain. |

---

## Admin Panel (`intern.html`)

- Protected by Firebase email/password authentication.
- Admin email: `info@segelfliegen-altdorf.de` (password managed in Firebase console).
- `intern.html` is linked in the footer of every page (not in the main nav). Clicking it opens a login modal if the user is not authenticated.
- When logged in, `body.admin-mode` CSS class is added to the page — used for admin-only styling.

The panel is organised in **five tabs**:

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

### Tab 5 — Termine
- Full CRUD for upcoming events (Firestore `events` collection).
- Fields: Titel, Datum-Label (free text), Beschreibung, Aktiv-Checkbox.
- Admin list with drag & drop reordering (updates `order` field in Firestore).
- Active events are displayed on `veranstaltungen.html` as card-grid (real-time `onSnapshot` listener).
- When no active events exist, the "Nächste Termine" section is hidden on the public page.

### Voucher Orders & PDF Generation (Tab 4 — Gutscheine)

- The voucher form shows **Besteller** (read-only info) and **E-Mail** (editable, used for "PDF per E-Mail senden") as visible fields. Both are auto-filled when loading an order via "Übernehmen", but the email can also be entered manually for standalone vouchers.
- Incoming voucher orders from `mitfliegen.html` are stored in Firestore (`voucherOrders` collection) and displayed as a list below the voucher form.
- Order workflow: **Neu** → mark as **Bezahlt** → **Übernehmen** (loads into PDF form) → **PDF generieren** → manually send PDF to customer → **Abschließen**.
- The "Übernehmen" button and click-to-load only appear **after** the order is marked as paid.
- **Payment Reminder**: Unpaid orders show a "Reminder" button that sends a reminder email to the customer via Cloud Function `sendAdminEmail`. The reminder dynamically adapts to the payment method (bank transfer vs. pickup).
- **PDF generation** via jsPDF (self-hosted in `lib/jspdf/`). PDF includes: flight type, value, flight duration (calculated from base + extra time), recipient name, greeting text, voucher number, validity date, club address, and flight time info.
- **"Wert im Gutschein anzeigen" checkbox**: Checked by default on `mitfliegen.html`. When unchecked, PDF shows only flight duration instead of value. For "Kunstflug", flight duration is never shown (pauschal). Stored as `wertAnzeigen` in `voucherOrders` and `showValue` in `vouchers`.
- **PDF reprint**: Open and redeemed vouchers show a "PDF" button that directly regenerates the PDF without saving a duplicate to Firestore (checks voucher number against `cachedVouchers`). Voucher documents store `zusatzzeit` and `showValue` for accurate reprints.
- **Gutschein-Versand** — two options: "PDF herunterladen" (manual send) and "PDF per E-Mail senden" (automatic via Firebase Cloud Function over Strato-SMTP, sends HTML email with PDF attachment). Cloud Function: `sendVoucherEmail` (europe-west1), callable, admin-only, uses Secrets `SMTP_USER` / `SMTP_PASS`.
- **E-Mail-Vorlage**: HTML-formatted email template with club design (blue header, logo, details table, footer). Backup buttons: "Formatiert kopieren" (Clipboard API `text/html`), "E-Mail kopieren" (customer email), "Betreff kopieren" (subject line).
- "Standardtext einsetzen" link (next to "Persönlicher Grußtext" label) fills the form with generic text ("Jemand Besonderes" + standard greeting).
- Voucher images per flight type are mapped in `gutscheinImageMap` (e.g., `'Motorsegler': 'images/Gutschein_Motorflug.jpg'`).

**GitHub PAT**: Stored as Firebase Secret `GH_PAT` — no manual token entry needed. The `uploadImage` and `deleteImage` Cloud Functions handle all GitHub API communication server-side.

### Standalone Pages

Two standalone pages provide limited access to specific Firestore collections. They use **Firebase Compat-SDK** (not ES modules) and are fully self-contained (no dependency on `script.js` or `news-db.js`).

#### `gutschein/index.html` — Voucher Status

- Shows open and redeemed vouchers from the `vouchers` collection.
- Login: `gutschein@segelfliegen-altdorf.de` (or admin).
- Features: mark as redeemed ("Einlösen"), reopen, search, stats.
- **Expired vouchers**: Open vouchers past their `validUntil` date are highlighted with a red background/border and a red "abgelaufen" label. Clicking "Einlösen" on an expired voucher shows a confirmation dialog.
- Hosted on GitHub Pages (same as main site).

#### `bestellungen/index.html` — Order Management

- Shows open voucher orders from the `voucherOrders` collection (excludes completed orders).
- Login: `bestellung@segelfliegen-altdorf.de` (or admin).
- Features:
  - **"Bezahlt"** button: marks order as paid + sends notification email to `info@segelfliegen-altdorf.de` via Cloud Function `sendAdminEmail` (with all order details and status "BEZAHLT"). Requires user confirmation before executing.
  - **"Reminder"** button: sends payment reminder to customer via Cloud Function `sendAdminEmail` (adapts to bank transfer vs. pickup).
- Unpaid orders shown prominently; paid orders in a collapsible section.
- Uses Firebase Functions Compat SDK (`httpsCallable`) for `sendAdminEmail` — no local copies of email template helpers needed (server-side).

Both pages include "Zurück" (`history.back()`) and "Abmelden" buttons in the header.

### Firebase Authentication (Role-Based Access)

Three Firebase Auth accounts with different Firestore permissions (defined in `firestore-rules.txt`):

| Account | Role | Collections |
|---|---|---|
| `info@segelfliegen-altdorf.de` | Admin | Full access to all collections |
| `gutschein@segelfliegen-altdorf.de` | Voucher manager | `vouchers` only (read + write) |
| `bestellung@segelfliegen-altdorf.de` | Order manager | `voucherOrders` only (read + update + delete) |

Rules use helper functions (`isAdmin()`, `isGutscheinUser()`, `isBestellungUser()`) based on `request.auth.token.email`. The `firestore-rules.txt` file must be manually pasted into the Firebase Console (Firestore → Rules → Publish) whenever it changes.

**Note**: Firebase Auth sessions are shared across all pages on the same domain. A user logged in on `intern.html` will also be authenticated on standalone pages.

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

News is managed through the admin panel at `/intern.html` → Tab **News**. Admins log in with their Firebase credentials and create/edit/delete posts through the UI. Image uploads are handled automatically via Cloud Functions (no token setup needed). No code changes are needed.

### Manage the Aircraft Fleet (Flugzeugpark)

Aircraft are managed through the admin panel at `/intern.html` → Tab **Flugzeugpark**. All entries are stored in Firestore (`aircraft` collection) and rendered fully dynamically on `flugzeugpark.html` — there are no static fallback cards. The display order can be adjusted via drag & drop in the admin list. No code changes are needed to add, update, or reorder aircraft.

### Manage Gastfluggebühren (Prices)

Prices are managed through the admin panel at `/intern.html` → Tab **Gastfluggebühren**. Entries are stored in Firestore (`prices` collection) and rendered on `mitfliegen.html`. No code changes are needed.

### Change Navigation Links

Edit the `headerHTML` template literal in `script.js`. The change applies to all pages automatically since the header is injected at runtime.

### Add/Update a Booking Form

1. Add `data-emailjs="formtype"` to the `<form>` element (e.g., `data-emailjs="kontakt"`, `data-emailjs="gutschein"`, `data-emailjs="gastflug"`).
2. Add the form type handling in `initForms()` in `script.js` to map form fields to Cloud Function parameters, and add the corresponding formType handler in `sendPublicEmail` in `functions/index.js`.
3. Form submission is handled automatically via AJAX by `initForms()` in `script.js` — no extra JS needed.

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
