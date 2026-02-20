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
├── ausbildung.html       # Pilot training & licensing (zoomable images, no booking form)
├── flugzeugpark.html     # Aircraft fleet showcase
├── veranstaltungen.html  # Events & photo galleries (slideshows, video embeds, no booking form)
├── kontakt.html          # Contact page (map, contact form)
├── impressum.html        # Legal notice (Impressum — German legal requirement)
├── datenschutz.html      # Privacy policy & cookie consent
├── intern.html           # Members-only admin panel (news CRUD)
│
├── script.js             # Shared UI logic: header/footer injection, mobile menu,
│                         #   accordion, cookie consent, lightbox, slideshow,
│                         #   reviews sidebar, back-to-top, AJAX forms, favicon
├── news-db.js            # Firebase integration: auth, Firestore CRUD for news feed,
│                         #   GitHub API image uploads
├── style.css             # All styling (~1 566 lines, CSS variables, responsive)
│
├── images/               # Static image assets (logos, aircraft, team photos, news images)
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
| Form submissions | Formspree (third-party service, no backend needed) — AJAX via `fetch` |
| Authentication (admin) | Firebase Authentication (email/password) |
| News image hosting | GitHub repository (`images/` folder) via GitHub Contents API |
| Date picker | Flatpickr loaded from jsDelivr CDN |
| Fonts | Google Fonts CDN |
| Maps | Google Maps Embed API |

### Shared Header & Footer

`script.js` injects a common header, footer, Google Reviews sidebar, and login modal into every page at runtime using `innerHTML`. There is **no server-side templating**. Changes to the navigation must be made in the `headerHTML` template literal inside `script.js`.

The footer contains links to `impressum.html`, `datenschutz.html`, and `intern.html`. The `intern.html` link is visible in the footer on every page (it is not in the main nav, but is not hidden either).

### Firebase Integration (`news-db.js`)

The module is loaded as an **ES module** (`type="module"`) and handles:

1. `initFirebase()` — initialises Firebase app (`v11.6.1`), chooses collection path, calls `startNewsLogic()`
2. `startNewsLogic()` — sets up `onAuthStateChanged` listener; renders news and admin UI accordingly
3. `onSnapshot()` — real-time listener that re-renders the news list whenever Firestore data changes
4. Admin CRUD — `addDoc`, `updateDoc`, `deleteDoc` are called from the admin panel on `intern.html`
5. Image pipeline — `compressImage()` + `uploadToGitHub()` + `deleteFromGitHub()` manage news images via GitHub API

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
  imageUrl:  string | null,    // GitHub raw URL or null
  timestamp: number            // Unix ms — used for sort order (only set on create, not update)
}
```

### Image Upload Pipeline

News images are **not** stored on a third-party service. The admin uploads a file through the admin panel and the following happens client-side:

1. `compressImage()` resizes the image to max 1200 px wide and encodes it as **WebP at 80% quality**.
2. `uploadToGitHub()` uploads the blob to `images/news_<timestamp>.webp` in the repository via the GitHub Contents API (`PUT /repos/profex1337/segelfliegen/contents/...`).
3. The resulting `https://raw.githubusercontent.com/...` URL is stored in Firestore.
4. When a news item is deleted, `deleteFromGitHub()` removes the corresponding `images/news_*.webp` file from the repository.

**GitHub Personal Access Token (PAT)**: The admin must provide a PAT with `contents: write` permission. It is stored in `localStorage` under the key `gh_pat` and persists across sessions. The admin panel on `intern.html` has a UI to enter, update, or remove the token.

**News image hover**: On the news list, hovering a news item fades in its associated image in a sticky `.news-image-container` element (positioned `sticky; top: 120px` to account for the fixed header). The effect uses a 300 ms CSS opacity transition.

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
- **BEM-like class naming** — e.g., `.card-grid`, `.page-header`, `.hero-section`, `.news-item`.
- **Every page** must include `script.js` as `type="module"` at the bottom of `<body>`:
  ```html
  <script type="module" src="script.js"></script>
  ```
- **Pages with news** also include `news-db.js` as `type="module"`.
- **Inline JSON-LD** schema.org markup is present on content pages for SEO — keep it accurate.
- **Open Graph** meta tags are on every page — update them when adding new pages.
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

### JavaScript

- **ES6+ syntax** — arrow functions, `const`/`let`, template literals, destructuring.
- **No framework** — vanilla DOM APIs only.
- **camelCase** for variables and functions; **PascalCase** is not used for functions.
- **Comments** in the source are written in German.
- Firebase SDK (`v11.6.1`) is imported directly from the Google CDN (gstatic) using ES module URLs — do **not** switch to npm imports.
- Never store sensitive logic client-side; secrets must remain in Firebase security rules or the Formspree config.

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
| `initForms()` | Intercepts all `form[action*="formspree"]` submit events and sends via `fetch` (AJAX) |
| `getAvatarColor()` | Returns a random brand colour for review avatar backgrounds |

