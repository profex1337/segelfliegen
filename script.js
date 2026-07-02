const headerHTML = `
<a href="#main-content" class="skip-link">Zum Inhalt springen</a>
<div class="container header-inner">
    <div class="logo">
        <a href="index.html">
            <img src="images/logo.png" alt="Segelflugplatz Altdorf" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-weight:800; font-size:1.2rem; color:#0f3460; line-height:1.2; display:block;\\'>Segelflugplatz<br>Altdorf</span>'">
        </a>
    </div>

    <button type="button" class="hamburger" id="hamburger-btn" aria-label="Menü öffnen" aria-expanded="false">
        <span></span>
        <span></span>
        <span></span>
    </button>

    <nav class="nav-menu" id="nav-menu">
        <a href="index.html">Start</a>
        <a href="uber-uns.html">Über uns</a>
        <a href="mitfliegen.html">Mitfliegen</a>
        <a href="flugzeugpark.html">Flugzeugpark</a>
        <a href="ausbildung.html">Ausbildung</a>
        <a href="veranstaltungen.html">Events</a>
        <a href="kontakt.html">Kontakt</a>
        
        <div class="header-socials">
            <a href="https://www.facebook.com/Segelflieger.PostSV/?locale=de_DE" target="_blank" rel="noopener noreferrer" title="Facebook" class="header-social-link" aria-label="Besuche uns auf Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="https://www.instagram.com/segelflieger.psv/?hl=de" target="_blank" rel="noopener noreferrer" title="Instagram" class="header-social-link" aria-label="Folge uns auf Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://www.youtube.com/channel/UCPiG85TTftKcU4jr4Vjuhvg" target="_blank" rel="noopener noreferrer" title="YouTube" class="header-social-link" aria-label="Unser YouTube Kanal">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            </a>
        </div>
    </nav>
</div>
`;

const footerHTML = `
<div class="container">
    <div class="footer-layout">
        <!-- LINKS: Info Bilder (untereinander, enger zusammen) -->
        <div class="footer-col-left">
            <img src="images/altdorf_radio.png" alt="Altdorf Radio 129.980" class="footer-info-img">
            <img src="images/koordinaten.png" alt="Koordinaten" class="footer-info-img">
        </div>

        <!-- MITTE: Kontakt & Social Media -->
        <div class="footer-col-center">
            <div class="footer-contact">
                <a href="tel:+499189310" style="display: block; margin-bottom: 5px;">📞 +49 9189 310</a>
                <a href="mailto:info@segelfliegen-altdorf.de" style="display: block;">📧 info@segelfliegen-altdorf.de</a>
            </div>
            
            <div class="footer-socials">
                <a href="https://www.facebook.com/Segelflieger.PostSV/?locale=de_DE" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Folge uns auf Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="https://www.instagram.com/segelflieger.psv/?hl=de" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Folge uns auf Instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="https://www.youtube.com/channel/UCPiG85TTftKcU4jr4Vjuhvg" target="_blank" rel="noopener noreferrer" title="YouTube" aria-label="Besuche unseren YouTube Kanal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                </a>
            </div>
        </div>

        <!-- RECHTS: Logo SPN (Overlapping) -->
        <div class="footer-col-right">
            <!-- Logo replaced by background image -->
        </div>
    </div>

    <div class="footer-bottom">
        <a href="widerruf.html" class="footer-widerruf">Vertrag widerrufen</a>
        <br><br>
        <a href="impressum.html" style="margin:0 10px; color: #b0b0b0;">Impressum</a> |
        <a href="datenschutz.html" style="margin:0 10px; color: #b0b0b0;">Datenschutz</a> |
        <a href="#" id="cookie-settings-link" style="margin:0 10px; color: #b0b0b0; cursor:pointer; white-space:nowrap;">Cookies verwalten</a> |
        <a href="intern.html" id="nav-intern" style="margin:0 10px; color: #b0b0b0;">Intern</a>
        <br><br>
        &copy; 2026 Segelflugplatz Altdorf-Hagenhausen
    </div>
</div>

<img src="images/spn_flieger.png" alt="Segelflieger" class="footer-bg-flieger">

`;

// Login-Modal separat im body (nicht im Footer), damit es nicht im Footer-Stacking-Context
// gefangen ist und immer über main (z-index:15) erscheint.
const loginModalHTML = `
<div id="login-modal" class="modal" style="display: none;">
    <div class="modal-content admin-login-card">
        <button type="button" class="modal-close" id="login-close" aria-label="Login schließen">&times;</button>
        <h3>Mitarbeiter & Mitglieder Login</h3>
        <p>Bitte gib dein Passwort ein:</p>
        <form id="admin-login-form">
            <input type="password" id="admin-password-input" placeholder="Passwort" autocomplete="current-password">
            <p id="login-error" style="color: red; font-size: 0.8rem; display: none;">Falsches Passwort!</p>
            <button type="submit" id="admin-login-btn" class="btn" style="width: 100%; margin-top: 10px;">Anmelden</button>
        </form>
    </div>
</div>
`;

