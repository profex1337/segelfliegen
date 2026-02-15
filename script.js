const headerHTML = `
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
            <a href="https://www.facebook.com/Segelflieger.PostSV/?locale=de_DE" target="_blank" title="Facebook" class="header-social-link" aria-label="Besuchen Sie uns auf Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="https://www.instagram.com/segelflieger.psv/?hl=de" target="_blank" title="Instagram" class="header-social-link" aria-label="Folgen Sie uns auf Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://www.youtube.com/channel/UCPiG85TTftKcU4jr4Vjuhvg" target="_blank" title="YouTube" class="header-social-link" aria-label="Unser YouTube Kanal">
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
                <a href="mailto:info@segelfliegenaltdorf.de" style="display: block;">📧 info@segelfliegenaltdorf.de</a>
            </div>
            
            <div class="footer-socials">
                <a href="https://www.facebook.com/Segelflieger.PostSV/?locale=de_DE" target="_blank" title="Facebook" aria-label="Folgen Sie uns auf Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="https://www.instagram.com/segelflieger.psv/?hl=de" target="_blank" title="Instagram" aria-label="Folgen Sie uns auf Instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="https://www.youtube.com/channel/UCPiG85TTftKcU4jr4Vjuhvg" target="_blank" title="YouTube" aria-label="Besuchen Sie unseren YouTube Kanal">
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
        <a href="intern.html" id="nav-intern" style="margin:0 10px; color: #b0b0b0;">Intern</a>
        <br><br>
        &copy; 2026 Segelflugplatz Altdorf-Hagenhausen
    </div>
</div>

<img src="images/spn_flieger.png" alt="Segelflieger" class="footer-bg-flieger">

<div id="login-modal" class="modal" style="display: none;">
    <div class="modal-content admin-login-card">
        <span class="modal-close" id="login-close">&times;</span>
        <h3>Mitarbeiter & Mitglieder Login</h3>
        <p>Bitte geben Sie Ihr Passwort ein:</p>
        <form id="admin-login-form">
            <input type="password" id="admin-password-input" placeholder="Passwort" autocomplete="current-password">
            <p id="login-error" style="color: red; font-size: 0.8rem; display: none;">Falsches Passwort!</p>
            <button type="submit" id="admin-login-btn" class="btn" style="width: 100%; margin-top: 10px;">Anmelden</button>
        </form>
    </div>
</div>

<aside id="reviews-sidebar" class="reviews-sidebar">
    <div class="reviews-header">
        <h3>Google Rezensionen</h3>
        <span id="close-reviews" class="close-reviews">&times;</span>
    </div>
            <div class="reviews-summary">
                <div class="big-rating">4.9</div>
                <div class="stars-gold">★★★★★</div>
                <p>Basierend auf Google Maps</p>
                                                    <a href="https://www.google.de/maps/place/Segelflugplatz+Altdorf-Hagenhausen+Post-SV+N%C3%BCrnberg/@49.3902569,11.4256224,247m/data=!3m1!1e3!4m6!3m5!1s0x410c9f6d5ba244cb:0x8d005d5cdc3b2aca!8m2!3d49.3899301!4d11.4267085!16s%2Fg%2F11b6g8prkb!5m1!1e1?entry=ttu&g_ep=EgoyMDI2MDIwNC4wIKXMDSoASAFQAw%3D%3D" target="_blank" class="btn-review-google">
                                                        Auf Google bewerten
                                                    </a>            </div>    <div class="reviews-list" id="reviews-list-container"></div>
</aside>
<div id="reviews-overlay" class="reviews-overlay"></div>
`;

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
            date: "vor 11 Monaten", 
            text: "War heute mit meinem Enkel am Flugplatz. Ganz liebe Leute!!!! Uns wurde alles gezeigt und Milo durfte sich sogar in ein Segelflugzeug setzen.<br>Werden im Sommer gerne nochmal kommen.<br>VG Michael" 
        },
        { 
            name: "A. Delino", 
            rating: 5, 
            date: "vor einem Jahr", 
            text: "Tolle zuvorkommende freundliche Mannschaft, die mit Begeisterung ihren Gästen das Segelfliegen zeigen. Kaffee und Kuchen gibt's am Wochenende noch oben drauf. Einfach herrlich und genial." 
        },
        { 
            name: "Gizi Silberhorn", 
            rating: 5, 
            date: "vor 3 Jahren", 
            text: "War nur zur Geburtstagsfeier dort. Hab gleich ne Einladung von nem Mitglied zum Flugtag Anfang August bekommen, finde ich echt nett" 
        },
        { 
            name: "Kevin Fritsch", 
            rating: 5, 
            date: "vor 6 Jahren", 
            text: "Super Flugplatz und ganz liebe Flieger!<br>Man fühlt sich \"wie daheim\", man wird - egal ob per Flugzeug oder zu Fuß - sehr herzlich aufgenommen!<br><br>Auf jeden Fall einen Besuch wert! ;-)" 
        },
        { 
            name: "Smolto van der Bruggenkötter", 
            rating: 5, 
            date: "vor 6 Jahren", 
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
