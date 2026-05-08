import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1X5H3LOGKOSrq59_am4YnkISyOyEUAg4",
  authDomain: "segelfliegen.firebaseapp.com",
  projectId: "segelfliegen",
  storageBucket: "segelfliegen.firebasestorage.app",
  messagingSenderId: "288557586639",
  appId: "1:288557586639:web:984329930e12601b04bfba",
  measurementId: "G-CKXEVQPL0J"
};

let app, auth, db;
let collectionPath = null; 
let editingId = null;

// === XSS-Schutz: HTML-Sonderzeichen escapen ===
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// === Bild-Upload: Komprimierung & GitHub ===

async function compressImage(file, maxWidth = 1200, quality = 0.80) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            let { width, height } = img;
            if (width > maxWidth) {
                height = Math.round(height * maxWidth / width);
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob(resolve, 'image/webp', quality);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Bild konnte nicht geladen werden. Bitte ein gültiges Bildformat verwenden.'));
        };
        img.src = objectUrl;
    });
}

async function uploadToGitHub(blob, filename) {
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js');
    const { getApp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
    const functions = getFunctions(getApp(), 'europe-west1');
    const uploadFn = httpsCallable(functions, 'uploadImage');

    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });

    const result = await uploadFn({ base64, filename });
    if (!result.data.success) throw new Error('Upload fehlgeschlagen');
    return result.data.url;
}