const GOOGLE_MAPS_REVIEW_URL = 'https://www.google.de/maps/place/Segelflugplatz+Altdorf-Hagenhausen+Post-SV+N%C3%BCrnberg/@49.3902569,11.4256224,247m/data=!3m1!1e3!4m6!3m5!1s0x410c9f6d5ba244cb:0x8d005d5cdc3b2aca!8m2!3d49.3899301!4d11.4267085!16s%2Fg%2F11b6g8prkb!5m1!1e1?entry=ttu';
const reviewsHTML = `<aside id="reviews-sidebar" class="reviews-sidebar">
    <div class="reviews-header">
        <h3>Google Rezensionen</h3>
        <button type="button" id="close-reviews" class="close-reviews" aria-label="Bewertungen schließen">&times;</button>
    </div>
    <div class="reviews-summary">
        <div class="big-rating" id="reviews-avg-rating">4.9</div>
        <div class="stars-gold" id="reviews-avg-stars">★★★★★</div>
        <p id="reviews-count">Basierend auf Google Maps</p>
        <a href="${GOOGLE_MAPS_REVIEW_URL}" target="_blank" rel="noopener noreferrer" class="btn-review-google">Auf Google bewerten</a>
    </div>
    <div class="reviews-list" id="reviews-list-container"></div>
</aside>
<div id="reviews-overlay" class="reviews-overlay"></div>`;

// Cloud Function URL für öffentliche Formulare
const CLOUD_FUNCTION_URL = 'https://europe-west1-segelfliegen.cloudfunctions.net/sendPublicEmail';

async function callCloudFunction(data) {
    const resp = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Senden fehlgeschlagen');
    }
    return resp.json();
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// Defense-in-Depth: CSP + Referrer-Policy so früh wie möglich setzen (kein Server-Header
// auf GitHub Pages verfügbar). Erlaubt: Firebase SDK/Firestore/Auth, Cloud Functions,
// GitHub-Raw-Bilder, Google Maps/YouTube-Embeds (Consent-Overlay), QR-Code- und Wetter-API.
// 'unsafe-inline' ist wegen der vielen inline style="..."/onclick="..."-Attribute
// (kein Build-Schritt, kein Nonce möglich) nötig — schützt primär vor dem Nachladen
// fremder <script>/<object>/<frame>-Quellen, nicht vor Inline-Injection.
function initSecurityMeta() {
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        const csp = document.createElement('meta');
        csp.setAttribute('http-equiv', 'Content-Security-Policy');
        csp.setAttribute('content', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://www.gstatic.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.cloudfunctions.net https://*.run.app https://api.qrserver.com https://api.open-meteo.com",
            "frame-src https://www.google.com https://www.youtube-nocookie.com https://www.youtube.com",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; '));
        document.head.insertBefore(csp, document.head.firstChild);
    }
    if (!document.querySelector('meta[name="referrer"]')) {
        const ref = document.createElement('meta');
        ref.setAttribute('name', 'referrer');
        ref.setAttribute('content', 'strict-origin-when-cross-origin');
        document.head.insertBefore(ref, document.head.firstChild);
    }
}
initSecurityMeta();

function injectLayout() {
    const headerElement = document.getElementById('main-header');
    if (headerElement && !headerElement.innerHTML.trim()) {
        headerElement.innerHTML = headerHTML;
        
        const currentPage = window.location.pathname.split("/").pop() || 'index.html';
        headerElement.querySelectorAll('.nav-menu a').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });

        const hamburger = document.getElementById('hamburger-btn');
        const navMenu = document.getElementById('nav-menu');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                const isOpen = hamburger.classList.toggle('open');
                navMenu.classList.toggle('active');
                hamburger.setAttribute('aria-expanded', isOpen);
                document.body.classList.toggle('menu-open', isOpen);
            });

            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('open');
                    navMenu.classList.remove('active');
                    hamburger.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('menu-open');
                });
            });
        }
    }

    const footerElement = document.getElementById('main-footer');
    if (footerElement && !footerElement.innerHTML.trim()) {
        footerElement.innerHTML = footerHTML;
        if (!document.getElementById('reviews-sidebar')) {
            document.body.insertAdjacentHTML('beforeend', reviewsHTML);
        }
        if (!document.getElementById('login-modal')) {
            document.body.insertAdjacentHTML('beforeend', loginModalHTML);
        }
    }
}

// Perform injection immediately since script is at the end of body
injectLayout();


document.addEventListener('DOMContentLoaded', () => {
    initFavicon();
    // Re-check injection in case DOM was slow
    injectLayout();

    initLightbox();
    initBackToTop();
    initSlideshows();
    initHeroVideos();
    initWeather();
    initStickyNav();
    initFaqAnimation();
    initCookieConsent();
    initReviews();
    initForms();
    initSwipeNavigation();
    initTransparentHeader();
    initGliderUnderline();
    initSkipLink();

    // Einzelner Consent-Button (pro Einbettung) — lädt NUR den geklickten Inhalt
    // und setzt KEINE globale Einwilligung (granulare Einwilligung je Einbettung).
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('consent-accept-btn')) {
            const overlay = e.target.closest('.consent-overlay');
            if (overlay) embedConsentContent(overlay);
        }
    });

    // Cookie-Einstellungen im Footer
    const cookieSettingsLink = document.getElementById('cookie-settings-link');
    if (cookieSettingsLink) {
        cookieSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('dsgvo-consent');
            // Bestehenden Banner entfernen falls vorhanden
            const existingBanner = document.getElementById('cookie-banner');
            if (existingBanner) existingBanner.remove();
            // Cookie-Consent-Banner erneut anzeigen
            initCookieConsent();
        });
    }
});


// 3. UI HELFER FUNKTIONEN & REVIEWS

