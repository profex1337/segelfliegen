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
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

async function uploadToGitHub(blob, filename, token) {
    const owner = 'profex1337';
    const repo = 'segelfliegen';
    const branch = 'main';
    const path = `images/${filename}`;

    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });

    // Prüfen ob Datei bereits existiert (SHA für Update benötigt)
    let sha = null;
    try {
        const check = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
        });
        if (check.ok) sha = (await check.json()).sha;
    } catch {}

    const body = { message: `News-Bild: ${filename}`, content: base64, branch };
    if (sha) body.sha = sha;

    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || 'GitHub Upload fehlgeschlagen');
    }

    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

async function initFirebase() {
    const newsContainer = document.getElementById('dynamic-news-list');
    const pricesContainer = document.getElementById('dynamic-prices-list');
    const pricesAdmin = document.getElementById('prices-admin-list');
    const aircraftAdminList = document.getElementById('aircraft-admin-list');
    const aircraftPublicList = document.getElementById('dynamic-aircraft-list');
    const voucherList = document.getElementById('voucher-list');

    // Gutschein-Bestellformular auf mitfliegen.html erkennen
    const gutscheinForm = document.querySelector('form[data-emailjs="gutschein"]');
    const hasGutscheinForm = !!gutscheinForm;

    if (!newsContainer && !pricesContainer && !pricesAdmin && !aircraftAdminList && !aircraftPublicList && !voucherList && !hasGutscheinForm) return;

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

        if (newsContainer) await startNewsLogic();
        if (pricesContainer || pricesAdmin) await startPricesLogic();
        if (aircraftAdminList || aircraftPublicList) await startAircraftLogic();
        if (voucherList) await startVoucherLogic();

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

    // GitHub PAT Setup (wird in localStorage dauerhaft gespeichert)
    const patInput = document.getElementById('github-pat-input');
    const patSaveBtn = document.getElementById('github-pat-save-btn');
    const patRemoveBtn = document.getElementById('github-pat-remove-btn');
    const patStatus = document.getElementById('github-pat-status');

    const updatePatUI = () => {
        const stored = localStorage.getItem('gh_pat');
        if (stored) {
            if (patInput) { patInput.value = ''; patInput.placeholder = '(Token gespeichert)'; }
            if (patStatus) patStatus.textContent = 'Token gespeichert – bleibt bis zur manuellen Entfernung erhalten.';
            if (patRemoveBtn) patRemoveBtn.style.display = 'inline-block';
        } else {
            if (patInput) patInput.placeholder = 'ghp_...';
            if (patStatus) patStatus.textContent = '';
            if (patRemoveBtn) patRemoveBtn.style.display = 'none';
        }
    };
    updatePatUI();

    if (patSaveBtn) {
        patSaveBtn.onclick = () => {
            const val = patInput ? patInput.value.trim() : '';
            if (val) {
                localStorage.setItem('gh_pat', val);
                updatePatUI();
            }
        };
    }
    if (patRemoveBtn) {
        patRemoveBtn.onclick = () => {
            localStorage.removeItem('gh_pat');
            updatePatUI();
        };
    }

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

                    carousel.querySelector('.news-carousel-btn.prev').addEventListener('click', function(e) { e.stopPropagation(); goTo(current - 1); });
                    carousel.querySelector('.news-carousel-btn.next').addEventListener('click', function(e) { e.stopPropagation(); goTo(current + 1); });
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
                newsItems.forEach(function(item, index) {
                    const div = document.createElement('div');
                    const adminDisplay = isAdmin ? 'flex' : 'none';
                    const images = getImages(item);
                    const isPublicPage = !document.getElementById('intern-content');
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

                    newsContainer.appendChild(div);
                });

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
                    const token = localStorage.getItem('gh_pat') || '';
                    if (!token) {
                        alert('Bitte zuerst einen GitHub Token eingeben, um Bilder hochzuladen.');
                        return;
                    }
                    const statusEl = document.getElementById('image-upload-status');
                    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Bilder werden hochgeladen…'; }
                    try {
                        for (let i = 0; i < fileEl.files.length; i++) {
                            if (statusEl) statusEl.textContent = 'Lade Bild ' + (i + 1) + ' von ' + fileEl.files.length + ' hoch…';
                            const compressed = await compressImage(fileEl.files[i]);
                            const safeName = 'news_' + Date.now() + '_' + i + '.webp';
                            const url = await uploadToGitHub(compressed, safeName, token);
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
                    
                    async function deleteFromGitHub(imageUrl, token) {
                        // Nur GitHub-Raw-URLs löschen (news_*.webp im images/-Ordner)
                        const match = imageUrl && imageUrl.match(/raw\.githubusercontent\.com\/profex1337\/segelfliegen\/main\/(images\/(?:news|aircraft)_[^?]+)/);
                        if (!match) return;
                        const path = match[1];
                        const owner = 'profex1337';
                        const repo = 'segelfliegen';
                        const branch = 'main';

                        try {
                            const checkResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
                            });
                            if (!checkResp.ok) return; // Datei existiert nicht mehr
                            const { sha } = await checkResp.json();

                            await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Accept': 'application/vnd.github+json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ message: `News-Bild entfernt: ${path}`, sha, branch })
                            });
                        } catch {}
                    }

                    async function deleteNewsItem(docId, imageUrls) {
                        if (confirm("Wirklich löschen?")) {
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
                                const token = localStorage.getItem('gh_pat');
                                if (token && imageUrls && imageUrls.length > 0) {
                                    for (const url of imageUrls) {
                                        await deleteFromGitHub(url, token);
                                    }
                                }
                            } catch (e) {
                                alert("Löschen fehlgeschlagen");
                            }
                        }
                    }
                    