async function deleteFromGitHub(imageUrl) {
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js');
    const { getApp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
    const functions = getFunctions(getApp(), 'europe-west1');
    const deleteFn = httpsCallable(functions, 'deleteImage');
    await deleteFn({ imageUrl });
}

async function initFirebase() {
    const newsContainer = document.getElementById('dynamic-news-list');
    const pricesContainer = document.getElementById('dynamic-prices-list');
    const pricesAdmin = document.getElementById('prices-admin-list');
    const aircraftAdminList = document.getElementById('aircraft-admin-list');
    const aircraftPublicList = document.getElementById('dynamic-aircraft-list');
    const voucherList = document.getElementById('voucher-list');
    const eventsAdminList = document.getElementById('events-admin-list');
    const eventsPublicList = document.getElementById('dynamic-events-list');

    // Gutschein-Bestellformular auf mitfliegen.html erkennen
    const gutscheinForm = document.querySelector('form[data-emailjs="gutschein"]');
    const hasGutscheinForm = !!gutscheinForm;

    if (!newsContainer && !pricesContainer && !pricesAdmin && !aircraftAdminList && !aircraftPublicList && !voucherList && !hasGutscheinForm && !eventsAdminList && !eventsPublicList) return;

    try {
        if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            collectionPath = (dbRef) => collection(dbRef, 'news');
        } else if (typeof __firebase_config !== 'undefined') {
            const fbConfig = JSON.parse(__firebase_config);
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            app = initializeApp(fbConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            collectionPath = (dbRef) => collection(dbRef, 'artifacts', appId, 'public', 'data', 'news');
        } else {
            throw new Error("Fehler");
        }

        // Globale Funktion zum Speichern von Gutschein-Bestellungen (auch für anonyme User)
        window.saveVoucherOrder = async (orderData) => {
            try {
                const orderRef = collection(db, 'voucherOrders');
                await addDoc(orderRef, {
                    ...orderData,
                    status: 'neu',
                    timestamp: Date.now()
                });
            } catch (e) {
                console.error('Gutschein-Bestellung speichern fehlgeschlagen:', e);
            }
        };

        // Globale Funktion: KI-Grußtext über Cloud Function generieren (auch für anonyme User)
        window.callGenerateGreeting = async (params) => {
            const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js');
            const { getApp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
            const functions = getFunctions(getApp(), 'europe-west1');
            const fn = httpsCallable(functions, 'generateGreetingText');
            const result = await fn(params);
            return result.data;
        };

        if (newsContainer) await startNewsLogic();
        if (pricesContainer || pricesAdmin) await startPricesLogic();
        if (aircraftAdminList || aircraftPublicList) await startAircraftLogic();
        if (voucherList) await startVoucherLogic();
        if (eventsAdminList || eventsPublicList) await startEventsLogic();

    } catch (e) {
        if(newsContainer) {
            newsContainer.innerHTML = `
                <div class="news-item">
                    <span class="news-date">Hinweis</span>
                    <h3>Offline Modus</h3>
                    <p>Die Neuigkeiten konnten nicht geladen werden.</p>
                </div>`;
        }
    }
}

async function startNewsLogic() {
    const newsContainer = document.getElementById('dynamic-news-list');
    const adminToggle = document.getElementById('admin-toggle');
    const adminPanel = document.getElementById('admin-panel');
    const newsForm = document.getElementById('news-form');
    
    
    const logoutBtn = document.getElementById('admin-logout-btn');
    const cancelBtn = document.getElementById('news-cancel-btn');
    const submitBtn = document.getElementById('news-submit-btn');
    const formHeadline = document.getElementById('form-headline');

    
    const displayImage = document.getElementById('news-display-image');

    
    const loginModal = document.getElementById('login-modal');
    const loginClose = document.getElementById('login-close');
    const passwordInput = document.getElementById('admin-password-input');
    const loginError = document.getElementById('login-error');
    const loginFormTag = document.getElementById('admin-login-form');

    // Bild-Vorschau beim Datei-Auswählen (mehrere Dateien)
    const fileInputEl = document.getElementById('news-image-file');
    if (fileInputEl) {
        fileInputEl.addEventListener('change', () => {
            const container = document.getElementById('image-preview-container');
            const preview = document.getElementById('image-preview');
            const statusEl = document.getElementById('image-upload-status');
            if (fileInputEl.files.length > 0) {
                const f = fileInputEl.files[0];
                if (preview) preview.src = URL.createObjectURL(f);
                if (container) container.style.display = 'block';
                const count = fileInputEl.files.length;
                let totalSize = 0;
                for (let i = 0; i < count; i++) totalSize += fileInputEl.files[i].size;
                if (statusEl) statusEl.textContent = count + ' Bild(er) ausgewählt (' + (totalSize / 1024).toFixed(0) + ' KB) – werden beim Speichern komprimiert & hochgeladen';
            } else {
                if (container) container.style.display = 'none';
            }
        });
    }

    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && (!firebaseConfig || Object.keys(firebaseConfig).length === 0)) {
            await signInWithCustomToken(auth, __initial_auth_token);
        }
    } catch (e) {
    }

    onAuthStateChanged(auth, (user) => {
        const isAdmin = user && !user.isAnonymous;
        toggleAdminUI(isAdmin);
        handleInternPageVisibility(isAdmin);

        if (!user) {
            signInAnonymously(auth).catch((err) => {
                console.error('Anonyme Anmeldung fehlgeschlagen:', err);
            });
            return;
        }

        const newsCollection = collectionPath(db);

        onSnapshot(newsCollection, (snapshot) => {
            let newsItems = [];
            snapshot.forEach((doc) => {
                newsItems.push({ id: doc.id, ...doc.data() });
            });
            
            newsItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            const isCardMode = newsContainer.classList.contains('news-card-grid');

            // Hilfsfunktion: Bilder-Array aus imageUrls oder imageUrl erstellen (Abwärtskompatibilität)
            function getImages(item) {
                if (item.imageUrls && item.imageUrls.length > 0) return item.imageUrls;
                if (item.imageUrl) return [item.imageUrl];
                return [];
            }

            // Hilfsfunktion: Karussell-HTML für mehrere Bilder erzeugen
            function buildCarouselHTML(images, alt) {
                if (images.length === 0) return '';
                if (images.length === 1) {
                    return '<div class="news-card-img">'
                        + '<img src="' + images[0] + '" alt="' + (alt || '') + '" class="zoomable" onerror="this.closest(\'.news-card-img\').remove()">'
                        + '</div>';
                }
                let slides = '';
                let dots = '';
                for (let i = 0; i < images.length; i++) {
                    slides += '<div class="news-carousel-slide"><img src="' + images[i] + '" alt="' + (alt || '') + '" class="zoomable"></div>';
                    dots += '<button class="news-carousel-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></button>';
                }
                return '<div class="news-card-img">'
                    + '<div class="news-carousel" data-index="0">'
                    + '<div class="news-carousel-track">' + slides + '</div>'
                    + '<button class="news-carousel-btn prev" aria-label="Vorheriges Bild">&#10094;</button>'
                    + '<button class="news-carousel-btn next" aria-label="N\u00e4chstes Bild">&#10095;</button>'
                    + '<div class="news-carousel-dots">' + dots + '</div>'
                    + '</div></div>';
            }

            // Karussell-Interaktivität initialisieren (Klick + Swipe)
            function initCarousels(container) {
                container.querySelectorAll('.news-carousel').forEach(function(carousel) {
                    const track = carousel.querySelector('.news-carousel-track');
                    const dots = carousel.querySelectorAll('.news-carousel-dot');
                    const total = carousel.querySelectorAll('.news-carousel-slide').length;
                    let current = 0;

                    function goTo(idx) {
                        if (idx < 0) idx = total - 1;
                        if (idx >= total) idx = 0;
                        current = idx;
                        track.style.transform = 'translateX(-' + (current * 100) + '%)';
                        dots.forEach(function(d, i) { d.classList.toggle('active', i === current); });
                    }

                    var prevBtn = carousel.querySelector('.news-carousel-btn.prev');
                    if (prevBtn) prevBtn.addEventListener('click', function(e) { e.stopPropagation(); goTo(current - 1); });
                    var nextBtn = carousel.querySelector('.news-carousel-btn.next');
                    if (nextBtn) nextBtn.addEventListener('click', function(e) { e.stopPropagation(); goTo(current + 1); });
                    dots.forEach(function(d) { d.addEventListener('click', function(e) { e.stopPropagation(); goTo(parseInt(d.dataset.index)); }); });

                    // Keyboard-Navigation
                    carousel.setAttribute('tabindex', '0');
                    carousel.setAttribute('role', 'region');
                    carousel.setAttribute('aria-label', 'Bildergalerie');
                    carousel.addEventListener('keydown', function(e) {
                        if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
                        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
                    });

                    // Touch-Swipe
                    let startX = 0;
                    let diffX = 0;
                    carousel.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; diffX = 0; }, { passive: true });
                    carousel.addEventListener('touchmove', function(e) { diffX = e.touches[0].clientX - startX; }, { passive: true });
                    carousel.addEventListener('touchend', function() {
                        if (Math.abs(diffX) > 40) goTo(diffX > 0 ? current - 1 : current + 1);
                    });
                });
            }

            newsContainer.innerHTML = '';
            if (newsItems.length === 0) {
                newsContainer.innerHTML = '<p style="text-align:center;">Keine Nachrichten gefunden.</p>';
            } else {
                const isPublicPage = !document.getElementById('intern-content');
                const maxVisible = (isCardMode && isPublicPage) ? 4 : Infinity;

                newsItems.forEach(function(item, index) {
                    const div = document.createElement('div');
                    const adminDisplay = isAdmin ? 'flex' : 'none';
                    const images = getImages(item);
                    const isFeatured = isCardMode && isPublicPage && index === 0 && images.length > 0;

                    if (isCardMode) {
                        // Featured (erstes Item) oder normales Card-Layout
                        div.className = isFeatured ? 'news-featured' : 'news-card';
                        div.innerHTML =
                            (isFeatured
                                ? '<div class="news-card-body">'
                                    + '<div class="admin-controls" style="float:right; display:' + adminDisplay + '; gap: 5px; align-items: center; margin-bottom: 8px;">'
                                        + '<button class="edit-btn" style="background:#e94560; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Ändern</button>'
                                        + '<button class="delete-btn" style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Löschen</button>'
                                    + '</div>'
                                    + '<span class="news-date">' + escapeHTML(item.date) + '</span>'
                                    + '<h3>' + escapeHTML(item.title || 'Kein Titel') + '</h3>'
                                    + '<p style="white-space: pre-wrap;">' + escapeHTML(item.text) + '</p>'
                                + '</div>'
                                + buildCarouselHTML(images, escapeHTML(item.title))
                                : buildCarouselHTML(images, escapeHTML(item.title))
                                    + '<div class="news-card-body">'
                                        + '<div class="admin-controls" style="float:right; display:' + adminDisplay + '; gap: 5px; align-items: center; margin-bottom: 8px;">'
                                            + '<button class="edit-btn" style="background:#e94560; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Ändern</button>'
                                            + '<button class="delete-btn" style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Löschen</button>'
                                        + '</div>'
                                        + '<span class="news-date">' + escapeHTML(item.date) + '</span>'
                                        + '<h3>' + escapeHTML(item.title || 'Kein Titel') + '</h3>'
                                        + '<p style="white-space: pre-wrap;">' + escapeHTML(item.text) + '</p>'
                                    + '</div>'
                            );
                    } else {
                        // Listen-Layout für intern.html
                        div.className = 'news-item';
                        if (item.imageUrl) {
                            div.setAttribute('data-has-image', 'true');
                        }
                        div.innerHTML = `
                            <!-- Buttons Container -->
                            <div class="admin-controls" style="float:right; display:${adminDisplay}; gap: 5px; align-items: center;">
                                <button class="edit-btn" style="background:#e94560; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Ändern</button>
                                <button class="delete-btn" style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Löschen</button>
                            </div>
                            <span class="news-date">${escapeHTML(item.date) || ''}</span>
                            <h3>${escapeHTML(item.title) || 'Kein Titel'}</h3>
                            <p style="white-space: pre-wrap;">${escapeHTML(item.text) || ''}</p>
                        `;

                        if (item.imageUrl && displayImage) {
                            div.addEventListener('mouseenter', () => {
                                if (!displayImage.getAttribute('data-default-src')) {
                                    displayImage.setAttribute('data-default-src', displayImage.src);
                                }
                                // Smooth Fade-Effect
                                displayImage.classList.add('fade-out');
                                setTimeout(() => {
                                    displayImage.src = item.imageUrl;
                                    displayImage.classList.remove('fade-out');
                                }, 300);
                            });

                            div.addEventListener('mouseleave', () => {
                                const defaultSrc = displayImage.getAttribute('data-default-src') || 'images/news.png';
                                displayImage.classList.add('fade-out');
                                setTimeout(() => {
                                    displayImage.src = defaultSrc;
                                    displayImage.classList.remove('fade-out');
                                }, 300);
                            });
                        }
                    }

                    const delBtn = div.querySelector('.delete-btn');
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteNewsItem(item.id, images);
                    }

                    const editButton = div.querySelector('.edit-btn');
                    editButton.onclick = (e) => {
                        e.stopPropagation();
                        loadIntoForm(item);
                    }

                    // Auf der öffentlichen Startseite: Items ab Position 4 ausblenden
                    if (index >= maxVisible) {
                        div.classList.add('news-hidden');
                        div.style.display = 'none';
                    }

                    newsContainer.appendChild(div);
                });

                // "Alle Neuigkeiten anzeigen"-Button auf der Startseite
                if (isCardMode && isPublicPage && newsItems.length > maxVisible) {
                    const showMoreBtn = document.createElement('div');
                    showMoreBtn.className = 'news-show-more';
                    showMoreBtn.style.cssText = 'grid-column: 1 / -1; text-align: center; margin-top: 10px;';
                    showMoreBtn.innerHTML = '<button class="btn" style="background: transparent; color: var(--primary); border: 2px solid var(--primary);">Alle Neuigkeiten anzeigen ↓</button>';
                    showMoreBtn.querySelector('button').addEventListener('click', function() {
                        newsContainer.querySelectorAll('.news-hidden').forEach(function(el) {
                            el.style.display = '';
                            el.classList.remove('news-hidden');
                        });
                        showMoreBtn.remove();
                    });
                    newsContainer.appendChild(showMoreBtn);
                }

                // Karussell-Interaktivität initialisieren
                initCarousels(newsContainer);
            }
        });

        
        if (newsForm) {
            newsForm.onsubmit = async (e) => {
                e.preventDefault();
                if (auth.currentUser?.isAnonymous) {
                    alert("Sie haben keine Berechtigung (Gast-Modus). Bitte einloggen.");
                    return;
                }

                const titleVal = document.getElementById('news-title').value;
                const dateVal = document.getElementById('news-date').value;
                const textVal = document.getElementById('news-text').value;

                // Bilder: Neue Dateien hochladen und zu vorhandenen URLs hinzufügen
                const fileEl = document.getElementById('news-image-file');
                const imageUrlsHidden = document.getElementById('news-image-url');
                let existingUrls = [];
                try { existingUrls = JSON.parse(imageUrlsHidden.value || '[]'); } catch(e) {
                    // Abwärtskompatibilität: einzelne URL
                    if (imageUrlsHidden.value) existingUrls = [imageUrlsHidden.value];
                }

                if (fileEl && fileEl.files.length > 0) {
                    const statusEl = document.getElementById('image-upload-status');
                    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Bilder werden hochgeladen…'; }
                    try {
                        for (let i = 0; i < fileEl.files.length; i++) {
                            if (statusEl) statusEl.textContent = 'Lade Bild ' + (i + 1) + ' von ' + fileEl.files.length + ' hoch…';
                            const compressed = await compressImage(fileEl.files[i]);
                            const safeName = 'news_' + Date.now() + '_' + i + '.webp';
                            const url = await uploadToGitHub(compressed, safeName);
                            existingUrls.push(url);
                        }
                        if (imageUrlsHidden) imageUrlsHidden.value = JSON.stringify(existingUrls);
                        if (statusEl) statusEl.textContent = fileEl.files.length + ' Bild(er) hochgeladen';
                    } catch (uploadErr) {
                        alert('Bild-Upload fehlgeschlagen: ' + uploadErr.message);
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editingId ? 'Änderungen speichern' : 'Veröffentlichen'; }
                        if (statusEl) statusEl.textContent = '';
                        return;
                    } finally {
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editingId ? 'Änderungen speichern' : 'Veröffentlichen'; }
                    }
                }

                try {
                    const dataToSave = {
                        title: titleVal,
                        date: dateVal,
                        text: textVal,
                        imageUrl: existingUrls.length > 0 ? existingUrls[0] : '',
                        imageUrls: existingUrls
                    };

                    if (editingId) {
                        let collectionName = firebaseConfig && Object.keys(firebaseConfig).length > 0 ? 'news' : null;
                        let docRef;
                        if(!collectionName) {
                            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                            docRef = doc(db, 'artifacts', appId, 'public', 'data', 'news', editingId);
                        } else {
                            docRef = doc(db, collectionName, editingId);
                        }
                        await updateDoc(docRef, dataToSave);
                        alert("Änderungen gespeichert!");
                    } else {
                        dataToSave.timestamp = Date.now();
                        await addDoc(newsCollection, dataToSave);
                    }
                    resetForm();

                } catch (err) {
                    alert("Fehler: " + err.message);
                }
                };
            }
                        });
                    
                        function toggleAdminUI(isAdmin) {
                            if (isAdmin) {
                                document.body.classList.add('admin-mode');
                                if(adminPanel) adminPanel.classList.add('active');
                                document.querySelectorAll('.admin-controls').forEach(el => el.style.display = 'flex');
                            } else {
                                document.body.classList.remove('admin-mode');
                                if(adminPanel) adminPanel.classList.remove('active');
                                document.querySelectorAll('.admin-controls').forEach(el => el.style.display = 'none');
                                resetForm(); 
                            }
                        }
                    
                        function loadIntoForm(item) {
                            const titleInput = document.getElementById('news-title');
                            if (!titleInput) {
                                if (confirm("Bearbeiten ist nur im internen Bereich möglich. Jetzt wechseln?")) {
                                    window.location.href = "intern.html";
                                }
                                return;
                            }

                            editingId = item.id;
                            titleInput.value = item.title;
                            document.getElementById('news-date').value = item.date;
                            document.getElementById('news-text').value = item.text;

                            // Bilder-URLs als JSON speichern (Abwärtskompatibilität)
                            const allImages = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : []);
                            document.getElementById('news-image-url').value = JSON.stringify(allImages);

                            // Datei-Input zurücksetzen, aktuelle Bilder anzeigen
                            const fileEl2 = document.getElementById('news-image-file');
                            const previewCont = document.getElementById('image-preview-container');
                            const currentInfo = document.getElementById('current-image-info');
                            const currentLink = document.getElementById('current-image-link');
                            const thumbContainer = document.getElementById('current-images-thumbs');
                            if (fileEl2) fileEl2.value = '';
                            if (previewCont) previewCont.style.display = 'none';

                            if (allImages.length > 0 && currentInfo) {
                                if (currentLink) currentLink.href = allImages[0];
                                currentInfo.style.display = 'block';
                                // Thumbnail-Vorschau der vorhandenen Bilder
                                if (thumbContainer) {
                                    thumbContainer.innerHTML = '';
                                    allImages.forEach(function(url, idx) {
                                        const wrapper = document.createElement('span');
                                        wrapper.style.cssText = 'position:relative; display:inline-block; margin:4px;';
                                        wrapper.innerHTML = '<img src="' + url + '" alt="Bild ' + (idx+1) + '" style="width:80px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #ddd;">'
                                            + '<button type="button" data-idx="' + idx + '" style="position:absolute; top:-6px; right:-6px; background:#e94560; color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer; line-height:1;">&times;</button>';
                                        wrapper.querySelector('button').addEventListener('click', function() {
                                            allImages.splice(idx, 1);
                                            document.getElementById('news-image-url').value = JSON.stringify(allImages);
                                            // Thumbnail-Liste neu rendern
                                            loadIntoForm(Object.assign({}, item, { imageUrls: allImages, imageUrl: allImages[0] || '' }));
                                        });
                                        thumbContainer.appendChild(wrapper);
                                    });
                                }
                            } else if (currentInfo) {
                                currentInfo.style.display = 'none';
                                if (thumbContainer) thumbContainer.innerHTML = '';
                            }

                            if(formHeadline) formHeadline.textContent = "Nachricht bearbeiten";
                            if(submitBtn) submitBtn.textContent = "Änderungen speichern";
                            if(cancelBtn) cancelBtn.style.display = "inline-block";
                            if(logoutBtn) logoutBtn.style.display = "none";
                            
                            if(adminPanel) adminPanel.scrollIntoView({behavior: "smooth"});
                        }
                    
                        function resetForm() {
                            editingId = null;
                            if(newsForm) newsForm.reset();

                            // Bild-Felder zurücksetzen
                            const imageUrlHidden2 = document.getElementById('news-image-url');
                            const previewCont2 = document.getElementById('image-preview-container');
                            const currentInfo2 = document.getElementById('current-image-info');
                            const thumbContainer2 = document.getElementById('current-images-thumbs');
                            if (imageUrlHidden2) imageUrlHidden2.value = '';
                            if (previewCont2) previewCont2.style.display = 'none';
                            if (currentInfo2) currentInfo2.style.display = 'none';
                            if (thumbContainer2) thumbContainer2.innerHTML = '';

                            if(formHeadline) formHeadline.textContent = "Neue Nachricht verfassen";
                            if(submitBtn) submitBtn.textContent = "Veröffentlichen";
                            if(cancelBtn) cancelBtn.style.display = "none";
                            if(logoutBtn) logoutBtn.style.display = "inline-block"; 
                        }

                        function handleInternPageVisibility(isAdmin) {
                            const internContent = document.getElementById('intern-content');
                            const loginRequired = document.getElementById('login-required');
                            const loginTrigger = document.getElementById('intern-login-trigger');

                            if (window.location.pathname.includes('intern.html')) {
                                if (isAdmin) {
                                    if(internContent) internContent.style.display = 'block';
                                    if(loginRequired) loginRequired.style.display = 'none';
                                } else {
                                    if(internContent) internContent.style.display = 'none';
                                    if(loginRequired) loginRequired.style.display = 'block';
                                }
                            }

                            if (loginTrigger) {
                                loginTrigger.onclick = () => {
                                    const modal = document.getElementById('login-modal');
                                    const pInput = document.getElementById('admin-password-input');
                                    if (modal) {
                                        modal.style.display = 'flex';
                                        if (pInput) pInput.focus();
                                    }
                                };
                            }
                        }
                    
                        if (cancelBtn) cancelBtn.onclick = resetForm;
                    
                        if (logoutBtn) {
                            logoutBtn.onclick = async () => {
                                if (confirm("Admin Modus beenden?")) {
                                    try {
                                        await signOut(auth); 
                                    } catch(e) {
                                    }
                                }
                            };
                        }
                        
                        if (adminToggle) {
                            adminToggle.addEventListener('click', () => {
                                const modal = document.getElementById('login-modal');
                                const passInput = document.getElementById('admin-password-input');
                                if (modal) {
                                    modal.style.display = 'flex';
                                    if (passInput) passInput.focus();
                                }
                            });
                        }
                    
                        const lClose = document.getElementById('login-close');
                        if (lClose) {
                            lClose.onclick = () => {
                                const modal = document.getElementById('login-modal');
                                const lError = document.getElementById('login-error');
                                const pInput = document.getElementById('admin-password-input');
                                if(modal) modal.style.display = 'none';
                                if(lError) lError.style.display = 'none';
                                if(pInput) pInput.value = '';
                            };
                        }
                    
                        const handleLogin = async () => {
                            const pInput = document.getElementById('admin-password-input');
                            const lError = document.getElementById('login-error');
                            const modal = document.getElementById('login-modal');
                            const password = pInput ? pInput.value.trim() : '';
                            const email = "info@segelfliegen-altdorf.de"; 
                    
                            if (!password) return;
                    
                            try {
                                await signInWithEmailAndPassword(auth, email, password);
                                
                                if(modal) modal.style.display = 'none';
                                if(pInput) pInput.value = '';
                                if(lError) lError.style.display = 'none';
                                
                            } catch (error) {
                                if(lError) {
                                    lError.style.display = 'block';
                                    lError.textContent = "Falsches Passwort!";
                                }
                                if(pInput) pInput.value = '';
                            }
                        };
                    
                        const lFormTag = document.getElementById('admin-login-form');
                        if (lFormTag) {
                            lFormTag.addEventListener('submit', (e) => {
                                e.preventDefault();
                                handleLogin();
                            });
                        }
                    
                        window.onclick = (event) => {
                            const modal = document.getElementById('login-modal');
                            const lError = document.getElementById('login-error');
                            const pInput = document.getElementById('admin-password-input');
                            if (event.target == modal) {
                                if(modal) modal.style.display = "none";
                                if(lError) lError.style.display = 'none';
                                if(pInput) pInput.value = '';
                            }
                        };
                    }
                    
                    async function deleteNewsItem(docId, imageUrls) {
                        if (confirm("⚠️ News-Beitrag unwiderruflich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden. Alle zugehörigen Bilder werden ebenfalls gelöscht.")) {
                            try {
                                if (auth.currentUser?.isAnonymous) {
                                    alert("Fehlende Berechtigung.");
                                    return;
                                }

                                let collectionName = firebaseConfig && Object.keys(firebaseConfig).length > 0 ? 'news' : null;
                                if(!collectionName) {
                                    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'news', docId));
                                } else {
                                    await deleteDoc(doc(db, collectionName, docId));
                                }

                                // Alle Bilder aus GitHub löschen
                                if (imageUrls && imageUrls.length > 0) {
                                    for (const url of imageUrls) {
                                        await deleteFromGitHub(url);
                                    }
                                }
                            } catch (e) {
                                alert("Löschen fehlgeschlagen");
                            }
                        }
                    }
                    