### `news-db.js` Function Inventory

| Function | Purpose |
|---|---|
| `initFirebase()` | Initialises Firebase app (`v11.6.1`), selects Firestore collection, calls `startNewsLogic()` |
| `startNewsLogic()` | Sets up `onAuthStateChanged` listener; signs in anonymously if no user; sets up real-time `onSnapshot` listener |
| `toggleAdminUI(isAdmin)` | Shows/hides edit+delete buttons on news items based on auth state |
| `handleInternPageVisibility(isAdmin)` | Shows admin dashboard or login prompt on `intern.html` based on auth state |
| `loadIntoForm(item)` | Populates the news edit form with an existing document's data |
| `resetForm()` | Clears the news form and resets it to "new post" mode |
| `deleteNewsItem(docId, imageUrl)` | Deletes a Firestore document and removes its associated GitHub image file |
| `handleLogin()` | Authenticates admin with `info@segelfliegen-altdorf.de` and entered password |
| `compressImage(file, maxWidth, quality)` | Resizes image to max 1200 px, encodes as WebP at 80% quality; returns a Blob |
| `uploadToGitHub(blob, filename, token)` | Uploads WebP blob to `images/news_<timestamp>.webp` via GitHub Contents API; returns raw URL |
| `deleteFromGitHub(imageUrl, token)` | Deletes a `images/news_*.webp` file from the repository when a news item is removed |

**Anonymous auth**: Non-admin visitors are signed in anonymously via `signInAnonymously()` so the `onSnapshot` listener can read Firestore data without a password.

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
| **Firebase** | `news-db.js` lines 5–13 | Project ID: `segelfliegen`. SDK version: `11.6.1`. API key is public (restricted via Firebase console). |
| **GitHub API** | `news-db.js` `uploadToGitHub()` / `deleteFromGitHub()` | Used for news image storage. Requires admin to supply a PAT with `contents: write`; stored in `localStorage`. |
| **Formspree** | `action` attributes in HTML forms | Both forms share the same endpoint (`f/meekadza`); present in `mitfliegen.html` and `kontakt.html` only. |
| **Google Maps** | Embed `<iframe>` in `kontakt.html` | Uses consent overlay pattern; iframe only loads after cookie accept. |
| **Flatpickr** | CDN `<script>` in booking-form pages | German locale (`flatpickr/dist/l10n/de.js`) is loaded separately. |
| **Google Fonts** | `<link>` in `<head>` of each page | Montserrat (headings) + Open Sans (body) + Tangerine (decorative). |
| **GitHub Pages** | `CNAME` file | Do not delete or rename this file — it maps the domain. |

---

## Admin Panel (`intern.html`)

- Protected by Firebase email/password authentication.
- Admin email: `info@segelfliegen-altdorf.de` (password managed in Firebase console).
- Admins can create, edit, and delete news posts.
- Image uploads: admins select a local file; it is compressed to WebP and uploaded to the repository via GitHub API. A GitHub PAT (`contents: write`) must be entered once and is saved in `localStorage`.
- When a news item with a `news_*.webp` image is deleted, the image file is also removed from the repository automatically.
- `intern.html` is linked in the footer of every page (not in the main nav). Clicking it opens a login modal if the user is not authenticated.
- When logged in, `body.admin-mode` CSS class is added to the page — used for admin-only styling.
- The admin dashboard also contains quick-links to the external member portal at `vereinsflieger.de` (Flugbuch, Dokumente, Dienste).

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
- Videos live in `videos/` — used as `<source>` elements in hero `<video>` tags.
- Prefer `.webp` for new images (smaller file size); `.jpg` is also acceptable.
- Keep video files under ~10 MB where possible; the repository is already large (~357 MB).
- Always provide an `alt` attribute on `<img>` tags.

---

## Common Tasks

### Update the News Feed

News is managed through the admin panel at `/intern.html`. Admins log in with their Firebase credentials and create/edit/delete posts through the UI. A GitHub PAT must be stored to enable image uploads. No code changes are needed.

### Change Navigation Links

Edit the `headerHTML` template literal in `script.js`. The change applies to all pages automatically since the header is injected at runtime.

### Add/Update a Booking Form

1. Create a Formspree form at formspree.io and copy the endpoint URL.
2. Set the `action` attribute of the HTML `<form>` to that URL.
3. Ensure `method="POST"` and the hidden input `<input type="hidden" name="_subject" ...>` is present.
4. Add Flatpickr to date inputs if needed (see `mitfliegen.html` for the pattern).
5. Form submission is handled automatically via AJAX by `initForms()` in `script.js` — no extra JS needed.

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