/* --- GOOGLE REVIEWS REALISTIC SNAPSHOT --- */
function initReviews() {
    const trigger = document.getElementById('review-trigger-btn');
    const sidebar = document.getElementById('reviews-sidebar');
    const closeBtn = document.getElementById('close-reviews');
    const overlay = document.getElementById('reviews-overlay');
    const listContainer = document.getElementById('reviews-list-container');

    if (!trigger || !sidebar) return;

    // Fallback-Reviews (werden angezeigt bis Live-Daten geladen sind)
    const fallbackReviews = {
        rating: 4.9,
        totalReviews: 0,
        reviews: [
            { name: "Michael Dittrich", rating: 5, date: "vor einem Jahr", text: "War heute mit meinem Enkel am Flugplatz. Ganz liebe Leute!!!! Uns wurde alles gezeigt und Milo durfte sich sogar in ein Segelflugzeug setzen." },
            { name: "A. Delino", rating: 5, date: "vor 2 Jahren", text: "Tolle zuvorkommende freundliche Mannschaft, die mit Begeisterung ihren Gästen das Segelfliegen zeigen. Kaffee und Kuchen gibt's am Wochenende noch oben drauf." },
            { name: "Kevin Fritsch", rating: 5, date: "vor 7 Jahren", text: "Super Flugplatz und ganz liebe Flieger! Man fühlt sich wie daheim, man wird sehr herzlich aufgenommen!" }
        ]
    };

    function renderReviews(data) {
        // Durchschnittsbewertung + Anzahl aktualisieren
        var avgEl = document.getElementById('reviews-avg-rating');
        var starsEl = document.getElementById('reviews-avg-stars');
        var countEl = document.getElementById('reviews-count');
        var triggerScore = document.querySelector('.rating-score');
        if (avgEl && data.rating) avgEl.textContent = data.rating.toFixed(1).replace('.', ',');
        if (starsEl && data.rating) {
            var full = Math.floor(data.rating);
            var half = data.rating - full >= 0.3 ? 1 : 0;
            starsEl.textContent = '★'.repeat(full) + (half ? '★' : '') + '☆'.repeat(5 - full - half);
        }
        if (countEl && data.totalReviews) countEl.textContent = data.totalReviews + ' Bewertungen auf Google Maps';
        if (triggerScore && data.rating) triggerScore.textContent = data.rating.toFixed(1).replace('.', ',');

        // Reviews rendern
        if (!listContainer || !data.reviews) return;
        listContainer.innerHTML = data.reviews.map(function(review) {
            var name = review.name || '';
            var initials = escapeHtml(name.split(' ').map(function(n) { return n[0] || ''; }).join(''));
            var nameEsc = escapeHtml(name);
            var dateEsc = escapeHtml(review.date || '');
            var rating = parseInt(review.rating, 10) || 0;
            if (rating < 0) rating = 0; if (rating > 5) rating = 5;
            var starsHTML = '★'.repeat(rating) + '☆'.repeat(5 - rating);
            var textEscaped = escapeHtml(review.text || '').replace(/\n/g, '<br>');
            return '<div class="review-card">'
                + '<div class="review-avatar" style="background-color: ' + getAvatarColor() + '">' + initials + '</div>'
                + '<div class="review-content">'
                + '<h4>' + nameEsc + '</h4>'
                + '<span class="review-meta">' + dateEsc + '</span>'
                + '<div style="color: #ffc107; font-size: 0.9rem;">' + starsHTML + '</div>'
                + '<p>' + textEscaped + '</p>'
                + '</div></div>';
        }).join('');
    }

    // Sofort Fallback anzeigen (keine externe Verbindung)
    renderReviews(fallbackReviews);

    // Live-Daten von der Cloud Function (Google-Infrastruktur, EU-Region) — erst nach
    // Einwilligung laden, da dabei die IP an den Google-betriebenen Endpunkt übermittelt wird.
    window.loadLiveReviews = function() {
        fetch('https://europe-west1-segelfliegen.cloudfunctions.net/getGoogleReviews')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.reviews && data.reviews.length > 0) renderReviews(data);
            })
            .catch(function() { /* Fallback bleibt stehen */ });
    };
    if (localStorage.getItem('dsgvo-consent') === 'accepted') window.loadLiveReviews();

    var openSidebar = function() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (closeBtn) closeBtn.focus();
    };

    var closeSidebar = function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        trigger.focus();
    };

    trigger.addEventListener('click', openSidebar);
    if(closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if(overlay) overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) closeSidebar();
    });
}

// Wetter-Widget (Open-Meteo API, Flugplatz Altdorf-Hagenhausen)
// IP-Übermittlung in die Schweiz (Open-Meteo) — daher nur nach Cookie-Consent laden.
function loadWeatherData() {
    const widget = document.getElementById('weather-widget');
    if (!widget || widget.dataset.loaded === '1') return;

    const LAT = 49.38;
    const LON = 11.35;
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON
        + '&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover'
        + '&timezone=Europe/Berlin';

    widget.dataset.loaded = '1';
    fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var c = data.current;
            var temp = Math.round(c.temperature_2m);
            var wind = Math.round(c.wind_speed_10m);
            var gusts = Math.round(c.wind_gusts_10m);
            var dir = getWindDirection(c.wind_direction_10m);
            var cloud = c.cloud_cover;
            var icon = getWeatherIcon(c.weather_code);

            widget.innerHTML =
                '<span class="weather-item"><span class="weather-icon">' + icon + '</span><span class="weather-value">' + temp + ' °C</span></span>'
                + '<span class="weather-separator"></span>'
                + '<span class="weather-item"><span class="weather-icon">💨</span><span class="weather-value">' + wind + ' km/h ' + dir + '</span>'
                + (gusts > wind + 5 ? ' <span style="opacity:0.7;">(Böen ' + gusts + ')</span>' : '') + '</span>'
                + '<span class="weather-separator"></span>'
                + '<span class="weather-item"><span class="weather-icon">☁</span><span class="weather-value">' + cloud + ' %</span></span>';
            widget.style.visibility = 'visible';
        })
        .catch(function() { widget.dataset.loaded = ''; /* Bei Fehler später erneut versuchen können */ });
}