// === Preise (Gastfluggebühren) ===

let currentPriceItems = [];
let draggedPriceItem = null;
let draggedPriceEl = null;

async function startPricesLogic() {
    const pricesContainer = document.getElementById('dynamic-prices-list');
    const pricesAdminList = document.getElementById('prices-admin-list');
    const addPriceBtn = document.getElementById('add-price-btn');

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Auf Seiten ohne News-Logik: Anonym einloggen
            if (!document.getElementById('dynamic-news-list')) {
                signInAnonymously(auth).catch(() => {});
            }
            return;
        }

        const isAdmin = user && !user.isAnonymous;
        const pricesRef = collection(db, 'prices');

        onSnapshot(pricesRef, (snapshot) => {
            const items = [];
            snapshot.forEach(d => items.push({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));
            currentPriceItems = items;

            if (pricesContainer) renderPublicPrices(pricesContainer, items);
            if (pricesAdminList) renderAdminPrices(pricesAdminList, items, isAdmin);
            updateGutscheinDropdown(items);
        });
    });

    // Neuen Preis hinzufügen
    if (addPriceBtn) {
        addPriceBtn.onclick = async () => {
            if (!auth.currentUser || auth.currentUser.isAnonymous) {
                alert('Keine Berechtigung.');
                return;
            }
            try {
                await addDoc(collection(db, 'prices'), {
                    label: 'Neue Position',
                    description: 'Beschreibung eingeben',
                    price: '0,00 €',
                    order: currentPriceItems.length
                });
            } catch (e) {
                alert('Fehler: ' + e.message);
            }
        };
    }
}

function renderPublicPrices(container, items) {
    if (items.length === 0) {
        container.innerHTML = '<li style="color: var(--text-light);">Keine Preise vorhanden.</li>';
        return;
    }
    container.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = item.label || '';
        li.appendChild(strong);
        li.appendChild(document.createTextNode(' '));
        const desc = document.createElement('span');
        desc.textContent = item.description || '';
        li.appendChild(desc);
        li.appendChild(document.createTextNode(' '));
        const priceSpan = document.createElement('span');
        priceSpan.style.cssText = 'float:right; font-weight:bold; color:var(--primary);';
        priceSpan.textContent = item.price || '';
        li.appendChild(priceSpan);
        container.appendChild(li);
    });
}

// Gutschein-Dropdown dynamisch aus Firestore-Preisen befuellen
function updateGutscheinDropdown(items) {
    const select = document.getElementById('gutschein-flugart');
    if (!select || items.length === 0) return;

    // Preise aus Firestore extrahieren (Format "48,00 €" → 48)
    function parsePrice(str) {
        if (!str) return 0;
        return parseFloat(str.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    }

    // Basis-Flugarten (gutschein=true) und Zusatzzeit-Preise (perMinute=true) trennen
    const baseItems = items.filter(function(i) { return !!i.gutschein; });
    const perMinItems = items.filter(function(i) { return !!i.perMinute; });

    // Fuer jede Basis-Flugart den passenden Minutenpreis finden
    // Matching: Label des Minutenpreises enthaelt Schluesselwort der Basis-Flugart
    function findPerMin(baseLabel) {
        // Schluesselwoerter extrahieren (z.B. "Segelflug (Windenstart)" → ["segelflug"])
        // "Segelkunstflug" → ["kunstflug", "segelkunstflug"]
        const lower = baseLabel.toLowerCase();
        for (var i = 0; i < perMinItems.length; i++) {
            var pmLabel = perMinItems[i].label.toLowerCase();
            // Pruefe ob der Minutenpreis-Label ein Schluesselwort der Basis-Flugart enthaelt
            // z.B. "verlängerung segelflug" matched "segelflug (windenstart)" weil beide "segelflug" enthalten
            // z.B. "verlängerung motorsegler" matched "motorsegler"
            var pmKeywords = pmLabel.replace(/verl.ngerung\s*/i, '').trim();
            if (pmKeywords && lower.indexOf(pmKeywords) !== -1) {
                return parsePrice(perMinItems[i].price);
            }
        }
        return 0;
    }

    // Aktuelle Auswahl merken
    const currentValue = select.value;

    // Optionen neu aufbauen
    select.innerHTML = '<option value="" disabled selected>Bitte w\u00e4hlen...</option>';
    baseItems.forEach(function(item) {
        var base = parsePrice(item.price);
        var perMin = findPerMin(item.label);
        var opt = document.createElement('option');
        opt.value = item.label;
        opt.setAttribute('data-base', base);
        opt.setAttribute('data-permin', perMin);
        opt.setAttribute('data-description', item.description || '');
        if (perMin === 0) {
            opt.textContent = item.label + ' \u2014 ' + base.toFixed(2).replace('.', ',') + ' \u20AC pauschal';
        } else {
            opt.textContent = item.label + ' \u2014 ab ' + base.toFixed(2).replace('.', ',') + ' \u20AC';
        }
        select.appendChild(opt);
    });

    // Vorherige Auswahl wiederherstellen
    if (currentValue) {
        select.value = currentValue;
        if (typeof updateGutscheinWert === 'function') updateGutscheinWert();
    }
}

function renderAdminPrices(container, items, isAdmin) {
    if (!isAdmin) { container.innerHTML = ''; return; }

    container.innerHTML = '';

    if (items.length === 0) {
        const info = document.createElement('p');
        info.style.color = '#999';
        info.textContent = 'Noch keine Preise vorhanden.';
        container.appendChild(info);

        const seedBtn = document.createElement('button');
        seedBtn.className = 'btn';
        seedBtn.textContent = 'Standardpreise importieren';
        seedBtn.style.marginTop = '10px';
        seedBtn.onclick = seedDefaultPrices;
        container.appendChild(seedBtn);
        return;
    }

    items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'price-admin-row';
        row.draggable = true;
        row.style.cssText = 'background:#f9f9f9; padding:15px; margin-bottom:10px; border-radius:8px; cursor:grab;';

        const handle = document.createElement('div');
        handle.textContent = '⠿';
        handle.style.cssText = 'color:#bbb; font-size:1.3rem; line-height:1; user-select:none; flex-shrink:0; margin-right:6px;';

        const content = document.createElement('div');
        content.style.cssText = 'flex:1;';
        content.innerHTML = '<div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:8px;">'
            + '<input type="text" data-field="label" placeholder="Bezeichnung" style="flex:2 1 150px; padding:8px; border:1px solid #ddd; border-radius:4px;">'
            + '<input type="text" data-field="description" placeholder="Beschreibung" style="flex:2 1 150px; padding:8px; border:1px solid #ddd; border-radius:4px;">'
            + '<input type="text" data-field="price" placeholder="Preis" style="flex:0 0 100px; padding:8px; border:1px solid #ddd; border-radius:4px; text-align:right;">'
            + '</div>'
            + '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">'
            + '<button class="save-price-btn btn" style="padding:5px 12px; font-size:0.85rem;">Speichern</button>'
            + '<button class="delete-price-btn btn btn-secondary" style="padding:5px 12px; font-size:0.85rem; background:#c0392b; color:#fff; border-color:#c0392b;">L\u00f6schen</button>'
            + '<span class="price-save-status" style="color:#27ae60; font-size:0.8rem; display:none;"></span>'
            + '<span style="margin-left:auto; display:flex; gap:6px;">'
            + '<button type="button" class="toggle-gutschein" title="Als Gutschein-Flugart im Dropdown anzeigen" style="padding:3px 8px; font-size:0.75rem; border-radius:4px; border:1px solid #ccc; cursor:pointer; background:#eee; color:#666;">Gutschein</button>'
            + '<button type="button" class="toggle-perminute" title="Als Minutenpreis f\u00fcr Zusatzzeit verwenden" style="padding:3px 8px; font-size:0.75rem; border-radius:4px; border:1px solid #ccc; cursor:pointer; background:#eee; color:#666;">Zusatzzeit</button>'
            + '</span>'
            + '</div>';

        row.style.display = 'flex';
        row.style.alignItems = 'flex-start';
        row.appendChild(handle);
        row.appendChild(content);

        // Werte sicher per DOM-Property setzen
        content.querySelector('[data-field="label"]').value = item.label || '';
        content.querySelector('[data-field="description"]').value = item.description || '';
        content.querySelector('[data-field="price"]').value = item.price || '';

        // Gutschein/Zusatzzeit Toggle-Buttons
        const gutscheinBtn = content.querySelector('.toggle-gutschein');
        const perMinBtn = content.querySelector('.toggle-perminute');

        function styleToggle(btn, active, color) {
            btn.style.background = active ? color : '#eee';
            btn.style.color = active ? '#fff' : '#666';
            btn.style.borderColor = active ? color : '#ccc';
        }
        styleToggle(gutscheinBtn, !!item.gutschein, '#0f3460');
        styleToggle(perMinBtn, !!item.perMinute, '#e94560');

        gutscheinBtn.onclick = async () => {
            const newVal = !item.gutschein;
            try {
                // Gutschein und perMinute schliessen sich gegenseitig aus
                const updates = { gutschein: newVal };
                if (newVal) updates.perMinute = false;
                await updateDoc(doc(db, 'prices', item.id), updates);
            } catch (e) { alert('Fehler: ' + e.message); }
        };
        perMinBtn.onclick = async () => {
            const newVal = !item.perMinute;
            try {
                const updates = { perMinute: newVal };
                if (newVal) updates.gutschein = false;
                await updateDoc(doc(db, 'prices', item.id), updates);
            } catch (e) { alert('Fehler: ' + e.message); }
        };

        content.querySelector('.save-price-btn').onclick = async () => {
            const data = {
                label: content.querySelector('[data-field="label"]').value,
                description: content.querySelector('[data-field="description"]').value,
                price: content.querySelector('[data-field="price"]').value,
                order: idx
            };
            try {
                await updateDoc(doc(db, 'prices', item.id), data);
                const status = content.querySelector('.price-save-status');
                status.textContent = 'Gespeichert';
                status.style.display = 'inline';
                setTimeout(() => status.style.display = 'none', 2000);
            } catch (e) {
                alert('Fehler beim Speichern: ' + e.message);
            }
        };

        content.querySelector('.delete-price-btn').onclick = async () => {
            if (confirm('⚠️ "' + (item.label || 'Position') + '" unwiderruflich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.')) {
                try {
                    await deleteDoc(doc(db, 'prices', item.id));
                } catch (e) {
                    alert('Fehler beim Löschen: ' + e.message);
                }
            }
        };

        // Drag & Drop Handler
        row.addEventListener('dragstart', (e) => {
            draggedPriceItem = item;
            draggedPriceEl = row;
            setTimeout(() => { row.style.opacity = '0.4'; }, 0);
            e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
            row.style.opacity = '1';
            draggedPriceEl = null;
            container.querySelectorAll('.price-admin-row').forEach(r => r.classList.remove('drag-over-price'));
        });
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedPriceEl && row !== draggedPriceEl) row.classList.add('drag-over-price');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over-price'));
        row.addEventListener('drop', async (e) => {
            e.preventDefault();
            row.classList.remove('drag-over-price');
            if (!draggedPriceItem || draggedPriceEl === row) return;
            const sorted = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
            const without = sorted.filter(i => i.id !== draggedPriceItem.id);
            const targetIdx = without.findIndex(i => i.id === item.id);
            without.splice(targetIdx === -1 ? without.length : targetIdx, 0, draggedPriceItem);
            try {
                const base = Date.now();
                await Promise.all(without.map((p, i) =>
                    updateDoc(doc(db, 'prices', p.id), { order: base + i * 100 })
                ));
            } catch (err) {
                alert('Sortierung konnte nicht gespeichert werden: ' + err.message);
            }
            draggedPriceItem = null;
        });

        container.appendChild(row);
    });
}

