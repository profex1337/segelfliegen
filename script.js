const headerHTML = `
<a href="#main-content" class="skip-link">Zum Inhalt springen</a>
<div class="container header-inner">
    <div class="logo">
        <a href="index.html">
            <img src="images/logo.png" alt="Segelflugplatz Altdorf" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-weight:800; font-size:1.2rem; color:#0f3460; line-height:1.2; display:block;\\'>Segelflugplatz<br>Altdorf</span>'">
        </a>
    </div>

    <div class="hamburger" id="hamburger-btn" aria-label="Menü öffnen" aria-expanded="false" role="button">
        <span></span>
        <span></span>
        <span></span>
    </div>

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
        <a href="impressum.html" style="margin:0 10px; color: #b0b0b0;">Impressum</a> |
        <a href="datenschutz.html" style="margin:0 10px; color: #b0b0b0;">Datenschutz</a> |
        <a href="#" id="cookie-settings-link" style="margin:0 10px; color: #b0b0b0; cursor:pointer;">Cookies verwalten</a> |
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
        <span class="modal-close" id="login-close">&times;</span>
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

const reviewsHTML = `<aside id="reviews-sidebar" class="reviews-sidebar">
    <div class="reviews-header">
        <h3>Google Rezensionen</h3>
        <span id="close-reviews" class="close-reviews">&times;</span>
    </div>
            <div class="reviews-summary">
                <div class="big-rating">4.9</div>
                <div class="stars-gold">★★★★★</div>
                <p>Basierend auf Google Maps</p>
                                                    <a href="https://www.google.de/maps/place/Segelflugplatz+Altdorf-Hagenhausen+Post-SV+N%C3%BCrnberg/@49.3902569,11.4256224,247m/data=!3m1!1e3!4m6!3m5!1s0x410c9f6d5ba244cb:0x8d005d5cdc3b2aca!8m2!3d49.3899301!4d11.4267085!16s%2Fg%2F11b6g8prkb!5m1!1e1?entry=ttu&g_ep=EgoyMDI2MDIwNC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" class="btn-review-google">
                                                        Auf Google bewerten
                                                    </a>            </div>    <div class="reviews-list" id="reviews-list-container"></div>