// === Preise (Gastfluggebühren) ===

let currentPriceItems = [];

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
    if (items.length === 0) return; // Statische Fallback-Preise beibehalten
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
        row.style.cssText = 'background:#f9f9f9; padding:15px; margin-bottom:10px; border-radius:8px;';

        row.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
                <input type="text" data-field="label" placeholder="Bezeichnung" style="flex:2 1 150px; padding:8px; border:1px solid #ddd; border-radius:4px;">
                <input type="text" data-field="description" placeholder="Beschreibung" style="flex:2 1 150px; padding:8px; border:1px solid #ddd; border-radius:4px;">
                <input type="text" data-field="price" placeholder="Preis" style="flex:0 0 100px; padding:8px; border:1px solid #ddd; border-radius:4px; text-align:right;">
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <button class="save-price-btn btn" style="padding:5px 12px; font-size:0.85rem;">Speichern</button>
                <button class="delete-price-btn btn btn-secondary" style="padding:5px 12px; font-size:0.85rem; background:#c0392b; color:#fff; border-color:#c0392b;">Löschen</button>
                <span class="price-save-status" style="color:#27ae60; font-size:0.8rem; display:none;"></span>
            </div>
        `;

        // Werte sicher per DOM-Property setzen
        row.querySelector('[data-field="label"]').value = item.label || '';
        row.querySelector('[data-field="description"]').value = item.description || '';
        row.querySelector('[data-field="price"]').value = item.price || '';

        row.querySelector('.save-price-btn').onclick = async () => {
            const data = {
                label: row.querySelector('[data-field="label"]').value,
                description: row.querySelector('[data-field="description"]').value,
                price: row.querySelector('[data-field="price"]').value,
                order: idx
            };
            try {
                await updateDoc(doc(db, 'prices', item.id), data);
                const status = row.querySelector('.price-save-status');
                status.textContent = 'Gespeichert';
                status.style.display = 'inline';
                setTimeout(() => status.style.display = 'none', 2000);
            } catch (e) {
                alert('Fehler beim Speichern: ' + e.message);
            }
        };

        row.querySelector('.delete-price-btn').onclick = async () => {
            if (confirm('\"' + (item.label || 'Position') + '\" wirklich löschen?')) {
                try {
                    await deleteDoc(doc(db, 'prices', item.id));
                } catch (e) {
                    alert('Fehler beim Löschen: ' + e.message);
                }
            }
        };

        container.appendChild(row);
    });
}

async function seedDefaultPrices() {
    const defaults = [
        { label: "Segelflug (Windenstart)", description: "bis 20 Minuten Flugzeit", price: "48,00 €", order: 0 },
        { label: "Gruppen ab 10 Personen", description: "bis 20 Minuten, Windenstart", price: "30,00 €", order: 1 },
        { label: "Segelflug (F-Schlepp)", description: "bis 20 Minuten", price: "80,00 €", order: 2 },
        { label: "Verlängerung Segelflug", description: "Jede weitere Minute über 20 Min. Flugzeit", price: "0,75 €", order: 3 },
        { label: "Motorsegler", description: "bis 15 Minuten", price: "55,00 €", order: 4 },
        { label: "Verlängerung Motorsegler", description: "jede weitere Minute", price: "3,75 €", order: 5 },
        { label: "Segelkunstflug", description: "mit F-Schlepp pauschal", price: "160,00 €", order: 6 }
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
                const token = localStorage.getItem('gh_pat') || '';
                if (!token) { alert('Bitte zuerst einen GitHub Token eingeben.'); return; }
                const statusEl = document.getElementById('aircraft-image-upload-status');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Bild wird hochgeladen…'; }
                if (statusEl) statusEl.textContent = 'Komprimiere und lade hoch…';
                try {
                    const compressed = await compressImage(fileEl.files[0]);
                    const safeName = `aircraft_${Date.now()}.webp`;
                    imageVal = await uploadToGitHub(compressed, safeName, token);
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

    function renderAircraftAdmin(container, items, isAdmin) {
        if (!isAdmin) { container.innerHTML = '<p style="color:#999;">Nur als Admin sichtbar.</p>'; return; }

        // Migration: alte Kategorie 'Motorsegler' → 'Motorflugzeuge'
        const legacyItems = items.filter(i => i.category === 'Motorsegler');
        if (legacyItems.length > 0) {
            Promise.all(legacyItems.map(i =>
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
                    if (!confirm(`"${item.name || 'Flugzeug'}" wirklich löschen?`)) return;
                    try {
                        await deleteDoc(doc(db, 'aircraft', item.id));
                        const token = localStorage.getItem('gh_pat');
                        if (token && item.imageUrl) await deleteFromGitHub(item.imageUrl, token);
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

    cats.forEach(cat => {
        const section = document.createElement('div');
        section.id = cat;
        section.style.cssText = 'margin-bottom: 60px;';
        const desc = categoryDescriptions[cat] ? `<p style="color:var(--text-light); margin-bottom:20px;">${categoryDescriptions[cat]}</p>` : '';
        section.innerHTML = `<h2 style="color:var(--primary); font-family:Montserrat,sans-serif; margin-bottom:8px;">${cat}</h2>${desc}`;
        const grid = document.createElement('div');
        grid.className = 'aircraft-card-grid';
        byCategory[cat].forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            if (item.highlight) card.style.cssText = 'border: 2px solid var(--accent); transform: scale(1.02); position:relative;';

            const specsLines = (item.specs || '').split('\n').filter(l => l.trim());
            const specsList = specsLines.map(l => `<li>${l.trim()}</li>`).join('');

            card.innerHTML = `
                ${item.highlight ? '<div class="badge-highlight">★ Highlight</div>' : ''}
                <div class="card-img-top">
                    <img src="${item.imageUrl || 'images/hero.jpg'}" alt="${item.name || ''}" loading="lazy" class="zoomable" onerror="this.src='images/hero.jpg'">
                </div>
                <div class="card-body">
                    <h3 class="card-title"${item.highlight ? ' style="color:var(--accent);"' : ''}>${item.name || '—'}</h3>
                    ${item.registration ? `<p style="font-size:0.9rem; color:#888; margin-top:-8px; margin-bottom:8px;">${item.registration}</p>` : ''}
                    ${item.type ? `<p style="font-size:0.9rem; margin-bottom:10px; font-weight:600;">${item.type}</p>` : ''}
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

    // Gutschein nach PDF-Generierung speichern (Event von intern.html)
    window.saveVoucherToFirestore = async (data) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        try {
            await addDoc(voucherRef, {
                ...data,
                timestamp: Date.now()
            });
        } catch (e) {
            console.error('Gutschein speichern fehlgeschlagen:', e);
        }
    };

    // Gutschein als eingelöst markieren
    window.toggleVoucherRedeemed = async (docId, currentStatus) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        try {
            await updateDoc(doc(db, 'vouchers', docId), { redeemed: !currentStatus });
        } catch (e) {
            console.error('Status-Update fehlgeschlagen:', e);
        }
    };

    // Gutschein löschen
    window.deleteVoucher = async (docId) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        if (!confirm('Gutschein wirklich löschen?')) return;
        try {
            await deleteDoc(doc(db, 'vouchers', docId));
        } catch (e) {
            console.error('Löschen fehlgeschlagen:', e);
        }
    };

    // Bestellung ins Formular laden
    window.loadVoucherOrder = (order) => {
        const recipient = document.getElementById('voucher-recipient');
        const flightType = document.getElementById('voucher-flight-type');
        const greeting = document.getElementById('voucher-greeting');
        const value = document.getElementById('voucher-value');
        if (recipient) recipient.value = order.empfaenger || '';
        if (flightType) flightType.value = order.flugart || '';
        if (greeting) greeting.value = order.grusstext || '';
        if (value) value.value = order.wert || '';
        var bestellerField = document.getElementById('voucher-besteller');
        if (bestellerField) bestellerField.value = order.name || '';
        var emailField = document.getElementById('voucher-order-email');
        if (emailField) emailField.value = order.email || '';
        // Zusatzzeit merken für Flugdauer auf dem PDF
        var zusatzField = document.getElementById('voucher-zusatzzeit');
        if (zusatzField) zusatzField.value = order.zusatzzeit || '0';
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
        if (!confirm('Bestellung wirklich löschen?')) return;
        try {
            await deleteDoc(doc(db, 'voucherOrders', docId));
        } catch (e) {
            console.error('Bestellung löschen fehlgeschlagen:', e);
        }
    };

    // Zahlungserinnerung an Kunden senden
    window.sendPaymentReminder = async (order) => {
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        if (!confirm('Zahlungserinnerung an ' + order.email + ' senden?')) return;

        // EPC-QR-Code URL
        var wert = (order.wert || '').replace(',', '.');
        var epcData = 'BCD\n002\n1\nSCT\nGENODEF1HSB\nSegelflieger im Post SV N\u00FCrnberg\nDE20760614820004555554\nEUR' + wert + '\n\n\nGutschein ' + (order.name || '');
        var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(epcData);

        var istAbholung = (order.zustellung || '').indexOf('Abholung') !== -1;
        var params = {
            subject: istAbholung ? 'Erinnerung \u2014 Gutschein-Abholung' : 'Zahlungserinnerung \u2014 Gutschein-Bestellung',
            title: 'Erinnerung',
            subtitle: istAbholung ? 'Dein Gutschein wartet auf Abholung' : 'Deine Zahlung steht noch aus',
            intro: istAbholung
                ? 'Hallo <strong>' + (order.name || '') + '</strong>,<br><br>wir m\u00F6chten dich freundlich daran erinnern, dass dein Flug-Gutschein beim Segelflugplatz Altdorf-Hagenhausen noch auf Abholung wartet.'
                : 'Hallo <strong>' + (order.name || '') + '</strong>,<br><br>wir m\u00F6chten dich freundlich daran erinnern, dass die Zahlung f\u00FCr deinen Flug-Gutschein beim Segelflugplatz Altdorf-Hagenhausen noch aussteht.',
            name: order.name || '',
            email: order.email || '',
            flugart: order.flugart || '',
            empfaenger: order.empfaenger || '',
            wert: order.wert || '',
            flugdauer: getFlugdauer(order.flugart || '', parseInt(order.zusatzzeit || '0', 10)),
            zustellung: order.zustellung || '',
            payment_info: buildPaymentInfoHtml(order.name || '', order.wert || '', order.zustellung || '', qrUrl)
        };

        try {
            await emailjs.send('service_cd14twj', 'template_ygdqime', params);
            alert('Zahlungserinnerung wurde an ' + order.email + ' gesendet.');
        } catch (e) {
            console.error('Reminder senden fehlgeschlagen:', e);
            alert('Fehler beim Senden: ' + (e.text || e.message || e));
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

    var besteller = order.name || '\u2014';
    var email = order.email || '';
    var telefon = order.telefon || '';
    var flugart = order.flugart || '';
    var empfaenger = order.empfaenger || '';
    var wert = order.wert || '';
    var gruss = order.grusstext || '';
    var zustellung = order.zustellung || '';

    var paidBadge = isPaid
        ? '<span style="font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:600; background:#e8f5e9; color:#2e7d32; margin-left:8px;">Bezahlt</span>'
        : '<span style="font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:600; background:#fff3e0; color:#e65100; margin-left:8px;">Unbezahlt</span>';

    var infoHtml = '<div style="flex:1; min-width:200px;' + (!isClosed && isPaid ? ' cursor:pointer;' : '') + '"' + (!isClosed && isPaid ? ' onclick="loadVoucherOrder(' + JSON.stringify(order).replace(/"/g, '&quot;') + ')"' : '') + '>'
        + '<strong style="font-size:1rem;">\u2709 ' + besteller + '</strong>' + paidBadge
        + '<div style="font-size:0.82rem; color:var(--text-light); margin-top:3px;">'
        + flugart + (wert ? ' &middot; ' + wert + ' \u20AC' : '') + ' &middot; F\u00FCr: ' + empfaenger
        + (zustellung ? ' &middot; <span style="font-weight:600; color:' + (zustellung.indexOf('Abholung') !== -1 ? '#6a1b9a' : '#1565c0') + ';">' + (zustellung.indexOf('Abholung') !== -1 ? '\uD83D\uDCCD Abholung' : '\u2709 \u00DCberweisung') + '</span>' : '')
        + '</div>'
        + '<div style="font-size:0.78rem; color:#888; margin-top:2px;">'
        + email + (telefon ? ' &middot; ' + telefon : '') + ' &middot; ' + orderDate
        + '</div>'
        + (gruss ? '<div style="font-size:0.78rem; color:#666; margin-top:4px; font-style:italic;">\u201E' + gruss + '\u201C</div>' : '')
        + '</div>';

    var buttonsHtml = '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">';

    if (isClosed) {
        buttonsHtml += '<button onclick="event.stopPropagation(); reopenVoucherOrder(\'' + order.id + '\')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem;">Wieder \u00F6ffnen</button>'
            + '<button onclick="event.stopPropagation(); deleteVoucherOrder(\'' + order.id + '\')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#c0392b; color:#fff; border-color:#c0392b;">L\u00F6schen</button>';
    } else {
        var paidBtnStyle = isPaid
            ? 'padding:6px 12px; font-size:0.78rem; background:#fff3e0; color:#e65100; border-color:#e65100;'
            : 'padding:6px 12px; font-size:0.78rem; background:#2e7d32; color:#fff; border-color:#2e7d32;';
        var paidBtnText = isPaid ? 'Unbezahlt' : 'Bezahlt';

        buttonsHtml += '<button onclick="event.stopPropagation(); toggleOrderPaid(\'' + order.id + '\', ' + isPaid + ')" class="btn btn-secondary" style="' + paidBtnStyle + '">' + paidBtnText + '</button>'
            + (isPaid ? '<button onclick="event.stopPropagation(); loadVoucherOrder(' + JSON.stringify(order).replace(/"/g, '&quot;') + ')" class="btn" style="padding:6px 14px; font-size:0.78rem;">\u00DCbernehmen</button>' : '')
            + (!isPaid ? '<button onclick="event.stopPropagation(); sendPaymentReminder(' + JSON.stringify(order).replace(/"/g, '&quot;') + ')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#e65100; color:#fff; border-color:#e65100;">Reminder</button>' : '')
            + (isPaid ? '<button onclick="event.stopPropagation(); completeVoucherOrder(\'' + order.id + '\')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#6a1b9a; color:#fff; border-color:#6a1b9a;">Abschlie\u00DFen</button>' : '')
            + '<button onclick="event.stopPropagation(); deleteVoucherOrder(\'' + order.id + '\')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#c0392b; color:#fff; border-color:#c0392b;">L\u00F6schen</button>';
    }
    buttonsHtml += '</div>';

    row.innerHTML = infoHtml + buttonsHtml;
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
    var bgColor = item.redeemed ? '#fff8e1' : '#f9f9f9';
    var borderColor = item.redeemed ? '#ffa000' : '#2e7d32';
    var opacityVal = item.redeemed ? '0.75' : '1';
    row.style.cssText = 'display:flex; align-items:center; gap:16px; padding:14px 18px; margin-bottom:8px; border-radius:8px; flex-wrap:wrap; background:' + bgColor + '; border-left:4px solid ' + borderColor + '; opacity:' + opacityVal + ';';

    var createdDate = item.timestamp ? new Date(item.timestamp).toLocaleDateString('de-DE') : '\u2014';
    var nameStyle = item.redeemed ? ' text-decoration:line-through; color:#999;' : '';
    var statusBg = item.redeemed ? '#fff3e0' : '#e8f5e9';
    var statusColor = item.redeemed ? '#e65100' : '#2e7d32';
    var statusText = item.redeemed ? 'Eingelöst' : 'Offen';
    var toggleText = item.redeemed ? 'Wieder \u00F6ffnen' : 'Eingelöst';
    var validLine = item.validUntil ? '<div style="font-size:0.78rem; color:#888;">Gültig bis: ' + item.validUntil + '</div>' : '';

    row.innerHTML = '<div style="flex:1; min-width:200px;">'
        + '<strong style="font-size:1rem;' + nameStyle + '">' + (item.recipient || '\u2014') + '</strong>'
        + '<div style="font-size:0.82rem; color:var(--text-light); margin-top:3px;">'
        + (item.flightType || '') + (item.value ? ' &middot; ' + item.value + ' \u20AC' : '') + ' &middot; ' + (item.number || '') + ' &middot; Erstellt: ' + createdDate
        + '</div>' + validLine + '</div>'
        + '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">'
        + '<button onclick="toggleVoucherRedeemed(\'' + item.id + '\', ' + (!!item.redeemed) + ')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem;">' + toggleText + '</button>'
        + '<button onclick="deleteVoucher(\'' + item.id + '\')" class="btn btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:#c0392b; color:#fff; border-color:#c0392b;">L\u00F6schen</button>'
        + '</div>';
    return row;
}

                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', initFirebase);
                    } else {
                        initFirebase();
                    }