async function seedDefaultPrices() {
    const defaults = [
        { label: "Segelflug (Windenstart)", description: "bis 20 Minuten Flugzeit", price: "48,00 €", order: 0, gutschein: true, perMinute: false },
        { label: "Gruppen ab 10 Personen", description: "bis 20 Minuten, Windenstart", price: "30,00 €", order: 1, gutschein: false, perMinute: false },
        { label: "Segelflug (F-Schlepp)", description: "bis 20 Minuten", price: "80,00 €", order: 2, gutschein: true, perMinute: false },
        { label: "Verlängerung Segelflug", description: "Jede weitere Minute über 20 Min. Flugzeit", price: "0,75 €", order: 3, gutschein: false, perMinute: true },
        { label: "Motorsegler", description: "bis 15 Minuten", price: "55,00 €", order: 4, gutschein: true, perMinute: false },
        { label: "Verlängerung Motorsegler", description: "jede weitere Minute", price: "3,75 €", order: 5, gutschein: false, perMinute: true },
        { label: "Segelkunstflug", description: "mit F-Schlepp pauschal", price: "160,00 €", order: 6, gutschein: true, perMinute: false }
    ];

    try {
        const pricesRef = collection(db, 'prices');
        for (const p of defaults) {
            await addDoc(pricesRef, p);
        }
    } catch (e) {
        alert('Import fehlgeschlagen: ' + e.message);
    }
}

// === Flugzeugpark ===