</aside>
<div id="reviews-overlay" class="reviews-overlay"></div>`;

// EmailJS laden
(function() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = function() { emailjs.init({ publicKey: 'XJb8wPMVJVP-bvjJo' }); };
    document.head.appendChild(s);
})();

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
            });

            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('open');
                    navMenu.classList.remove('active');
                    hamburger.setAttribute('aria-expanded', 'false');
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
    initCookieConsent();
    initReviews();
    initDatepickers();
    initForms();

    // Einzelner Consent-Button (pro Einbettung)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('consent-accept-btn')) {
            localStorage.setItem('dsgvo-consent', 'accepted');
            const banner = document.getElementById('cookie-banner');
            if (banner) banner.style.display = 'none';
            embedConsentContent();
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

function initDatepickers() {
    if (typeof flatpickr !== 'undefined') {
        flatpickr("#wunschtermin", {
            locale: "de",
            dateFormat: "d.m.Y",
            minDate: "today",
            disableMobile: "true",
            "enable": [
                function(date) {
                    // 0 = Sonntag, 6 = Samstag
                    return (date.getDay() === 0 || date.getDay() === 6);
                }
            ]
        });
    }
}

// 3. UI HELFER FUNKTIONEN & REVIEWS

/* --- GOOGLE REVIEWS REALISTIC SNAPSHOT --- */
function initReviews() {
    const trigger = document.getElementById('review-trigger-btn');
    const sidebar = document.getElementById('reviews-sidebar');
    const closeBtn = document.getElementById('close-reviews');
    const overlay = document.getElementById('reviews-overlay');
    const listContainer = document.getElementById('reviews-list-container');

    if (!trigger || !sidebar) return; 

    const realReviews = [
        { 
            name: "Michael Dittrich", 
            rating: 5, 
            date: "vor einem Jahr",
            text: "War heute mit meinem Enkel am Flugplatz. Ganz liebe Leute!!!! Uns wurde alles gezeigt und Milo durfte sich sogar in ein Segelflugzeug setzen.<br>Werden im Sommer gerne nochmal kommen.<br>VG Michael"
        },
        {
            name: "A. Delino",
            rating: 5,
            date: "vor 2 Jahren",
            text: "Tolle zuvorkommende freundliche Mannschaft, die mit Begeisterung ihren Gästen das Segelfliegen zeigen. Kaffee und Kuchen gibt's am Wochenende noch oben drauf. Einfach herrlich und genial."
        },
        {
            name: "Gizi Silberhorn",
            rating: 5,
            date: "vor 4 Jahren",
            text: "War nur zur Geburtstagsfeier dort. Hab gleich ne Einladung von nem Mitglied zum Flugtag Anfang August bekommen, finde ich echt nett"
        },
        {
            name: "Kevin Fritsch",
            rating: 5,
            date: "vor 7 Jahren",
            text: "Super Flugplatz und ganz liebe Flieger!<br>Man fühlt sich \"wie daheim\", man wird - egal ob per Flugzeug oder zu Fuß - sehr herzlich aufgenommen!<br><br>Auf jeden Fall einen Besuch wert! ;-)"
        },
        {
            name: "Smolto van der Bruggenkötter",
            rating: 5,
            date: "vor 7 Jahren", 
            text: "Sehr zu empfehlen! Coole Menschen sehr lockere Atmosphäre, sehr freundlich und hilfsbereit.<br>Ein Erlebnis für jung und alt. Hier könnt ihr spontan mitfliegen und einen unvergesslichen tag erleben!<br>Ich komme wieder! Danke für den sehr schönen tag" 
        }
    ];

    if (listContainer) {
        listContainer.innerHTML = realReviews.map(review => {
            const initials = review.name.split(' ').map(n => n[0]).join('');
            const starsHTML = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            
            return `
            <div class="review-card">
                <div class="review-avatar" style="background-color: ${getAvatarColor()}">${initials}</div>
                <div class="review-content">
                    <h4>${review.name}</h4>
                    <span class="review-meta">${review.date}</span>
                    <div style="color: #ffc107; font-size: 0.9rem;">${starsHTML}</div>
                    <p>${review.text}</p>
                </div>
            </div>`;
        }).join('');
    }

    const openSidebar = () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    trigger.addEventListener('click', openSidebar);
    if(closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if(overlay) overlay.addEventListener('click', closeSidebar);
}

function getAvatarColor() {
    const colors = ['#e94560', '#0f3460', '#16213e', '#533483', '#009688', '#ff5722'];
    return colors[Math.floor(Math.random() * colors.length)];
}


function embedConsentContent() {
    document.querySelectorAll('.consent-overlay').forEach(overlay => {
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
                Diese Website nutzt essenzielle Dienste (Firebase) für die Anzeige von Inhalten.
                Zusätzlich können optionale Inhalte (Google Maps, YouTube) eingebettet werden, die erst nach deiner Zustimmung geladen werden.
                <a href="datenschutz.html" style="text-decoration: underline;">Mehr erfahren</a>.
            </p>
            <div class="cookie-buttons">
                <button id="cookie-accept" class="btn" style="padding: 8px 15px; font-size: 0.9rem;">Alle akzeptieren</button>
                <button id="cookie-decline" class="btn btn-secondary" style="padding: 8px 15px; font-size: 0.9rem;">Nur Essenzielle</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', bannerHTML);

    const banner = document.getElementById('cookie-banner');
    
    document.getElementById('cookie-accept').onclick = () => {
        localStorage.setItem('dsgvo-consent', 'accepted');
        banner.style.display = 'none';
        embedConsentContent();
    };

    document.getElementById('cookie-decline').onclick = () => {
        localStorage.setItem('dsgvo-consent', 'declined');
        banner.style.display = 'none';
    };
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

            // Parameter für EmailJS zusammenbauen — alle Felder einzeln (kein HTML)
            var params = {
                subject: '',
                name: fd.get('name') || '',
                email: fd.get('email') || '',
                telefon: fd.get('telefon') || '',
                message: fd.get('message') || '',
                betreff: '',
                flugart: '',
                zusatzzeit: '',
                wert: '',
                empfaenger: '',
                anlass: '',
                interesse: '',
                wunschtermin: ''
            };

            // CC-Empfänger: immer Dan, plus je nach Formular/Betreff weitere
            var ccList = ['dan@segelfliegen-altdorf.de'];

            if (formType === 'kontakt') {
                params.subject = 'Kontaktanfrage: ' + (fd.get('betreff') || 'Allgemein');
                params.betreff = fd.get('betreff') || 'Allgemein';
                if (params.betreff === 'Ausbildung') {
                    ccList.push('Jeremy.Wolfsteiner@gmail.com');
                }

            } else if (formType === 'gutschein') {
                params.subject = 'Neue Gutschein-Bestellung';
                params.message = fd.get('grusstext') || '(kein Grußtext)';
                params.flugart = fd.get('flugart') || '';
                params.zusatzzeit = (fd.get('zusatzzeit') || '0') + ' Min.';
                params.wert = (fd.get('wert') || '') + ' €';
                params.empfaenger = fd.get('empfaenger') || '';
                params.anlass = fd.get('anlass') || '';
                params.zustellung = fd.get('zustellung') || '';
                ccList.push('joergsperber@arcor.de');

            } else if (formType === 'gastflug') {
                params.subject = 'Neue Gastflug-Anfrage';
                params.interesse = fd.get('interest') || '';
                params.wunschtermin = fd.get('date') || '';
            }

            params.cc_email = ccList.join(',');

            try {
                // Benachrichtigung an den Verein senden
                await emailjs.send('service_cd14twj', 'template_eakr6dl', params);

                // Bei Gutschein: Auto-Reply an Kunden + Firestore-Speicherung
                if (formType === 'gutschein') {
                    // EPC-QR-Code URL für Auto-Reply E-Mail
                    var replyWert = (fd.get('wert') || '').replace(',', '.');
                    var replyName = fd.get('name') || '';
                    var replyEpcData = 'BCD\n002\n1\nSCT\nGENODEF1HSB\nSegelflieger im Post SV Nürnberg\nDE20760614820004555554\nEUR' + replyWert + '\n\n\nGutschein ' + replyName;
                    var replyQrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(replyEpcData);
                    var replyParams = {
                        name: fd.get('name') || '',
                        email: fd.get('email') || '',
                        flugart: fd.get('flugart') || '',
                        empfaenger: fd.get('empfaenger') || '',
                        wert: fd.get('wert') || '',
                        zustellung: fd.get('zustellung') || '',
                        qr_url: replyQrUrl
                    };
                    // wert ohne € für Auto-Reply (Template fügt es selbst hinzu)
                    await emailjs.send('service_cd14twj', 'template_ygdqime', replyParams);

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
                            zustellung: fd.get('zustellung') || ''
                        });
                    }
                }

                // Erfolgsmeldung anzeigen
                if (formType === 'gutschein') {
                    var gWert = fd.get('wert') || '';
                    var gName = fd.get('name') || '';
                    var gZustellung = fd.get('zustellung') || '';
                    var istAbholung = gZustellung.indexOf('Abholung') !== -1;

                    if (istAbholung) {
                        form.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
                            + '<div style="font-size: 3rem; margin-bottom: 15px;">🎁</div>'
                            + '<h3 style="color: var(--primary);">Gutschein-Bestellung eingegangen!</h3>'
                            + '<p style="color: var(--text-light); margin-bottom: 25px;">Vielen Dank für deine Bestellung!</p>'
                            + '<div style="background: var(--bg-light); border: 2px solid var(--primary); border-radius: var(--radius); padding: 25px; display: inline-block; text-align: left; max-width: 400px;">'
                            + '<p style="margin: 0; font-weight: 600; text-align: center;">Abholung in 90518 Altdorf</p>'
                            + '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Adresse:</strong> Jörg Sperber, Schulstraße 18, 90518 Altdorf</p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>Standort:</strong> <a href="https://maps.app.goo.gl/p4YEwmERAwFkmy479" target="_blank" rel="noopener noreferrer" style="color: var(--primary);">In Google Maps öffnen</a></p>'
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>Telefon:</strong> <a href="tel:+4915117250329" style="color: var(--primary);">+49 1511 7250329</a></p>'
                            + (gWert ? '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Betrag:</strong> ' + gWert + ' € (Barzahlung vor Ort)</p>' : '')
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
                            + (gWert ? '<p style="margin: 12px 0 0; font-size: 0.95rem;"><strong>Betrag:</strong> ' + gWert + ' €</p>' : '')
                            + '<p style="margin: 6px 0 0; font-size: 0.95rem;"><strong>Verwendungszweck:</strong> Gutschein ' + gName + '</p>'
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
                } else {
                    form.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
                        + '<div style="font-size: 3rem; margin-bottom: 15px;">✅</div>'
                        + '<h3 style="color: var(--primary);">Nachricht gesendet!</h3>'
                        + '<p style="color: var(--text-light);">Vielen Dank! Wir melden uns so schnell wie möglich bei Ihnen.</p>'
                        + '</div>';
                }
            } catch (err) {
                btn.textContent = originalText;
                btn.disabled = false;
                const errorDiv = document.createElement('div');
                errorDiv.className = 'form-error';
                errorDiv.style.cssText = 'color:#d63030; background:#fff5f5; border:1px solid #fed7d7; padding:12px 15px; border-radius:8px; margin-top:15px; text-align:center; font-size:0.9rem;';
                errorDiv.textContent = 'Es gab einen Fehler beim Senden. Bitte versuche es später erneut oder schreib uns per E-Mail.';
                form.appendChild(errorDiv);
            }
        });
    });
}

function initFavicon() {
    const faviconPath = 'images/logo.png';
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = faviconPath;
    link.type = 'image/png';
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
            caption.innerHTML = alt || '';
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

        const showSlides = (n) => {
            if (n >= slides.length) slideIndex = 0;
            if (n < 0) slideIndex = slides.length - 1;
            for (let i = 0; i < slides.length; i++) slides[i].style.display = "none";
            slides[slideIndex].style.display = "block";
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
        startAutoPlay();
    });

}