function initWeather() {
    if (localStorage.getItem('dsgvo-consent') === 'accepted') {
        loadWeatherData();
    }
    // Bei nachträglichem Cookie-Accept wird loadWeatherData() aus initCookieConsent() aufgerufen.
}

function getWindDirection(deg) {
    var dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

function getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 57) return '🌧️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '☁️';
}

function getAvatarColor() {
    const colors = ['#0ea5e9', '#0f3460', '#16213e', '#533483', '#009688', '#0284c7'];
    return colors[Math.floor(Math.random() * colors.length)];
}


function embedConsentContent(singleOverlay) {
    const overlays = singleOverlay ? [singleOverlay] : document.querySelectorAll('.consent-overlay');
    overlays.forEach(overlay => {
        const src = overlay.getAttribute('data-src');
        if (!src) return;
        const title = overlay.getAttribute('data-title') || '';
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.title = title;
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'no-referrer-when-downgrade';
        overlay.replaceWith(iframe);
    });
}

function initCookieConsent() {
    const consent = localStorage.getItem('dsgvo-consent');
    if (consent === 'accepted') {
        embedConsentContent();
        return;
    }
    if (consent === 'declined') return;

    const bannerHTML = `
    <div id="cookie-banner" class="cookie-banner">
        <div class="cookie-content">
            <h3>Datenschutzeinstellungen</h3>
            <p>
                Zur Bereitstellung der Inhalte nutzt diese Website technisch erforderliche Dienste:
                <strong>Google Firebase</strong> (Datenbank &amp; Anmeldung) und
                <strong>GitHub</strong> (Hosting &amp; Bilder). Dabei wird Ihre IP-Adresse an die jeweiligen Server übertragen.
                Optionale Inhalte (<strong>Google Maps</strong>, <strong>YouTube</strong>, Wetter-Widget über <strong>Open-Meteo</strong>)
                werden erst nach Ihrer ausdrücklichen Zustimmung geladen.
                <a href="datenschutz.html" style="text-decoration: underline;">Mehr erfahren</a>.
            </p>
            <div class="cookie-buttons">
                <button id="cookie-accept" class="btn" style="padding: 8px 15px; font-size: 0.9rem; box-shadow: none;">Alle akzeptieren</button>
                <button id="cookie-decline" class="btn" style="padding: 8px 15px; font-size: 0.9rem; background: var(--primary); box-shadow: none;">Nur Essenzielle</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', bannerHTML);

    const banner = document.getElementById('cookie-banner');
    
    document.getElementById('cookie-accept').onclick = () => {
        localStorage.setItem('dsgvo-consent', 'accepted');
        banner.style.display = 'none';
        embedConsentContent();
        if (typeof loadWeatherData === 'function') loadWeatherData();
        if (typeof window.loadLiveReviews === 'function') window.loadLiveReviews();
    };

    document.getElementById('cookie-decline').onclick = () => {
        localStorage.setItem('dsgvo-consent', 'declined');
        banner.style.display = 'none';
    };
}

// Flugdauer berechnen: Basisdauer je Flugart + Zusatzzeit
function getFlugdauer(flugart, zusatzMin) {
    var basis = { 'Segelflug (Windenstart)': 20, 'Segelflug (F-Schlepp)': 20, 'Motorsegler': 15 };
    var base = basis[flugart];
    if (!base) {
        var keys = Object.keys(basis);
        for (var i = 0; i < keys.length; i++) {
            if (flugart.indexOf(keys[i]) === 0) { base = basis[keys[i]]; break; }
        }
    }
    if (!base) return 'pauschal';
    var text = 'bis zu ' + base + ' Min.';
    if (zusatzMin > 0) text += ' + ' + zusatzMin + ' Min. zus\u00E4tzlich';
    return text;
}

// Zeigt eine gestaltete Inline-Fehlermeldung im Formular statt eines blockierenden alert()
function showFormError(form, message) {
    const existing = form.querySelector('.form-error');
    if (existing) existing.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.style.cssText = 'color:#d63030; background:#fff5f5; border:1px solid #fed7d7; padding:12px 15px; border-radius:8px; margin-top:15px; text-align:center; font-size:0.9rem;';
    errorDiv.textContent = message;
    form.appendChild(errorDiv);
}

function initForms() {
    document.querySelectorAll('form[data-emailjs]').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Wird gesendet…';
            btn.disabled = true;

            // Bestehende Fehlermeldung entfernen
            const existingError = form.querySelector('.form-error');
            if (existingError) existingError.remove();

            const formType = form.getAttribute('data-emailjs');
            const fd = new FormData(form);

            // Honeypot-Spam-Schutz (clientseitig + serverseitig)
            if (fd.get('website_url')) {
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            // Daten für Cloud Function zusammenstellen
            var cfData = {
                formType: formType,
                name: fd.get('name') || '',
                email: fd.get('email') || '',
                telefon: fd.get('telefon') || '',
                message: fd.get('message') || '',
                website_url: fd.get('website_url') || ''
            };

            if (formType === 'kontakt') {
                cfData.betreff = fd.get('betreff') || 'Allgemein';
            } else if (formType === 'gutschein') {
                var flugartSelect = document.getElementById('gutschein-flugart');
                var selectedOpt = flugartSelect ? flugartSelect.options[flugartSelect.selectedIndex] : null;
                if (!selectedOpt || !selectedOpt.value || !selectedOpt.getAttribute('data-base')) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    showFormError(form, 'Bitte warte kurz, die Preise werden noch geladen.');
                    return;
                }
                var zusatz = parseInt(fd.get('zusatzzeit') || '0', 10);
                var desc = selectedOpt.getAttribute('data-description') || '';
                cfData.flugart = fd.get('flugart') || '';
                cfData.zusatzzeit = fd.get('zusatzzeit') || '0';
                cfData.wert = fd.get('wert') || '';
                cfData.wertAnzeigen = fd.get('wert_anzeigen') ? true : false;
                cfData.empfaenger = fd.get('empfaenger') || '';
                cfData.anlass = fd.get('anlass') || '';
                cfData.zustellung = fd.get('zustellung') || '';
                cfData.grusstext = fd.get('grusstext') || '';
                cfData.flugdauer = zusatz > 0 ? desc + ' + ' + zusatz + ' Min. zusätzlich' : desc;
            } else if (formType === 'gastflug') {
                cfData.interest = fd.get('interest') || '';
            } else if (formType === 'widerruf') {
                cfData.bestelldetails = fd.get('bestelldetails') || '';
                cfData.grund = fd.get('grund') || '';
            }

            try {
                // Benachrichtigung + Auto-Reply über Cloud Function
                await callCloudFunction(cfData);

                // Bei Gutschein: Firestore-Speicherung
                if (formType === 'gutschein') {
                    if (typeof window.saveVoucherOrder === 'function') {
                        window.saveVoucherOrder({
                            name: fd.get('name') || '',
                            email: fd.get('email') || '',
                            telefon: fd.get('telefon') || '',
                            flugart: fd.get('flugart') || '',
                            zusatzzeit: fd.get('zusatzzeit') || '0',
                            wert: fd.get('wert') || '',
                            empfaenger: fd.get('empfaenger') || '',
                            grusstext: fd.get('grusstext') || '',
                            zustellung: fd.get('zustellung') || '',
                            wertAnzeigen: fd.get('wert_anzeigen') ? true : false,
                            flugdauer: cfData.flugdauer || ''
                        });
                    }
                }

                // Erfolgsmeldung anzeigen
                if (formType === 'gutschein') {
                    var gWert = fd.get('wert') || '';
                    var gName = fd.get('name') || '';
                    var gWertEsc = escapeHtml(gWert);
                    var gNameEsc = escapeHtml(gName);
                    var gZustellung = fd.get('zustellung') || '';
                    var istFlugplatz = gZustellung.indexOf('Flugplatz') !== -1;
                    var istAbholung = gZustellung.indexOf('Abholung') !== -1;

                    if (istFlugplatz) {
                        form.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
                            + '<div style="font-size: 3rem; margin-bottom: 15px;">🎁</div>'
                            + '<h3 style="color: var(--primary);">Gutschein-Bestellung eingegangen!</h3>'
                            + '<p style="color: var(--text-light); margin-bottom: 25px;">Vielen Dank für deine Bestellung!</p>'
                            + '<div style="background: var(--bg-light); border: 2px solid var(--primary); border-radius: var(--radius); padding: 25px; display: inline-block; text-align: left; max-width: 400px;">'
                            + '<p style="margin: 0; font-weight: 600; text-align: center;">Abholung am Flugplatz</p>'
                            + '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Adresse:</strong> 92348 Stöckelsberg (bitte der Beschilderung folgen)</p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>Nur am Wochenende oder an Feiertagen.</strong></p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>Telefon:</strong> <a href="tel:+499189310" style="color: var(--primary);">09189 310</a></p>'
                            + (gWert ? '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Betrag:</strong> ' + gWertEsc + ' € (Barzahlung vor Ort)</p>' : '')
                            + '</div>'
                            + '<p style="color: var(--text-light); margin-top: 25px; font-size: 0.9rem;">Bitte melde dich vorher an, damit wir deinen Gutschein ausdrucken und für dich bereitlegen.</p>'
                            + '<p style="color: var(--text-light); font-size: 0.85rem; font-style: italic;">Du erhältst eine Bestätigung per E-Mail.</p>'
                            + '</div>';
                        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (istAbholung) {
                        form.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
                            + '<div style="font-size: 3rem; margin-bottom: 15px;">🎁</div>'
                            + '<h3 style="color: var(--primary);">Gutschein-Bestellung eingegangen!</h3>'
                            + '<p style="color: var(--text-light); margin-bottom: 25px;">Vielen Dank für deine Bestellung!</p>'
                            + '<div style="background: var(--bg-light); border: 2px solid var(--primary); border-radius: var(--radius); padding: 25px; display: inline-block; text-align: left; max-width: 400px;">'
                            + '<p style="margin: 0; font-weight: 600; text-align: center;">Abholung in 90518 Altdorf</p>'
                            + '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Adresse:</strong> Jörg Sperber, Schulstraße 18, 90518 Altdorf</p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>Standort:</strong> <a href="https://maps.app.goo.gl/p4YEwmERAwFkmy479" target="_blank" rel="noopener noreferrer" style="color: var(--primary);">In Google Maps öffnen</a></p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>Telefon:</strong> <a href="tel:+4915117250329" style="color: var(--primary);">+49 1511 7250329</a></p>'
                            + (gWert ? '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Betrag:</strong> ' + gWertEsc + ' € (Barzahlung vor Ort)</p>' : '')
                            + '</div>'
                            + '<p style="color: var(--text-light); margin-top: 25px; font-size: 0.9rem;">Bitte ruf vorher an, um einen Abholtermin zu vereinbaren.</p>'
                            + '<p style="color: var(--text-light); font-size: 0.85rem; font-style: italic;">Du erhältst eine Bestätigung per E-Mail.</p>'
                            + '</div>';
                        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        // EPC-QR-Code (SEPA-Standard) für Banking-Apps
                        var epcBetrag = gWert ? gWert.replace(',', '.') : '';
                        var epcData = 'BCD\n002\n1\nSCT\nGENODEF1HSB\nSegelflieger im Post SV Nürnberg\nDE20760614820004555554\nEUR' + epcBetrag + '\n\n\nGutschein ' + gName;
                        var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(epcData);
                        form.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
                            + '<div style="font-size: 3rem; margin-bottom: 15px;">🎁</div>'
                            + '<h3 style="color: var(--primary);">Gutschein-Bestellung eingegangen!</h3>'
                            + '<p style="color: var(--text-light); margin-bottom: 25px;">Vielen Dank für deine Bestellung!</p>'
                            + '<div style="background: var(--bg-light); border: 2px solid var(--primary); border-radius: var(--radius); padding: 25px; display: inline-block; text-align: left; max-width: 400px;">'
                            + '<p style="margin: 0; font-weight: 600; text-align: center;">Bankverbindung</p>'
                            + '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Empfänger:</strong> Segelflieger im Post SV Nürnberg</p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>IBAN:</strong> DE20 7606 1482 0004 5555 54</p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>BIC:</strong> GENODEF1HSB</p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.85rem; color: var(--text-light);">Raiffeisenbank im Nürnberger Land</p>'
                            + (gWert ? '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Betrag:</strong> ' + gWertEsc + ' €</p>' : '')
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>Verwendungszweck:</strong> Gutschein ' + gNameEsc + '</p>'
                            + '</div>'
                            + '<div style="margin-top: 20px;">'
                            + '<img src="' + qrUrl + '" alt="QR-Code für Überweisung" width="120" height="120" style="width: 120px; height: 120px; max-width: 120px; border-radius: 6px; display: inline-block;">'
                            + '<p style="color: var(--text-light); font-size: 0.85rem; margin-top: 8px;">QR-Code für deine Banking-App scannen</p>'
                            + '</div>'
                            + '<p style="color: var(--text-light); margin-top: 25px; font-size: 0.9rem;">Nach Zahlungseingang erhältst du deinen personalisierten Gutschein per E-Mail.</p>'
                            + '<p style="color: var(--text-light); font-size: 0.85rem; font-style: italic;">Du erhältst in Kürze eine Bestätigung per E-Mail mit den Zahlungsinformationen.</p>'
                            + '</div>';
                        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else if (formType === 'widerruf') {
                    form.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
                        + '<div style="font-size: 3rem; margin-bottom: 15px;">✅</div>'
                        + '<h3 style="color: var(--primary);">Widerruf eingegangen</h3>'
                        + '<p style="color: var(--text-light);">Vielen Dank. Wir haben den Eingang Ihrer Widerrufserklärung registriert. Sie erhalten in Kürze eine Eingangsbestätigung per E-Mail. Die Prüfung der Wirksamkeit erfolgt separat — wir melden uns bei Ihnen.</p>'
                        + '</div>';
                } else {
                    form.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
                        + '<div style="font-size: 3rem; margin-bottom: 15px;">✅</div>'
                        + '<h3 style="color: var(--primary);">Nachricht gesendet!</h3>'
                        + '<p style="color: var(--text-light);">Vielen Dank! Wir melden uns so schnell wie möglich bei dir.</p>'
                        + '</div>';
                }
            } catch (err) {
                btn.textContent = originalText;
                btn.disabled = false;
                showFormError(form, 'Es gab einen Fehler beim Senden. Bitte versuche es später erneut oder schreib uns per E-Mail.');
            }
        });
    });
}

function initFavicon() {
    // Favicon nur setzen wenn keiner im HTML definiert ist
    if (!document.querySelector("link[rel='icon']")) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = 'favicon.ico';
        link.type = 'image/x-icon';
        document.head.appendChild(link);
    }
    // Apple Touch Icon nur setzen wenn keiner im HTML definiert ist
    if (!document.querySelector("link[rel='apple-touch-icon']")) {
        const appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        appleLink.href = 'apple-touch-icon.png';
        document.head.appendChild(appleLink);
    }
}

function initLightbox() {
    if (!document.getElementById('lightbox')) {
        const lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = '<span class="lightbox-close">&times;</span><img class="lightbox-content" id="lightbox-img"><div id="lightbox-caption"></div>';
        document.body.appendChild(lightbox);
        
        const lightboxImg = document.getElementById('lightbox-img');
        const caption = document.getElementById('lightbox-caption');
        
        window.openLightbox = (src, alt) => {
            lightbox.style.display = "block";
            lightboxImg.src = src;
            caption.textContent = alt || '';
            document.body.style.overflow = 'hidden';
        };
        
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('zoomable')) {
                e.preventDefault();
                window.openLightbox(e.target.src, e.target.alt);
            }
        });

        const close = () => { lightbox.style.display = "none"; document.body.style.overflow = 'auto'; };
        lightbox.querySelector('.lightbox-close').onclick = close;
        lightbox.onclick = (e) => { if(e.target === lightbox) close(); };
        document.addEventListener('keydown', (e) => { if(e.key === "Escape") close(); });
    }
}

// === Hero-Videos: erst laden/abspielen, wenn sie in den Viewport kommen ===
// Die <video>-Elemente tragen preload="none" und ihre Quelle als data-src,
// damit das schwere Video nicht eager mit dem kritischen Rendering konkurriert.
// Das poster-Bild (WebP) überbrückt visuell; ohne JS bleibt einfach das Poster stehen.
function initHeroVideos() {
    const videos = document.querySelectorAll('video.hero-video, video.page-hero-video');
    if (!videos.length) return;

    const loadVideo = (video) => {
        if (video.dataset.heroLoaded) return;
        video.dataset.heroLoaded = '1';
        let changed = false;
        video.querySelectorAll('source[data-src]').forEach((source) => {
            source.src = source.dataset.src;
            changed = true;
        });
        if (changed) video.load();
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {}); // Autoplay-Policy: stilles Scheitern ist ok
        }
    };

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    loadVideo(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px' });
        videos.forEach((v) => observer.observe(v));
    } else {
        videos.forEach(loadVideo);
    }
}

function initBackToTop() {
    const btn = document.getElementById("btn-back-to-top");
    if (btn) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    btn.style.display = (window.scrollY > 300) ? "block" : "none";
                    ticking = false;
                });
                ticking = true;
            }
        });
        btn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
}

function initSlideshows() {
    const slideshows = document.querySelectorAll('.slideshow-container');
    slideshows.forEach((slideshow) => {
        let slideIndex = 0;
        const slides = slideshow.getElementsByClassName("mySlides");
        const prevBtn = slideshow.querySelector(".prev");
        const nextBtn = slideshow.querySelector(".next");
        let autoPlayTimer;

        if(slides.length === 0) return;

        // Zähler-Anzeige (z.B. "3 / 10")
        const counter = document.createElement('div');
        counter.className = 'slideshow-counter';
        slideshow.appendChild(counter);

        // Dot-Navigation
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'slideshow-dots';
        for (let i = 0; i < slides.length; i++) {
            const dot = document.createElement('button');
            dot.className = 'slideshow-dot';
            dot.setAttribute('aria-label', 'Bild ' + (i + 1));
            dot.addEventListener('click', () => { slideIndex = i; showSlides(slideIndex); resetTimer(); });
            dotsContainer.appendChild(dot);
        }
        slideshow.appendChild(dotsContainer);
        const dots = dotsContainer.querySelectorAll('.slideshow-dot');

        const showSlides = (n) => {
            if (n >= slides.length) slideIndex = 0;
            if (n < 0) slideIndex = slides.length - 1;
            for (let i = 0; i < slides.length; i++) slides[i].style.display = "none";
            slides[slideIndex].style.display = "block";
            counter.textContent = (slideIndex + 1) + ' / ' + slides.length;
            dots.forEach((d, i) => d.classList.toggle('active', i === slideIndex));
        };

        const startAutoPlay = () => {
            autoPlayTimer = setInterval(() => { slideIndex++; showSlides(slideIndex); }, 4000);
        };
        const resetTimer = () => { clearInterval(autoPlayTimer); startAutoPlay(); };

        if(prevBtn) prevBtn.addEventListener('click', () => { slideIndex--; showSlides(slideIndex); resetTimer(); });
        if(nextBtn) nextBtn.addEventListener('click', () => { slideIndex++; showSlides(slideIndex); resetTimer(); });

        // Touch-Swipe Support
        let touchStartX = 0;
        slideshow.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        slideshow.addEventListener('touchend', (e) => {
            const diff = e.changedTouches[0].screenX - touchStartX;
            if (Math.abs(diff) > 50) {
                if (diff < 0) { slideIndex++; } else { slideIndex--; }
                showSlides(slideIndex);
                resetTimer();
            }
        }, { passive: true });

        showSlides(slideIndex);
        if (slideshow.dataset.autoplay !== 'false') startAutoPlay();
    });

}

// Sticky Category-Nav: Aktive Sektion hervorheben beim Scrollen
function initStickyNav() {
    const nav = document.querySelector('.category-nav');
    if (!nav) return;

    const buttons = nav.querySelectorAll('.btn-cat');
    if (!buttons.length) return;

    // Stuck-Effekt: Schatten wenn sticky
    const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 80;
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const rect = nav.getBoundingClientRect();
                nav.classList.toggle('stuck', rect.top <= headerHeight + 1);
                ticking = false;
            });
            ticking = true;
        }
    });

    // Aktive Sektion per Intersection Observer
    const sections = [];
    buttons.forEach(btn => {
        const href = btn.getAttribute('onclick') || '';
        // Buttons verwenden scrollToSection('id') oder href="#id"
        const match = href.match(/scrollToSection\(['"]([^'"]+)['"]\)/) || href.match(/#([^'"]+)/);
        if (match) {
            const section = document.getElementById(match[1]);
            if (section) sections.push({ el: section, btn: btn });
        }
    });

    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                buttons.forEach(b => b.classList.remove('active'));
                const match = sections.find(s => s.el === entry.target);
                if (match) match.btn.classList.add('active');
            }
        });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s.el));
}

// Transparenter Header über Hero-Video (Mobil): blendet beim Scrollen
// in einen weißen, opaken Header über. Der Hamburger-Button ist
// am Hero-Anfang weiß, ab Scroll wieder dunkelblau.
function initTransparentHeader() {
    const hasHero = document.querySelector('.hero, .video-header');
    if (!hasHero) return;

    document.body.classList.add('has-hero');

    let ticking = false;
    const update = () => {
        document.body.classList.toggle('scrolled', window.scrollY > 20);
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
    update();
}

// Swipe-Navigation: auf Mobil per Wischen zwischen den Hauptseiten wechseln
function initSwipeNavigation() {
    const pages = [
        'index.html',
        'uber-uns.html',
        'mitfliegen.html',
        'flugzeugpark.html',
        'ausbildung.html',
        'veranstaltungen.html',
        'kontakt.html'
    ];

    const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const currentIdx = pages.indexOf(currentPage);
    if (currentIdx === -1) return; // Seite nicht in der Swipe-Reihenfolge (z. B. intern, impressum, /gutschein/)

    // Nachbarseiten vorladen, damit der Wechsel quasi instant ist
    const prefetch = (href) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.as = 'document';
        document.head.appendChild(link);
    };
    if (currentIdx > 0) prefetch(pages[currentIdx - 1]);
    if (currentIdx < pages.length - 1) prefetch(pages[currentIdx + 1]);

    // Bereiche, in denen Swipes nicht zur Seitennavigation führen sollen
    const BLOCK_SELECTOR = '.slideshow-container, .news-carousel, .lightbox, .reviews-sidebar, input, textarea, select';

    let startX = 0, startY = 0, startT = 0, tracking = false;

    document.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 768) return;
        if (e.touches.length !== 1) return;

        // Mobiles Menü offen? → kein Seiten-Swipe
        const navMenu = document.getElementById('nav-menu');
        if (navMenu && navMenu.classList.contains('active')) return;
        // Sichtbare Modals? (Login, Lightbox)
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.style.display === 'block') return;
        const reviews = document.getElementById('reviews-sidebar');
        if (reviews && reviews.classList.contains('active')) return;

        if (e.target.closest && e.target.closest(BLOCK_SELECTOR)) return;

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startT = Date.now();
        tracking = true;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        if (window.innerWidth > 768) return;

        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        const dt = Date.now() - startT;

        const SWIPE_DIST = 80;
        if (Math.abs(dx) < SWIPE_DIST) return;        // zu kurz
        if (Math.abs(dy) > Math.abs(dx) * 0.7) return; // zu sehr vertikal
        if (dt > 800) return;                          // zu langsam

        if (dx < 0 && currentIdx < pages.length - 1) {
            navigateWithSlide(pages[currentIdx + 1], 'left');
        } else if (dx > 0 && currentIdx > 0) {
            navigateWithSlide(pages[currentIdx - 1], 'right');
        }
    }, { passive: true });

    function navigateWithSlide(href, direction) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.location.href = href;
            return;
        }
        const main = document.getElementById('main-content') || document.body;
        main.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
        main.style.transform = direction === 'left' ? 'translateX(-30px)' : 'translateX(30px)';
        main.style.opacity = '0';
        setTimeout(() => { window.location.href = href; }, 190);
    }
}

// FAQ: Sanfte Öffnen/Schließen-Animation für <details>
// Setzt die Unterstrich-Länge (--ulw) exakt auf die Breite der LETZTEN Titel-Zeile,
// damit Strich + Segler bei ein- und mehrzeiligen Titeln in jeder Auflösung passgenau sind.
function measureGliderUnderlines() {
    if (typeof document.createRange !== 'function') return;
    document.querySelectorAll('.accent-kicker').forEach(h => {
        const range = document.createRange();
        range.selectNodeContents(h);
        const rects = range.getClientRects();
        if (!rects.length) return;
        const last = rects[rects.length - 1];
        if (last.width) h.style.setProperty('--ulw', Math.round(last.width) + 'px');
    });
}
// Global aufrufbar, damit dynamisch nachgeladene Titel (z. B. Flugzeugpark-Kategorien
// nach dem Firestore-onSnapshot) ebenfalls vermessen werden.
window.remeasureGliderUnderlines = measureGliderUnderlines;

function initGliderUnderline() {
    // Kein früher Ausstieg, wenn noch keine .accent-kicker im DOM sind: auf Seiten wie
    // flugzeugpark.html werden die Section-Titel erst asynchron per Firestore nachgeladen
    // (siehe window.remeasureGliderUnderlines) — der Resize-Listener muss trotzdem aktiv sein.
    if (typeof document.createRange !== 'function') return;
    measureGliderUnderlines();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureGliderUnderlines);
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(measureGliderUnderlines, 150); });
}

// Skip-Link muss den Tastaturfokus tatsächlich ins Hauptelement verschieben (WCAG 2.4.1)
function initSkipLink() {
    const main = document.getElementById('main-content');
    const skipLink = document.querySelector('.skip-link');
    if (!main || !skipLink) return;
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    skipLink.addEventListener('click', () => {
        setTimeout(() => main.focus(), 0);
    });
}

function initFaqAnimation() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.faq-item').forEach(details => {
        const summary = details.querySelector('summary');
        if (!summary) return;

        // Inhalte in .faq-content Wrapper packen (falls noch nicht vorhanden)
        let content = details.querySelector('.faq-content');
        if (!content) {
            content = document.createElement('div');
            content.className = 'faq-content';
            // Alle Kinder nach summary in den Wrapper verschieben
            const children = Array.from(details.children).filter(c => c !== summary);
            children.forEach(c => content.appendChild(c));
            details.appendChild(content);
        }

        summary.addEventListener('click', (e) => {
            e.preventDefault();

            if (details.open) {
                // Schließen: Animation abspielen, dann details.open = false
                content.style.maxHeight = content.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    content.style.maxHeight = '0';
                    content.style.opacity = '0';
                });
                content.addEventListener('transitionend', function handler() {
                    details.open = false;
                    content.removeEventListener('transitionend', handler);
                }, { once: true });
            } else {
                // Öffnen
                details.open = true;
                const h = content.scrollHeight;
                content.style.maxHeight = '0';
                content.style.opacity = '0';
                requestAnimationFrame(() => {
                    content.style.maxHeight = h + 'px';
                    content.style.opacity = '1';
                });
                // Nach Animation max-height entfernen für dynamischen Inhalt
                content.addEventListener('transitionend', function handler() {
                    content.style.maxHeight = 'none';
                    content.removeEventListener('transitionend', handler);
                }, { once: true });
            }
        });
    });
}