const FLUGZEUGPARK_IMPORT_DATA = [
    // Segelflugzeuge
    { name: 'DG-1001e neo',           registration: 'D-KSFP', type: 'Hochleistungs-Doppelsitzer',  category: 'Segelflugzeuge', highlight: true,  specs: 'Besonderheit: Front Electric Sustainer (FES)\nSpannweite: 20 m\nGleitzahl: 46,5', imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/dg1001.jpg' },
    { name: 'Grob G103 C Twin III',   registration: 'D-4419', type: 'Schulungs-Segelflugzeug',     category: 'Segelflugzeuge', highlight: false, specs: 'Sitzplätze: 2\nSpannweite: 18 m\nGleitzahl: 38',                                    imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/grob-twin-4419.jpg' },
    { name: 'Grob Twin III Orca',     registration: 'D-5900', type: 'Schulungs-Segelflugzeug',     category: 'Segelflugzeuge', highlight: false, specs: 'Sitzplätze: 2\nSpannweite: 18 m\nGleitzahl: 38',                                    imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/grob-twin-5900.jpg' },
    { name: 'ASK 21',                 registration: 'D-0366', type: 'Schulungs-Segelflugzeug',     category: 'Segelflugzeuge', highlight: false, specs: 'Sitzplätze: 2\nSpannweite: 17 m\nGleitzahl: 33,5',                                   imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/ask21.jpg' },
    { name: 'LS4-a',                  registration: 'D-5254', type: 'Segelflugzeug',               category: 'Segelflugzeuge', highlight: false, specs: 'Sitzplätze: 1\nSpannweite: 15 m\nGleitzahl: 40,5',                                   imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/ls4-a.jpg' },
    { name: 'LS4-b',                  registration: 'D-6649', type: 'Segelflugzeug',               category: 'Segelflugzeuge', highlight: false, specs: 'Sitzplätze: 1\nSpannweite: 15 m\nGleitzahl: 40,5',                                   imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/ls4-b.jpg' },
    { name: 'DG-600',                 registration: 'D-2664', type: 'Segelflugzeug',               category: 'Segelflugzeuge', highlight: false, specs: 'Sitzplätze: 1\nSpannweite: 15 - 17 m\nGleitzahl: 49',                               imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/dg600.jpg' },
    { name: 'DG-300 Club ELAN ACRO',  registration: 'D-5647', type: 'Segelflugzeug',               category: 'Segelflugzeuge', highlight: false, specs: 'Sitzplätze: 1\nSpannweite: 15 m\nGleitzahl: 41',                                    imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/dg300.jpg' },
    // Motorsegler
    { name: 'Dynamic WT9',            registration: 'D-MDYD', type: 'Ultraleichtflugzeug',         category: 'Motorflugzeuge',    highlight: false, specs: 'Sitzplätze: 2\nMotorleistung: 115 PS',                                              imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/dynamic.jpg' },
    { name: 'Grob G109 BT',           registration: 'D-KGFT', type: 'Motorflugzeuge',                 category: 'Motorflugzeuge',    highlight: false, specs: 'Sitzplätze: 2\nMotorleistung: 130 PS',                                              imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/grob-g109.jpg' },
    // Oldtimer
    { name: 'Ka 6',                   registration: 'D-1088', type: 'Oldtimer Segelflugzeug',      category: 'Oldtimer',       highlight: false, specs: 'Sitzplätze: 1\nBaujahr: 1966\nGleitzahl: 30',                                       imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/ka6.jpg' },
    // Winde
    { name: 'Doppeltrommelwinde BAY-1001', registration: '', type: 'Dieselwinde Eigenbau',         category: 'Winde',          highlight: false, specs: 'Hersteller: Magirus Deutz (Ex-Post LKW)\nLeistung: 320 PS',                         imageUrl: 'https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/winde.jpg' },
];

let editingAircraftId = null;

async function startAircraftLogic() {
    const adminList = document.getElementById('aircraft-admin-list');
    const publicList = document.getElementById('dynamic-aircraft-list');
    const aircraftForm = document.getElementById('aircraft-form');
    const submitBtn = document.getElementById('aircraft-submit-btn');
    const cancelBtn = document.getElementById('aircraft-cancel-btn');
    const formHeadline = document.getElementById('aircraft-form-headline');
    const formStatus = document.getElementById('aircraft-form-status');

    const aircraftRef = collection(db, 'aircraft');

    // Bild-Vorschau beim Datei-Auswählen
    const fileInputEl = document.getElementById('aircraft-image-file');
    if (fileInputEl) {
        fileInputEl.addEventListener('change', () => {
            const container = document.getElementById('aircraft-image-preview-container');
            const preview = document.getElementById('aircraft-image-preview');
            const statusEl = document.getElementById('aircraft-image-upload-status');
            if (fileInputEl.files.length > 0) {
                const f = fileInputEl.files[0];
                if (preview) preview.src = URL.createObjectURL(f);
                if (container) container.style.display = 'block';
                if (statusEl) statusEl.textContent = `Bereit: ${f.name} – wird beim Speichern komprimiert & hochgeladen`;
            } else {
                if (container) container.style.display = 'none';
            }
        });
    }

    onAuthStateChanged(auth, (user) => {
        if (!user) return;
        const isAdmin = !user.isAnonymous;

        onSnapshot(aircraftRef, (snapshot) => {
            const items = [];
            snapshot.forEach(d => items.push({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));

            if (publicList) renderAircraftPublic(publicList, items);
            if (adminList) renderAircraftAdmin(adminList, items, isAdmin);
        });
    });

    // Formular absenden
    if (aircraftForm) {
        aircraftForm.onsubmit = async (e) => {
            e.preventDefault();
            if (auth.currentUser?.isAnonymous) { alert('Keine Berechtigung.'); return; }

            const nameVal = document.getElementById('aircraft-name').value;
            const regVal = document.getElementById('aircraft-registration').value;
            const typeVal = document.getElementById('aircraft-type').value;
            const catVal = document.getElementById('aircraft-category').value;
            const specsVal = document.getElementById('aircraft-specs').value;
            const highlightVal = document.getElementById('aircraft-highlight').checked;
            const imageUrlHidden = document.getElementById('aircraft-image-url');
            let imageVal = imageUrlHidden ? imageUrlHidden.value : '';

            const fileEl = document.getElementById('aircraft-image-file');
            if (fileEl && fileEl.files.length > 0) {
                const statusEl = document.getElementById('aircraft-image-upload-status');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Bild wird hochgeladen…'; }
                if (statusEl) statusEl.textContent = 'Komprimiere und lade hoch…';
                try {
                    const compressed = await compressImage(fileEl.files[0]);
                    const safeName = `aircraft_${Date.now()}.webp`;
                    imageVal = await uploadToGitHub(compressed, safeName);
                    if (imageUrlHidden) imageUrlHidden.value = imageVal;
                } catch (uploadErr) {
                    alert('Bild-Upload fehlgeschlagen: ' + uploadErr.message);
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editingAircraftId ? 'Änderungen speichern' : 'Flugzeug speichern'; }
                    return;
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editingAircraftId ? 'Änderungen speichern' : 'Flugzeug speichern'; }
                }
            }

            const dataToSave = {
                name: nameVal,
                registration: regVal,
                type: typeVal,
                category: catVal,
                specs: specsVal,
                highlight: highlightVal,
                imageUrl: imageVal
            };

            try {
                if (editingAircraftId) {
                    await updateDoc(doc(db, 'aircraft', editingAircraftId), dataToSave);
                } else {
                    dataToSave.order = Date.now();
                    await addDoc(aircraftRef, dataToSave);
                }
                resetAircraftForm();
                if (formStatus) { formStatus.textContent = 'Gespeichert!'; formStatus.style.display = 'inline'; setTimeout(() => formStatus.style.display = 'none', 2500); }
            } catch (err) {
                alert('Fehler: ' + err.message);
            }
        };
    }

    if (cancelBtn) cancelBtn.onclick = resetAircraftForm;

    function resetAircraftForm() {
        editingAircraftId = null;
        if (aircraftForm) aircraftForm.reset();
        const imageUrlHidden = document.getElementById('aircraft-image-url');
        const previewCont = document.getElementById('aircraft-image-preview-container');
        const currentInfo = document.getElementById('aircraft-current-image-info');
        if (imageUrlHidden) imageUrlHidden.value = '';
        if (previewCont) previewCont.style.display = 'none';
        if (currentInfo) currentInfo.style.display = 'none';
        if (formHeadline) formHeadline.textContent = 'Neues Flugzeug hinzufügen';
        if (submitBtn) submitBtn.textContent = 'Flugzeug speichern';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    function loadAircraftIntoForm(item) {
        editingAircraftId = item.id;
        document.getElementById('aircraft-name').value = item.name || '';
        document.getElementById('aircraft-registration').value = item.registration || '';
        document.getElementById('aircraft-type').value = item.type || '';
        document.getElementById('aircraft-category').value = item.category || 'Segelflugzeuge';
        document.getElementById('aircraft-specs').value = item.specs || '';
        document.getElementById('aircraft-highlight').checked = !!item.highlight;
        const imageUrlHidden = document.getElementById('aircraft-image-url');
        if (imageUrlHidden) imageUrlHidden.value = item.imageUrl || '';
        const previewCont = document.getElementById('aircraft-image-preview-container');
        const fileEl2 = document.getElementById('aircraft-image-file');
        const currentInfo = document.getElementById('aircraft-current-image-info');
        const currentLink = document.getElementById('aircraft-current-image-link');
        if (fileEl2) fileEl2.value = '';
        if (previewCont) previewCont.style.display = 'none';
        if (item.imageUrl && currentInfo && currentLink) {
            currentLink.href = item.imageUrl;
            currentInfo.style.display = 'block';
        } else if (currentInfo) {
            currentInfo.style.display = 'none';
        }
        if (formHeadline) formHeadline.textContent = 'Flugzeug bearbeiten';
        if (submitBtn) submitBtn.textContent = 'Änderungen speichern';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        const wrap = document.querySelector('.aircraft-admin-form-wrap');
        if (wrap) wrap.scrollIntoView({ behavior: 'smooth' });
    }

    let draggedAircraftItem = null;
    let draggedAircraftEl = null;

    async function renderAircraftAdmin(container, items, isAdmin) {
        if (!isAdmin) { container.innerHTML = '<p style="color:#999;">Nur als Admin sichtbar.</p>'; return; }

        // Migration: alte Kategorie 'Motorsegler' → 'Motorflugzeuge'
        const legacyItems = items.filter(i => i.category === 'Motorsegler');
        if (legacyItems.length > 0) {
            await Promise.all(legacyItems.map(i =>
                updateDoc(doc(db, 'aircraft', i.id), { category: 'Motorflugzeuge' })
            ));
            return; // onSnapshot wird automatisch neu ausgelöst
        }

        if (items.length === 0) {
            container.innerHTML = `
                <p style="color:#999; margin-bottom:16px;">Noch keine Flugzeuge vorhanden.</p>
                <button type="button" id="aircraft-import-btn" class="btn">
                    ↓ Alle ${FLUGZEUGPARK_IMPORT_DATA.length} Flugzeuge aus dem Code importieren
                </button>
                <p style="color:#888; font-size:0.85rem; margin-top:10px;">
                    Importiert alle bisher fest im Code hinterlegten Flugzeuge (inkl. Bilder) in die Datenbank.
                    Danach können sie hier bearbeitet werden.
                </p>`;
            document.getElementById('aircraft-import-btn').onclick = async () => {
                if (!confirm(`${FLUGZEUGPARK_IMPORT_DATA.length} Flugzeuge in die Datenbank importieren?`)) return;
                const btn = document.getElementById('aircraft-import-btn');
                btn.disabled = true;
                btn.textContent = 'Importiere…';
                try {
                    const base = Date.now();
                    for (let i = 0; i < FLUGZEUGPARK_IMPORT_DATA.length; i++) {
                        await addDoc(aircraftRef, { ...FLUGZEUGPARK_IMPORT_DATA[i], order: base + i });
                    }
                } catch (e) {
                    alert('Import fehlgeschlagen: ' + e.message);
                    btn.disabled = false;
                    btn.textContent = `↓ Alle ${FLUGZEUGPARK_IMPORT_DATA.length} Flugzeuge aus dem Code importieren`;
                }
            };
            return;
        }
        container.innerHTML = '';

        // Nach Kategorien gruppieren (gleiche Reihenfolge wie öffentliche Seite)
        const categoryOrder = ['Segelflugzeuge', 'Motorflugzeuge', 'Oldtimer', 'Winde'];
        const byCategory = {};
        items.forEach(item => {
            const cat = item.category || 'Sonstige';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(item);
        });
        const cats = categoryOrder.filter(c => byCategory[c]).concat(Object.keys(byCategory).filter(c => !categoryOrder.includes(c)));

        cats.forEach((cat, catIndex) => {
            const header = document.createElement('h4');
            header.textContent = cat;
            header.style.cssText = `margin: ${catIndex === 0 ? '0' : '24px'} 0 10px; color: var(--primary); font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--primary); padding-bottom: 6px;`;
            container.appendChild(header);

            byCategory[cat].forEach(item => {
                const row = document.createElement('div');
                row.className = 'aircraft-admin-row';
                row.draggable = true;
                row.style.cssText = 'background:#f9f9f9; padding:15px; margin-bottom:8px; border-radius:8px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;';

                const handle = document.createElement('div');
                handle.textContent = '⠿';
                handle.style.cssText = 'color:#bbb; font-size:1.3rem; line-height:1; user-select:none; flex-shrink:0;';

                const info = document.createElement('div');
                info.style.cssText = 'flex:1;';
                info.innerHTML = `<strong>${item.name || '—'}</strong>${item.registration ? ` <span style="color:#888; font-size:0.85rem;">(${item.registration})</span>` : ''}${item.type ? `<br><span style="color:#666; font-size:0.82rem;">${item.type}</span>` : ''}${item.highlight ? ' <span style="color:var(--accent); font-size:0.8rem;">★ Highlight</span>' : ''}`;

                const btns = document.createElement('div');
                btns.style.cssText = 'display:flex; gap:8px; flex-shrink:0;';
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-secondary';
                editBtn.style.cssText = 'padding:5px 12px; font-size:0.85rem;';
                editBtn.textContent = 'Ändern';
                editBtn.onclick = () => loadAircraftIntoForm(item);
                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-secondary';
                delBtn.style.cssText = 'padding:5px 12px; font-size:0.85rem; background:#c0392b; color:#fff; border-color:#c0392b;';
                delBtn.textContent = 'Löschen';
                delBtn.onclick = async () => {
                    if (!confirm('⚠️ "' + (item.name || 'Flugzeug') + '" unwiderruflich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden. Das zugehörige Bild wird ebenfalls gelöscht.')) return;
                    try {
                        await deleteDoc(doc(db, 'aircraft', item.id));
                        if (item.imageUrl) await deleteFromGitHub(item.imageUrl);
                    } catch (e) { alert('Löschen fehlgeschlagen: ' + e.message); }
                };
                btns.appendChild(editBtn);
                btns.appendChild(delBtn);

                // Drag & Drop Handler
                row.addEventListener('dragstart', (e) => {
                    draggedAircraftItem = item;
                    draggedAircraftEl = row;
                    setTimeout(() => { row.style.opacity = '0.4'; }, 0);
                    e.dataTransfer.effectAllowed = 'move';
                });
                row.addEventListener('dragend', () => {
                    row.style.opacity = '1';
                    draggedAircraftEl = null;
                    container.querySelectorAll('.aircraft-admin-row').forEach(r => r.classList.remove('drag-over'));
                });
                row.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (draggedAircraftEl && row !== draggedAircraftEl) row.classList.add('drag-over');
                });
                row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
                row.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    row.classList.remove('drag-over');
                    if (!draggedAircraftItem || draggedAircraftEl === row) return;
                    // Nur innerhalb derselben Kategorie
                    if ((draggedAircraftItem.category || 'Sonstige') !== (item.category || 'Sonstige')) return;
                    const srcCat = draggedAircraftItem.category || 'Sonstige';
                    const catItems = items
                        .filter(i => (i.category || 'Sonstige') === srcCat)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    const without = catItems.filter(i => i.id !== draggedAircraftItem.id);
                    const targetIdx = without.findIndex(i => i.id === item.id);
                    without.splice(targetIdx === -1 ? without.length : targetIdx, 0, draggedAircraftItem);
                    try {
                        const base = Date.now();
                        await Promise.all(without.map((fi, idx) =>
                            updateDoc(doc(db, 'aircraft', fi.id), { order: base + idx * 100 })
                        ));
                    } catch (err) {
                        alert('Sortierung konnte nicht gespeichert werden: ' + err.message);
                    }
                    draggedAircraftItem = null;
                });

                row.appendChild(handle);
                row.appendChild(info);
                row.appendChild(btns);
                container.appendChild(row);
            });
        });
    }
}

function renderAircraftPublic(container, items) {
    if (items.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';

    // Kategorien ermitteln und in gewünschter Reihenfolge rendern
    const categoryOrder = ['Segelflugzeuge', 'Motorflugzeuge', 'Oldtimer', 'Winde'];
    const byCategory = {};
    items.forEach(item => {
        const cat = item.category || 'Sonstige';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(item);
    });

    container.innerHTML = '';
    const cats = categoryOrder.filter(c => byCategory[c]).concat(Object.keys(byCategory).filter(c => !categoryOrder.includes(c)));

    const categoryDescriptions = {
        'Segelflugzeuge': 'Leistungsfähige Ein- und Doppelsitzer für Schulungs-, Strecken- und Gastflüge.',
        'Motorflugzeuge':    'Geeignet für den Flugzeugschlepp oder Rundflüge.',
        'Oldtimer':       'Ein besonderes Flugerlebnis mit unseren historischen Schätzen.',
        'Winde':          'Unser Kraftpaket am Boden.',
    };

    // Aircraft-Bilder müssen aus dem GitHub-Repo kommen (verhindert javascript:/data: URLs etc.)
    function safeImageUrl(url) {
        if (!url) return 'images/hero.jpg';
        var s = String(url);
        if (s.indexOf('https://raw.githubusercontent.com/profex1337/segelfliegen/') === 0) return s;
        return 'images/hero.jpg';
    }

    cats.forEach(cat => {
        const section = document.createElement('div');
        section.id = cat;
        section.style.cssText = 'margin-bottom: 60px;';
        const catEsc = escapeHTML(cat);
        const desc = categoryDescriptions[cat] ? `<p style="color:var(--text-light); margin-bottom:20px;">${escapeHTML(categoryDescriptions[cat])}</p>` : '';
        section.innerHTML = `<h2 style="color:var(--primary); font-family:Montserrat,sans-serif; margin-bottom:8px;">${catEsc}</h2>${desc}`;
        const grid = document.createElement('div');
        grid.className = 'aircraft-card-grid';
        byCategory[cat].forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            if (item.highlight) card.style.cssText = 'border: 2px solid var(--accent); transform: scale(1.02); position:relative;';

            const specsLines = (item.specs || '').split('\n').filter(l => l.trim());
            const specsList = specsLines.map(l => `<li>${escapeHTML(l.trim())}</li>`).join('');
            const imgSrc = escapeHTML(safeImageUrl(item.imageUrl));
            const nameEsc = escapeHTML(item.name || '—');
            const altEsc = escapeHTML(item.name || '');
            const regEsc = escapeHTML(item.registration || '');
            const typeEsc = escapeHTML(item.type || '');

            card.innerHTML = `
                ${item.highlight ? '<div class="badge-highlight">★ Highlight</div>' : ''}
                <div class="card-img-top">
                    <img src="${imgSrc}" alt="${altEsc}" loading="lazy" class="zoomable" onerror="this.src='images/hero.jpg'">
                </div>
                <div class="card-body">
                    <h3 class="card-title"${item.highlight ? ' style="color:var(--accent);"' : ''}>${nameEsc}</h3>
                    ${regEsc ? `<p style="font-size:0.9rem; color:#888; margin-top:-8px; margin-bottom:8px;">${regEsc}</p>` : ''}
                    ${typeEsc ? `<p style="font-size:0.9rem; margin-bottom:10px; font-weight:600;">${typeEsc}</p>` : ''}
                    ${specsList ? `<ul class="data-list" style="font-size:0.9rem; margin-top:10px;">${specsList}</ul>` : ''}
                </div>
            `;
            grid.appendChild(card);
        });
        section.appendChild(grid);
        container.appendChild(section);
    });
}

// === GUTSCHEIN-VERWALTUNG ===

async function startVoucherLogic() {
    const listContainer = document.getElementById('voucher-list');
    if (!listContainer) return;

    const voucherRef = collection(db, 'vouchers');
    const orderRef = collection(db, 'voucherOrders');
    let cachedVouchers = [];
    let cachedOrders = [];

    function renderAll() {
        renderVoucherList(listContainer, cachedVouchers, cachedOrders);
    }

    onAuthStateChanged(auth, (user) => {
        if (!user) return;
        const isAdmin = !user.isAnonymous;
        if (!isAdmin) return;

        onSnapshot(voucherRef, (snapshot) => {
            cachedVouchers = [];
            snapshot.forEach(d => cachedVouchers.push({ id: d.id, ...d.data() }));
            cachedVouchers.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            renderAll();
        });

        onSnapshot(orderRef, (snapshot) => {
            cachedOrders = [];
            snapshot.forEach(d => cachedOrders.push({ id: d.id, ...d.data() }));
            cachedOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            renderAll();
        });
    });

    // Prüft ob Gutschein-Nr. schon als offen existiert
    window.checkVoucherExists = (number) => {
        if (!number) return false;
        return cachedVouchers.find(function(v) { return v.number === number; }) || false;
    };

    // Gutschein nach PDF-Generierung speichern (Event von intern.html)
    // Prüft ob Gutschein-Nr. schon existiert — wenn ja, nur aktualisieren
    window.saveVoucherToFirestore = async (data) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        try {
            var existing = data.number ? cachedVouchers.find(function(v) { return v.number === data.number; }) : null;
            if (existing) {
                await updateDoc(doc(db, 'vouchers', existing.id), data);
            } else {
                await addDoc(voucherRef, {
                    ...data,
                    timestamp: Date.now()
                });
            }
        } catch (e) {
            console.error('Gutschein speichern fehlgeschlagen:', e);
        }
    };

    // Prüft ob Gutschein abgelaufen ist (validUntil im Format DD.MM.YYYY)
    window.isVoucherExpired = (validUntil) => {
        if (!validUntil) return false;
        var parts = validUntil.split('.');
        if (parts.length !== 3) return false;
        var expiry = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 23, 59, 59);
        return new Date() > expiry;
    };

    // Gutschein als eingelöst markieren
    window.toggleVoucherRedeemed = async (docId, currentStatus, expired) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        if (currentStatus && !confirm('Gutschein wirklich wieder \u00F6ffnen?')) return;
        if (!currentStatus && expired && !confirm('Gutschein ist abgelaufen, trotzdem einl\u00F6sen?')) return;
        try {
            await updateDoc(doc(db, 'vouchers', docId), { redeemed: !currentStatus });
        } catch (e) {
            console.error('Status-Update fehlgeschlagen:', e);
        }
    };

    // Gutschein löschen
    window.deleteVoucher = async (docId) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        if (!confirm('⚠️ Gutschein unwiderruflich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.')) return;
        try {
            await deleteDoc(doc(db, 'vouchers', docId));
        } catch (e) {
            console.error('Löschen fehlgeschlagen:', e);
        }
    };

    // Gutschein erneut drucken (Nachdruck) — befüllt Formular und generiert direkt PDF
    window.loadVoucherForReprint = (item) => {
        var recipient = document.getElementById('voucher-recipient');
        var flightType = document.getElementById('voucher-flight-type');
        var greeting = document.getElementById('voucher-greeting');
        var value = document.getElementById('voucher-value');
        var voucherNr = document.getElementById('voucher-number');
        var validUntil = document.getElementById('voucher-valid-until');
        var zusatzField = document.getElementById('voucher-zusatzzeit');
        var showValueField = document.getElementById('voucher-show-value');
        if (recipient) recipient.value = item.recipient || '';
        if (flightType) {
            var targetFlugart = item.flightType || '';
            if (targetFlugart) {
                var exists = Array.prototype.some.call(flightType.options, function(o) { return o.value === targetFlugart; });
                if (!exists) {
                    var opt = document.createElement('option');
                    opt.value = targetFlugart;
                    opt.textContent = targetFlugart;
                    flightType.appendChild(opt);
                }
            }
            flightType.value = targetFlugart;
        }
        if (greeting) greeting.value = item.greeting || '';
        if (value) value.value = item.value || '';
        if (voucherNr) voucherNr.value = item.number || '';
        if (validUntil) validUntil.value = item.validUntil || '';
        if (zusatzField) zusatzField.value = item.zusatzzeit || '0';
        if (showValueField) showValueField.checked = item.showValue !== false;
        var flugdauerField = document.getElementById('voucher-flugdauer');
        if (flugdauerField) flugdauerField.value = item.flugdauer || '';
        // Direkt PDF herunterladen
        var downloadBtn = document.getElementById('gutschein-download-btn');
        if (downloadBtn) downloadBtn.click();
    };

    // Bestellung ins Formular laden
    window.loadVoucherOrder = (order) => {
        const recipient = document.getElementById('voucher-recipient');
        const flightType = document.getElementById('voucher-flight-type');
        const greeting = document.getElementById('voucher-greeting');
        const value = document.getElementById('voucher-value');
        if (recipient) recipient.value = order.empfaenger || '';
        if (flightType) {
            var targetFlugart = order.flugart || '';
            if (targetFlugart) {
                var exists = Array.prototype.some.call(flightType.options, function(o) { return o.value === targetFlugart; });
                if (!exists) {
                    var opt = document.createElement('option');
                    opt.value = targetFlugart;
                    opt.textContent = targetFlugart;
                    flightType.appendChild(opt);
                }
            }
            flightType.value = targetFlugart;
        }
        if (greeting) greeting.value = order.grusstext || '';
        if (value) value.value = order.wert || '';
        var bestellerField = document.getElementById('voucher-besteller');
        if (bestellerField) bestellerField.value = order.name || '';
        var emailField = document.getElementById('voucher-order-email');
        if (emailField) emailField.value = order.email || '';
        // Zusatzzeit und Flugdauer merken für PDF
        var zusatzField = document.getElementById('voucher-zusatzzeit');
        if (zusatzField) zusatzField.value = order.zusatzzeit || '0';
        var flugdauerField = document.getElementById('voucher-flugdauer');
        if (flugdauerField) flugdauerField.value = order.flugdauer || '';
        // Wert-Anzeige Checkbox setzen (Standard: true)
        var showValueField = document.getElementById('voucher-show-value');
        if (showValueField) showValueField.checked = order.wertAnzeigen !== false;
        // Zum Formular scrollen
        const form = document.getElementById('gutschein-form');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Bestellung als bezahlt markieren
    window.toggleOrderPaid = async (docId, currentStatus) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        try {
            await updateDoc(doc(db, 'voucherOrders', docId), { paid: !currentStatus });
        } catch (e) {
            console.error('Bezahlt-Status fehlgeschlagen:', e);
        }
    };

    // Bestellung abschließen
    window.completeVoucherOrder = async (docId) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        if (!confirm('Bestellung als abgeschlossen markieren?')) return;
        try {
            await updateDoc(doc(db, 'voucherOrders', docId), { status: 'abgeschlossen', completedAt: Date.now() });
        } catch (e) {
            console.error('Abschließen fehlgeschlagen:', e);
        }
    };

    // Bestellung wieder öffnen
    window.reopenVoucherOrder = async (docId) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        try {
            await updateDoc(doc(db, 'voucherOrders', docId), { status: 'neu', completedAt: null });
        } catch (e) {
            console.error('Wieder öffnen fehlgeschlagen:', e);
        }
    };

    // Bestellung löschen
    window.deleteVoucherOrder = async (docId) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        if (!confirm('⚠️ Bestellung unwiderruflich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.')) return;
        try {
            await deleteDoc(doc(db, 'voucherOrders', docId));
        } catch (e) {
            console.error('Bestellung löschen fehlgeschlagen:', e);
        }
    };

    // Zahlungserinnerung an Kunden senden (via Cloud Function)
    window.sendPaymentReminder = async (order) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        if (!confirm('Zahlungserinnerung an ' + order.email + ' senden?')) return;

        try {
            const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js');
            const { getApp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
            const functions = getFunctions(getApp(), 'europe-west1');
            const sendAdmin = httpsCallable(functions, 'sendAdminEmail');

            await sendAdmin({
                action: 'paymentReminder',
                order: {
                    name: order.name || '',
                    email: order.email || '',
                    flugart: order.flugart || '',
                    empfaenger: order.empfaenger || '',
                    wert: order.wert || '',
                    zusatzzeit: order.zusatzzeit || '0',
                    zustellung: order.zustellung || '',
                    flugdauer: order.flugdauer || ''
                }
            });
            alert('Zahlungserinnerung wurde an ' + order.email + ' gesendet.');
        } catch (e) {
            console.error('Reminder senden fehlgeschlagen:', e);
            alert('Fehler beim Senden: ' + (e.message || e));
        }
    };
}

