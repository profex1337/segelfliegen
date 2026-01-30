/* ---------------------------------------------------------------------------------------
   SCRIPT.JS - ZENTRALE STEUERUNG FÜR HEADER, FOOTER, UI & FAVICON
--------------------------------------------------------------------------------------- */

// 1. HEADER & FOOTER HTML TEMPLATES
const headerHTML = `
<div class="container header-inner">
    <div class="logo">
        <a href="index.html">
            <img src="images/logo.png" alt="Segelflugplatz Altdorf" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-weight:800; font-size:1.2rem; color:#0f3460; line-height:1.2; display:block;\\'>Segelflugplatz<br>Altdorf</span>'">
        </a>
    </div>

    <div class="hamburger" id="hamburger-btn">
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
        
        <!-- Social Media Icons im Header -->
        <div class="header-socials">
            <a href="https://www.facebook.com/Segelflieger.PostSV/?locale=de_DE" target="_blank" title="Facebook" class="header-social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="https://www.instagram.com/segelflieger.psv/?hl=de" target="_blank" title="Instagram" class="header-social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://www.youtube.com/channel/UCPiG85TTftKcU4jr4Vjuhvg" target="_blank" title="YouTube" class="header-social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            </a>
        </div>
    </nav>
</div>
`;

const footerHTML = `
<div class="container" style="text-align: center;">
    <h4 style="color: white; margin-bottom: 15px;">Segelflieger im Post-SV Nürnberg e.V.</h4>
    <p style="color: #b0b0b0; line-height: 1.6;">
        <strong>Dan Mollenhauer</strong><br>
        Kastanienweg 6<br>
        92348 Berg bei Neumarkt
    </p>
    <p style="color: #b0b0b0;">
        <a href="tel:+499189310" style="text-decoration: none; color: #b0b0b0;">📞 +49 9189 310</a> &nbsp;|&nbsp; 
        <a href="mailto:info@segelfliegen-altdorf.de" style="text-decoration: none; color: #b0b0b0;">📧 info@segelfliegen-altdorf.de</a>
    </p>

    <!-- Social Media Icons (Footer) -->
    <div class="social-icons" style="margin-top: 25px; margin-bottom: 10px;">
        <a href="https://www.facebook.com/Segelflieger.PostSV/?locale=de_DE" target="_blank" title="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
        </a>
        <a href="https://www.instagram.com/segelflieger.psv/?hl=de" target="_blank" title="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        </a>
        <a href="https://www.youtube.com/channel/UCPiG85TTftKcU4jr4Vjuhvg" target="_blank" title="YouTube">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
        </a>
    </div>

    <div class="footer-bottom" style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 20px;">
        <a href="impressum.html" style="margin:0 10px; color: #b0b0b0;">Impressum</a> | 
        <a href="datenschutz.html" style="margin:0 10px; color: #b0b0b0;">Datenschutz</a>
        <br><br>
        &copy; 2026 Segelflugplatz Altdorf-Hagenhausen
    </div>
</div>
`;

// 2. HAUPT-INITIALISIERUNG
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Favicon automatisch einfügen ---
    initFavicon();

    // --- Header einfügen ---
    const headerElement = document.getElementById('main-header');
    if (headerElement) {
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
                hamburger.classList.toggle('open');
                navMenu.classList.toggle('active');
            });

            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('open');
                    navMenu.classList.remove('active');
                });
            });
        }
    }

    // --- Footer einfügen ---
    const footerElement = document.getElementById('main-footer');
    if (footerElement) {
        footerElement.innerHTML = footerHTML;
    }

    initLightbox();
    initBackToTop();
    initSlideshows();
    
    // DSGVO Cookie Banner starten
    initCookieConsent();

    // Maus Flugzeug starten
    initMousePlane();
});

// 3. UI HELFER FUNKTIONEN

// NEU: Maus Flugzeug Animation (Zentral für alle Seiten)
function initMousePlane() {
    // Nur bei Maus-Geräten aktivieren (nicht auf Touchscreens)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    // HTML in den Body injizieren
    const planeHTML = `
        <div id="mouse-plane">
            <div class="plane-trail" id="plane-trail"></div>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21,16V14L13,9V3.5A1.5,1.5,0,0,0,11.5,2A1.5,1.5,0,0,0,10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z"/>
            </svg>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', planeHTML);

    const plane = document.getElementById('mouse-plane');
    const trail = document.getElementById('plane-trail');
    plane.style.display = 'block';

    let mouseX = -100, mouseY = -100;
    let planeX = -100, planeY = -100;

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function movePlane() {
        // Weiche Bewegung zum Mauszeiger (Trägheit)
        planeX += (mouseX - planeX) * 0.15;
        planeY += (mouseY - planeY) * 0.15;
        
        const dx = mouseX - planeX;
        const dy = mouseY - planeY;
        
        // Winkel berechnen (offset 90deg da Icon nach oben zeigt)
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Geschwindigkeit berechnen
        const speed = Math.sqrt(dx*dx + dy*dy);
        
        // Schweif-Länge an Geschwindigkeit anpassen (Max 80px)
        const trailLen = Math.min(speed * 2.5, 80); 
        
        // Transformation anwenden
        plane.style.transform = `translate(${planeX}px, ${planeY}px) rotate(${angle + 90}deg)`;
        
        // Schweif aktualisieren
        trail.style.height = trailLen + 'px';
        trail.style.opacity = Math.min(speed / 15, 0.6); // Sichtbarer bei Bewegung
        
        requestAnimationFrame(movePlane);
    }
    movePlane();
}

// Cookie Banner Logik
function initCookieConsent() {
    if (localStorage.getItem('dsgvo-consent')) return;

    const bannerHTML = `
    <div id="cookie-banner" class="cookie-banner">
        <div class="cookie-content">
            <h3>🍪 Datenschutzeinstellungen</h3>
            <p>
                Wir nutzen Cookies und externe Dienste (Google Maps, YouTube, Firebase), um Inhalte anzuzeigen. 
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
    };

    document.getElementById('cookie-decline').onclick = () => {
        localStorage.setItem('dsgvo-consent', 'declined');
        banner.style.display = 'none';
    };
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
        window.addEventListener('scroll', () => {
            btn.style.display = (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) ? "block" : "none";
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

        showSlides(slideIndex);
        startAutoPlay();
    });
}