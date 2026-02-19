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
    
    if (!newsContainer) return;

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

        await startNewsLogic();

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

            newsContainer.innerHTML = '';
            if (newsItems.length === 0) {
                newsContainer.innerHTML = '<p style="text-align:center;">Keine Nachrichten gefunden.</p>';
            } else {
                newsItems.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'news-item';
                    
                    if (item.imageUrl) {
                        div.setAttribute('data-has-image', 'true');
                    }

                    const adminDisplay = isAdmin ? 'flex' : 'none';

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
                        const match = imageUrl && imageUrl.match(/raw\.githubusercontent\.com\/profex1337\/segelfliegen\/main\/(images\/news_[^?]+)/);
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
                    
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', initFirebase);
                    } else {
                        initFirebase();
                    }

