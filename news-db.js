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

// === Bild-Upload: Komprimierung & GitHub ===

async function compressImage(file, maxWidth = 1200, quality = 0.80) {
    return new Promise((resolve) => {
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

    if (!newsContainer && !pricesContainer && !pricesAdmin && !aircraftAdminList && !aircraftPublicList) return;

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

        if (newsContainer) await startNewsLogic();
        if (pricesContainer || pricesAdmin) await startPricesLogic();
        if (aircraftAdminList || aircraftPublicList) await startAircraftLogic();

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

    // Bild-Vorschau beim Datei-Auswählen
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
                if (statusEl) statusEl.textContent = `Bereit: ${f.name} (${(f.size / 1024).toFixed(0)} KB) – wird beim Speichern komprimiert & hochgeladen`;
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
            signInAnonymously(auth).catch((err) => {});
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

            newsContainer.innerHTML = '';
            if (newsItems.length === 0) {
                newsContainer.innerHTML = '<p style="text-align:center;">Keine Nachrichten gefunden.</p>';
            } else {
                newsItems.forEach(item => {
                    const div = document.createElement('div');
                    const adminDisplay = isAdmin ? 'flex' : 'none';

                    if (isCardMode) {
                        // Card-Layout für index.html
                        div.className = 'news-card';
                        div.innerHTML = `
                            ${item.imageUrl ? `<div class="news-card-img">
                                <img src="${item.imageUrl}" alt="${item.title || ''}" class="zoomable" onerror="this.closest('.news-card-img').remove()">
                            </div>` : ''}
                            <div class="news-card-body">
                                <div class="admin-controls" style="float:right; display:${adminDisplay}; gap: 5px; align-items: center; margin-bottom: 8px;">
                                    <button class="edit-btn" style="background:#e94560; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Ändern</button>
                                    <button class="delete-btn" style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Löschen</button>
                                </div>
                                <span class="news-date">${item.date || ''}</span>
                                <h3>${item.title || 'Kein Titel'}</h3>
                                <p style="white-space: pre-wrap;">${item.text || ''}</p>
                            </div>
                        `;
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
                            <span class="news-date">${item.date || ''}</span>
                            <h3>${item.title || 'Kein Titel'}</h3>
                            <p style="white-space: pre-wrap;">${item.text || ''}</p>
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
                        deleteNewsItem(item.id, item.imageUrl);
                    }

                    const editButton = div.querySelector('.edit-btn');
                    editButton.onclick = (e) => {
                        e.stopPropagation();
                        loadIntoForm(item);
                    }

                    newsContainer.appendChild(div);
                });
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

                // Bild: Datei hochladen oder vorhandene URL beibehalten
                const fileEl = document.getElementById('news-image-file');
                const imageUrlHidden = document.getElementById('news-image-url');
                let imageVal = imageUrlHidden ? imageUrlHidden.value : '';

                if (fileEl && fileEl.files.length > 0) {
                    const token = localStorage.getItem('gh_pat') || '';
                    if (!token) {
                        alert('Bitte zuerst einen GitHub Token eingeben, um Bilder hochzuladen.');
                        return;
                    }
                    const statusEl = document.getElementById('image-upload-status');
                    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Bild wird hochgeladen…'; }
                    if (statusEl) statusEl.textContent = 'Komprimiere und lade hoch…';
                    try {
                        const compressed = await compressImage(fileEl.files[0]);
                        const safeName = `news_${Date.now()}.webp`;
                        imageVal = await uploadToGitHub(compressed, safeName, token);
                        if (imageUrlHidden) imageUrlHidden.value = imageVal;
                        if (statusEl) statusEl.textContent = `Hochgeladen: ${safeName}`;
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
                        imageUrl: imageVal
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
                            document.getElementById('news-image-url').value = item.imageUrl || '';

                            // Datei-Input zurücksetzen, aktuelles Bild anzeigen
                            const fileEl2 = document.getElementById('news-image-file');
                            const previewCont = document.getElementById('image-preview-container');
                            const currentInfo = document.getElementById('current-image-info');
                            const currentLink = document.getElementById('current-image-link');
                            if (fileEl2) fileEl2.value = '';
                            if (previewCont) previewCont.style.display = 'none';
                            if (item.imageUrl && currentInfo && currentLink) {
                                currentLink.href = item.imageUrl;
                                currentInfo.style.display = 'block';
                            } else if (currentInfo) {
                                currentInfo.style.display = 'none';
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
                            if (imageUrlHidden2) imageUrlHidden2.value = '';
                            if (previewCont2) previewCont2.style.display = 'none';
                            if (currentInfo2) currentInfo2.style.display = 'none';

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

                    async function deleteNewsItem(docId, imageUrl) {
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

                                // Bild aus GitHub löschen wenn vorhanden
                                const token = localStorage.getItem('gh_pat');
                                if (token && imageUrl) {
                                    await deleteFromGitHub(imageUrl, token);
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

                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', initFirebase);
                    } else {
                        initFirebase();
                    }

