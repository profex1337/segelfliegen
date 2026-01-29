/* ---------------------------------------------------------------------------------------
   SCRIPT.JS - ZENTRALE STEUERUNG FÜR HEADER, FOOTER & UI
--------------------------------------------------------------------------------------- */

// 1. HEADER & FOOTER HTML TEMPLATES
// Hier wurde der Burger-Button und die IDs hinzugefügt
const headerHTML = `
<div class="container header-inner">
    <div class="logo">
        <a href="index.html">
            <img src="images/logo.png" alt="Segelflugplatz Altdorf" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-weight:800; font-size:1.2rem; color:#0f3460; line-height:1.2; display:block;\\'>Segelflugplatz<br>Altdorf</span>'">
        </a>
    </div>

    <!-- BURGER BUTTON (NEU) -->
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
    
    // --- Header einfügen ---
    const headerElement = document.getElementById('main-header');
    if (headerElement) {
        headerElement.innerHTML = headerHTML;
        
        // Aktiven Link markieren
        const currentPage = window.location.pathname.split("/").pop() || 'index.html';
        headerElement.querySelectorAll('.nav-menu a').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });

        // --- BURGER MENU LOGIK (NEU) ---
        const hamburger = document.getElementById('hamburger-btn');
        const navMenu = document.getElementById('nav-menu');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('open');
                navMenu.classList.toggle('active');
            });

            // Menü schließen bei Klick auf Link
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

    // --- UI Funktionen starten ---
    initLightbox();
    initBackToTop();
    initSlideshows();

    // --- Admin Toggle (Falls auf der Seite vorhanden) ---
    const adminToggle = document.getElementById('admin-toggle');
    const adminPanel = document.getElementById('admin-panel');
    if(adminToggle && adminPanel) {
        adminToggle.addEventListener('click', () => {
            adminPanel.classList.toggle('active');
        });
    }
});

// 3. UI HELFER FUNKTIONEN

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