function renderOrderRow(order, isClosed) {
    var row = document.createElement('div');
    var orderDate = order.timestamp ? new Date(order.timestamp).toLocaleDateString('de-DE') : '\u2014';
    var isPaid = !!order.paid;
    var bgColor = isClosed ? '#f5f5f5' : (isPaid ? '#e8f5e9' : '#e3f2fd');
    var borderColor = isClosed ? '#bbb' : (isPaid ? '#2e7d32' : '#1565c0');
    var hoverColor = isClosed ? '#eee' : (isPaid ? '#c8e6c9' : '#bbdefb');

    row.style.cssText = 'display:flex; align-items:center; gap:16px; padding:14px 18px; margin-bottom:8px; border-radius:8px; flex-wrap:wrap; background:' + bgColor + '; border-left:4px solid ' + borderColor + '; cursor:pointer; transition:background 0.2s;' + (isClosed ? ' opacity:0.7;' : '');
    row.onmouseenter = function() { row.style.background = hoverColor; };
    row.onmouseleave = function() { row.style.background = bgColor; };

    var besteller = escapeHTML(order.name || '\u2014');
    var email = escapeHTML(order.email || '');
    var telefon = escapeHTML(order.telefon || '');
    var flugart = escapeHTML(order.flugart || '');
    var empfaenger = escapeHTML(order.empfaenger || '');
    var wert = escapeHTML(order.wert || '');
    var gruss = escapeHTML(order.grusstext || '');
    var zustellungRaw = order.zustellung || '';
    var zustellung = escapeHTML(zustellungRaw);

    var paidBadge = isPaid
        ? '<span style="font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:600; background:#e8f5e9; color:#2e7d32; margin-left:8px;">Bezahlt</span>'
        : '<span style="font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:600; background:#fff3e0; color:#e65100; margin-left:8px;">Unbezahlt</span>';

    var infoClickable = !isClosed && isPaid;
    var infoHtml = '<div class="order-info" style="flex:1; min-width:200px;' + (infoClickable ? ' cursor:pointer;' : '') + '">'
        + '<strong style="font-size:1rem;">\u2709 ' + besteller + '</strong>' + paidBadge
        + '<div style="font-size:0.82rem; color:var(--text-light); margin-top:3px;">'
        + flugart + (wert ? ' &middot; ' + wert + ' \u20AC' : '') + ' &middot; F\u00FCr: ' + empfaenger
        + (zustellungRaw ? ' &middot; <span style="font-weight:600; color:' + (zustellungRaw.indexOf('Abholung') !== -1 ? '#6a1b9a' : '#1565c0') + ';">' + (zustellungRaw.indexOf('Abholung') !== -1 ? '\uD83D\uDCCD Abholung' : '\u2709 \u00DCberweisung') + '</span>' : '')
        + '</div>'
        + '<div style="font-size:0.78rem; color:#888; margin-top:2px;">'
        + email + (telefon ? ' &middot; ' + telefon : '') + ' &middot; ' + orderDate
        + '</div>'
        + (gruss ? '<div style="font-size:0.78rem; color:#666; margin-top:4px; font-style:italic;">\u201E' + gruss + '\u201C</div>' : '')
        + '</div>';

    var buttonsHtml = '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">';

    if (isClosed) {
        buttonsHtml += '<button data-action="reopen" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem;">Wieder \u00F6ffnen</button>'
            + '<button data-action="delete" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#c0392b; color:#fff; border-color:#c0392b;">L\u00F6schen</button>';
    } else {
        var paidBtnStyle = isPaid
            ? 'padding:6px 12px; font-size:0.78rem; background:#fff3e0; color:#e65100; border-color:#e65100;'
            : 'padding:6px 12px; font-size:0.78rem; background:#2e7d32; color:#fff; border-color:#2e7d32;';
        var paidBtnText = isPaid ? 'Unbezahlt' : 'Bezahlt';

        buttonsHtml += '<button data-action="togglePaid" class="btn btn-secondary" style="' + paidBtnStyle + '">' + paidBtnText + '</button>'
            + (isPaid ? '<button data-action="load" class="btn" style="padding:6px 14px; font-size:0.78rem;">\u00DCbernehmen</button>' : '')
            + (!isPaid ? '<button data-action="reminder" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#e65100; color:#fff; border-color:#e65100;">Reminder</button>' : '')
            + (isPaid ? '<button data-action="complete" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#6a1b9a; color:#fff; border-color:#6a1b9a;">Abschlie\u00DFen</button>' : '')
            + '<button data-action="delete" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#c0392b; color:#fff; border-color:#c0392b;">L\u00F6schen</button>';
    }
    buttonsHtml += '</div>';

    row.innerHTML = infoHtml + buttonsHtml;

    // Event-Listener via Closure (vermeidet HTML/Attribut-Injection durch User-Input)
    var infoEl = row.querySelector('.order-info');
    if (infoEl && infoClickable) {
        infoEl.addEventListener('click', function() { window.loadVoucherOrder(order); });
    }
    row.querySelectorAll('button[data-action]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var action = btn.getAttribute('data-action');
            if (action === 'reopen') window.reopenVoucherOrder(order.id);
            else if (action === 'delete') window.deleteVoucherOrder(order.id);
            else if (action === 'togglePaid') window.toggleOrderPaid(order.id, isPaid);
            else if (action === 'load') window.loadVoucherOrder(order);
            else if (action === 'reminder') window.sendPaymentReminder(order);
            else if (action === 'complete') window.completeVoucherOrder(order.id);
        });
    });

    return row;
}

function renderVoucherList(container, items, orders) {
    orders = orders || [];
    const openCount = items.filter(v => !v.redeemed).length;
    const redeemedCount = items.filter(v => v.redeemed).length;

    var html = '<div style="display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap;">'
        + '<div style="background:var(--bg-light); padding:12px 20px; border-radius:8px; flex:1; min-width:100px; text-align:center;">'
        + '<div style="font-size:1.8rem; font-weight:700; color:var(--primary);">' + items.length + '</div>'
        + '<div style="font-size:0.8rem; color:var(--text-light);">Gesamt</div></div>'
        + '<div style="background:#e8f5e9; padding:12px 20px; border-radius:8px; flex:1; min-width:100px; text-align:center;">'
        + '<div style="font-size:1.8rem; font-weight:700; color:#2e7d32;">' + openCount + '</div>'
        + '<div style="font-size:0.8rem; color:#2e7d32;">Offen</div></div>'
        + '<div style="background:#fff3e0; padding:12px 20px; border-radius:8px; flex:1; min-width:100px; text-align:center;">'
        + '<div style="font-size:1.8rem; font-weight:700; color:#e65100;">' + redeemedCount + '</div>'
        + '<div style="font-size:0.8rem; color:#e65100;">Eingelöst</div></div>';

    if (orders.length > 0) {
        html += '<div style="background:#e3f2fd; padding:12px 20px; border-radius:8px; flex:1; min-width:100px; text-align:center;">'
            + '<div style="font-size:1.8rem; font-weight:700; color:#1565c0;">' + orders.length + '</div>'
            + '<div style="font-size:0.8rem; color:#1565c0;">Bestellungen</div></div>';
    }
    html += '</div>';

    // Bestellungen aufteilen
    var openOrders = orders.filter(function(o) { return o.status !== 'abgeschlossen'; });
    var closedOrders = orders.filter(function(o) { return o.status === 'abgeschlossen'; });

    // Suchfeld
    html += '<div style="margin-bottom:20px;">'
        + '<input type="text" id="voucher-search" placeholder="Suche nach Name, Empfänger oder Gutscheinnummer..." style="width:100%; padding:12px 16px; border:2px solid #ddd; border-radius:8px; font-size:0.95rem; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor=\'var(--primary)\'" onblur="this.style.borderColor=\'#ddd\'">'
        + '</div>';

    // --- Offene Bestellungen ---
    if (openOrders.length > 0) {
        html += '<h4 style="margin:25px 0 12px; color:#1565c0;">Neue Bestellungen (<span id="voucher-orders-count">' + openOrders.length + '</span>)</h4>';
        html += '<div id="voucher-orders"></div>';
    }

    // Gutscheine aufteilen
    var openVouchers = items.filter(function(v) { return !v.redeemed; });
    var redeemedVouchers = items.filter(function(v) { return v.redeemed; });

    if (openVouchers.length > 0) {
        html += '<details style="margin-top:25px;"><summary style="cursor:pointer; font-weight:600; color:var(--primary); font-size:0.95rem; padding:8px 0;">Offene Gutscheine (' + openVouchers.length + ')</summary>';
        html += '<div id="voucher-items" style="margin-top:10px;"></div></details>';
    }

    // --- Aufklappbare Sektionen ---
    if (redeemedVouchers.length > 0) {
        html += '<details style="margin-top:25px;"><summary style="cursor:pointer; font-weight:600; color:#e65100; font-size:0.95rem; padding:8px 0;">Eingelöste Gutscheine (' + redeemedVouchers.length + ')</summary>';
        html += '<div id="voucher-items-redeemed" style="margin-top:10px;"></div></details>';
    }
    if (closedOrders.length > 0) {
        html += '<details style="margin-top:15px;"><summary style="cursor:pointer; font-weight:600; color:#888; font-size:0.95rem; padding:8px 0;">Abgeschlossene Bestellungen (' + closedOrders.length + ')</summary>';
        html += '<div id="voucher-orders-closed" style="margin-top:10px;"></div></details>';
    }

    container.innerHTML = html;

    // Offene Bestellungen rendern
    if (openOrders.length > 0) {
        var ordersContainer = container.querySelector('#voucher-orders');
        openOrders.forEach(function(order) {
            ordersContainer.appendChild(renderOrderRow(order, false));
        });
    }

    // Abgeschlossene Bestellungen rendern
    if (closedOrders.length > 0) {
        var closedContainer = container.querySelector('#voucher-orders-closed');
        closedOrders.forEach(function(order) {
            closedContainer.appendChild(renderOrderRow(order, true));
        });
    }

    // Eingelöste Gutscheine rendern
    if (redeemedVouchers.length > 0) {
        var redeemedContainer = container.querySelector('#voucher-items-redeemed');
        redeemedVouchers.forEach(function(item) {
            redeemedContainer.appendChild(renderVoucherRow(item));
        });
    }

    // Offene Gutscheine rendern
    var itemsContainer = container.querySelector('#voucher-items');
    if (itemsContainer && openVouchers.length > 0) {
        openVouchers.forEach(function(item) {
            itemsContainer.appendChild(renderVoucherRow(item));
        });
    }

    // Suchlogik
    var searchInput = container.querySelector('#voucher-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            var q = this.value.toLowerCase().trim();
            // Bestellungen filtern
            var ordersContainer = container.querySelector('#voucher-orders');
            var ordersCountEl = container.querySelector('#voucher-orders-count');
            if (ordersContainer) {
                var visibleOrders = 0;
                Array.from(ordersContainer.children).forEach(function(row, i) {
                    var o = openOrders[i];
                    if (!o) return;
                    var match = !q || (o.name || '').toLowerCase().indexOf(q) !== -1
                        || (o.empfaenger || '').toLowerCase().indexOf(q) !== -1
                        || (o.email || '').toLowerCase().indexOf(q) !== -1;
                    row.style.display = match ? '' : 'none';
                    if (match) visibleOrders++;
                });
                if (ordersCountEl) ordersCountEl.textContent = visibleOrders;
            }
            // Offene Gutscheine filtern
            if (itemsContainer) {
                Array.from(itemsContainer.children).forEach(function(row, i) {
                    var v = openVouchers[i];
                    if (!v) { return; }
                    var match = !q || (v.recipient || '').toLowerCase().indexOf(q) !== -1
                        || (v.number || '').toLowerCase().indexOf(q) !== -1
                        || (v.flightType || '').toLowerCase().indexOf(q) !== -1
                        || (v.ordererName || '').toLowerCase().indexOf(q) !== -1;
                    row.style.display = match ? '' : 'none';
                });
            }
        });
    }
}

function renderVoucherRow(item) {
    var row = document.createElement('div');
    var expired = !item.redeemed && window.isVoucherExpired && window.isVoucherExpired(item.validUntil);
    var bgColor = item.redeemed ? '#fff8e1' : (expired ? '#fff5f5' : '#f9f9f9');
    var borderColor = item.redeemed ? '#ffa000' : (expired ? '#c62828' : '#2e7d32');
    var opacityVal = item.redeemed ? '0.75' : '1';
    row.style.cssText = 'display:flex; align-items:center; gap:16px; padding:14px 18px; margin-bottom:8px; border-radius:8px; flex-wrap:wrap; background:' + bgColor + '; border-left:4px solid ' + borderColor + '; opacity:' + opacityVal + ';';

    var createdDate = item.timestamp ? new Date(item.timestamp).toLocaleDateString('de-DE') : '\u2014';
    var nameStyle = item.redeemed ? ' text-decoration:line-through; color:#999;' : '';
    var statusBg = item.redeemed ? '#fff3e0' : '#e8f5e9';
    var statusColor = item.redeemed ? '#e65100' : '#2e7d32';
    var statusText = item.redeemed ? 'Eingelöst' : 'Offen';
    var toggleText = item.redeemed ? 'Wieder \u00F6ffnen' : 'Einl\u00F6sen';
    var expiredLabel = expired ? '<span style="color:#c62828; font-weight:700; margin-left:6px;">abgelaufen</span>' : '';
    var validLine = item.validUntil ? '<div style="font-size:0.78rem; color:#888;">Gültig bis: ' + item.validUntil + expiredLabel + '</div>' : '';

    row.innerHTML = '<div style="flex:1; min-width:200px;">'
        + '<strong style="font-size:1rem;' + nameStyle + '">' + (item.recipient || '\u2014') + '</strong>'
        + '<div style="font-size:0.82rem; color:var(--text-light); margin-top:3px;">'
        + (item.flightType || '') + (item.value ? ' &middot; ' + item.value + ' \u20AC' : '') + ' &middot; ' + (item.number || '') + ' &middot; Erstellt: ' + createdDate
        + '</div>' + validLine + '</div>'
        + '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">'
        + '<button class="btn btn-secondary voucher-reprint-btn" style="padding:6px 12px; font-size:0.78rem; background:var(--primary); color:#fff; border-color:var(--primary);">PDF</button>'
        + '<button onclick="toggleVoucherRedeemed(\'' + item.id + '\', ' + (!!item.redeemed) + ', ' + (!!expired) + ')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem;">' + toggleText + '</button>'
        + '<button onclick="deleteVoucher(\'' + item.id + '\')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#c0392b; color:#fff; border-color:#c0392b;">L\u00F6schen</button>'
        + '</div>';

    // PDF-Button Event (vermeidet Probleme mit JSON in onclick)
    var reprintBtn = row.querySelector('.voucher-reprint-btn');
    reprintBtn.addEventListener('click', function() {
        if (typeof window.loadVoucherForReprint === 'function') {
            window.loadVoucherForReprint(item);
        }
    });

    return row;
}

// === Veranstaltungen / Termine ===

async function startEventsLogic() {
    const adminList = document.getElementById('events-admin-list');
    const publicList = document.getElementById('dynamic-events-list');
    const eventsForm = document.getElementById('events-form');
    const submitBtn = document.getElementById('events-submit-btn');
    const cancelBtn = document.getElementById('events-cancel-btn');
    const formHeadline = document.getElementById('events-form-headline');

    let editingEventId = null;

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            if (!document.getElementById('dynamic-news-list')) {
                signInAnonymously(auth).catch(() => {});
            }
            return;
        }
        const isAdmin = user && !user.isAnonymous;
        const eventsRef = collection(db, 'events');

        onSnapshot(eventsRef, (snapshot) => {
            const items = [];
            snapshot.forEach(d => items.push({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.order || 0) - (b.order || 0));

            if (publicList) renderEventsPublic(publicList, items);
            if (adminList) renderEventsAdmin(adminList, items, isAdmin);
        });
    });

    // Prüft ob ein Termin abgelaufen ist (validUntil im Format YYYY-MM-DD)
    function isExpired(item) {
        if (!item.validUntil) return false;
        var today = new Date(); today.setHours(0,0,0,0);
        var until = new Date(item.validUntil + 'T23:59:59');
        return today > until;
    }

    // Öffentliche Darstellung
    function renderEventsPublic(container, items) {
        const activeItems = items.filter(i => i.active !== false && !isExpired(i));
        if (activeItems.length === 0) {
            // Abschnitt ausblenden wenn keine aktiven Termine
            const section = container.closest('.content-block');
            if (section) section.style.display = 'none';
            return;
        }
        const section = container.closest('.content-block');
        if (section) section.style.display = '';

        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'card-grid';
        grid.style.marginTop = '20px';

        activeItems.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = 'background: var(--white); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow);';
            card.innerHTML =
                '<span style="background-color: var(--accent); color: white; padding: 5px 15px; border-radius: 50px; font-weight: bold; font-size: 0.9rem; display: inline-block; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(233, 69, 96, 0.3);">'
                    + escapeHTML(item.dateLabel || '') + '</span>'
                + '<h3 style="margin-top: 10px;">' + escapeHTML(item.title || '') + '</h3>'
                + '<p>' + escapeHTML(item.description || '') + '</p>';
            grid.appendChild(card);
        });
        container.innerHTML = '';
        container.appendChild(grid);
    }

    // Admin-Darstellung
    function renderEventsAdmin(container, items, isAdmin) {
        if (!isAdmin) { container.innerHTML = ''; return; }
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = '<p style="color:#999;">Noch keine Termine vorhanden.</p>';
            return;
        }

        items.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'price-row';
            row.draggable = true;
            row.dataset.id = item.id;
            row.dataset.index = idx;
            var expired = isExpired(item);
            row.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--white); border-radius: 8px; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: grab;'
                + (item.active === false || expired ? ' opacity: 0.5;' : '');

            var statusDot;
            if (expired) {
                statusDot = '<span title="Abgelaufen" style="color: #c0392b; font-size: 0.8rem; font-weight: bold;">abgelaufen</span>';
            } else if (item.active !== false) {
                statusDot = '<span title="Aktiv" style="color: #27ae60; font-size: 1.2rem;">●</span>';
            } else {
                statusDot = '<span title="Inaktiv" style="color: #999; font-size: 1.2rem;">○</span>';
            }

            var validUntilLabel = item.validUntil ? '<span style="color: var(--text-light); margin-left: 8px; font-size: 0.8rem;">bis ' + escapeHTML(item.validUntil) + '</span>' : '';

            row.innerHTML =
                '<span style="cursor:grab; font-size:1.2rem; color:#aaa;">☰</span>'
                + statusDot
                + '<div style="flex:1;">'
                    + '<strong>' + escapeHTML(item.title || '') + '</strong>'
                    + '<span style="color: var(--text-light); margin-left: 10px; font-size: 0.9rem;">' + escapeHTML(item.dateLabel || '') + '</span>'
                    + validUntilLabel
                + '</div>'
                + '<button class="edit-event-btn" style="background:var(--accent); color:white; border:none; padding:5px 12px; cursor:pointer; border-radius:4px; font-size:0.85rem;">Ändern</button>'
                + '<button class="delete-event-btn" style="background:#c0392b; color:white; border:none; padding:5px 12px; cursor:pointer; border-radius:4px; font-size:0.85rem;">Löschen</button>';

            // Bearbeiten
            row.querySelector('.edit-event-btn').onclick = () => {
                editingEventId = item.id;
                if (formHeadline) formHeadline.textContent = 'Termin bearbeiten';
                document.getElementById('event-title').value = item.title || '';
                document.getElementById('event-dateLabel').value = item.dateLabel || '';
                document.getElementById('event-description').value = item.description || '';
                document.getElementById('event-validUntil').value = item.validUntil || '';
                document.getElementById('event-active').checked = item.active !== false;
                if (cancelBtn) cancelBtn.style.display = '';
                if (submitBtn) submitBtn.textContent = 'Speichern';
            };

            // Löschen
            row.querySelector('.delete-event-btn').onclick = async () => {
                if (!confirm('Termin "' + (item.title || '') + '" wirklich löschen?')) return;
                try {
                    await deleteDoc(doc(db, 'events', item.id));
                } catch (e) { alert('Fehler: ' + e.message); }
            };

            // Drag & Drop
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', idx.toString());
                row.style.opacity = '0.4';
            });
            row.addEventListener('dragend', () => { row.style.opacity = ''; });
            row.addEventListener('dragover', (e) => { e.preventDefault(); row.style.borderTop = '3px solid var(--accent)'; });
            row.addEventListener('dragleave', () => { row.style.borderTop = ''; });
            row.addEventListener('drop', async (e) => {
                e.preventDefault();
                row.style.borderTop = '';
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                const toIdx = idx;
                if (fromIdx === toIdx) return;
                // Reihenfolge neu berechnen
                const reordered = [...items];
                const [moved] = reordered.splice(fromIdx, 1);
                reordered.splice(toIdx, 0, moved);
                for (let i = 0; i < reordered.length; i++) {
                    await updateDoc(doc(db, 'events', reordered[i].id), { order: i });
                }
            });

            container.appendChild(row);
        });
    }

    // Formular: Hinzufügen / Bearbeiten
    if (eventsForm) {
        eventsForm.onsubmit = async (e) => {
            e.preventDefault();
            if (!auth.currentUser || auth.currentUser.isAnonymous) {
                alert('Keine Berechtigung.');
                return;
            }

            const data = {
                title: document.getElementById('event-title').value.trim(),
                dateLabel: document.getElementById('event-dateLabel').value.trim(),
                description: document.getElementById('event-description').value.trim(),
                validUntil: document.getElementById('event-validUntil').value || '',
                active: document.getElementById('event-active').checked
            };

            if (!data.title) { alert('Bitte Titel eingeben.'); return; }

            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Speichern...'; }
                if (editingEventId) {
                    await updateDoc(doc(db, 'events', editingEventId), data);
                } else {
                    data.order = Date.now();
                    await addDoc(collection(db, 'events'), data);
                }
                resetEventsForm();
            } catch (err) {
                alert('Fehler: ' + err.message);
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Veröffentlichen'; }
            }
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => resetEventsForm();
    }

    function resetEventsForm() {
        editingEventId = null;
        if (eventsForm) eventsForm.reset();
        if (formHeadline) formHeadline.textContent = 'Neuer Termin';
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (submitBtn) submitBtn.textContent = 'Veröffentlichen';
        document.getElementById('event-active').checked = true;
    }
}

                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', initFirebase);
                    } else {
                        initFirebase();
                    }

