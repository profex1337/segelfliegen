/* ---------------------------------------------------------------------------------------
   NEWS-DB.JS - NUR FÜR DIE DATENBANK (FIREBASE)
   Sicherheits-Update: Echte Authentifizierung via Email/Passwort statt Hash.
--------------------------------------------------------------------------------------- */

console.log("1. news-db.js wurde geladen."); 

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// NEU: signInWithEmailAndPassword und signOut hinzugefügt
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// DEINE KONFIGURATION
const YOUR_OWN_CONFIG = {
  apiKey: "AIzaSyB1X5H3LOGKOSrq59_am4YnkISyOyEUAg4",
  authDomain: "segelfliegen.firebaseapp.com",
  projectId: "segelfliegen",
  storageBucket: "segelfliegen.firebasestorage.app",
  messagingSenderId: "288557586639",
  appId: "1:288557586639:web:984329930e12601b04bfba",
  measurementId: "G-CKXEVQPL0J"
};

// Globale Variablen für dieses Modul
let app, auth, db;
let collectionPath = null; 
let editingId = null; // Speichert die ID der Nachricht, die gerade bearbeitet wird

// --- Initialisierung ---
async function initFirebase() {
    const newsContainer = document.getElementById('dynamic-news-list');
    
    if (!newsContainer) return;

    try {
        if (YOUR_OWN_CONFIG && Object.keys(YOUR_OWN_CONFIG).length > 0) {
            app = initializeApp(YOUR_OWN_CONFIG);
            auth = getAuth(app);
            db = getFirestore(app);
            collectionPath = (dbRef) => collection(dbRef, 'news');
        } else if (typeof __firebase_config !== 'undefined') {
            const firebaseConfig = JSON.parse(__firebase_config);
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            collectionPath = (dbRef) => collection(dbRef, 'artifacts', appId, 'public', 'data', 'news');
        } else {
            throw new Error("Keine Konfiguration gefunden");
        }

        await startNewsLogic();

    } catch (e) {
        console.warn("Datenbank Fehler (Offline?):", e);
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
    
    // Buttons
    const logoutBtn = document.getElementById('admin-logout-btn');
    const cancelBtn = document.getElementById('news-cancel-btn');
    const submitBtn = document.getElementById('news-submit-btn');
    const formHeadline = document.getElementById('form-headline');

    // Das große Bild auf der rechten Seite
    const displayImage = document.getElementById('news-display-image');

    // Login Modal Elemente
    const loginModal = document.getElementById('login-modal');
    const loginClose = document.getElementById('login-close');
    const passwordInput = document.getElementById('admin-password-input');
    const loginError = document.getElementById('login-error');
    const loginFormTag = document.getElementById('admin-login-form');

    // 1. Authentifizierung starten (Erstmal Anonym oder Custom Token)
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && (!YOUR_OWN_CONFIG || Object.keys(YOUR_OWN_CONFIG).length === 0)) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            // Wir versuchen nicht sofort anonym einzuloggen, das regelt der onAuthStateChanged listener,
            // falls kein User da ist. Aber wir starten es initial einmal, falls noch gar kein Status bekannt ist.
             // (Optional, onAuthStateChanged feuert auch so)
        }
    } catch (e) {
        console.error("Auth Init Fehler:", e);
    }

    // 2. Auth Status Überwachen (Das Herzstück der Sicherheit)
    onAuthStateChanged(auth, (user) => {
        
        // Fall A: Gar kein User eingeloggt? -> Als Gast (Anonym) einloggen, damit man lesen kann
        if (!user) {
            signInAnonymously(auth).catch((err) => console.error("Gast-Login fehlgeschlagen:", err));
            // UI aufräumen (Admin Zeug weg)
            toggleAdminUI(false);
            return; 
        }

        // Fall B: User ist da. Ist er Admin?
        // Ein anonymer User ist KEIN Admin. Ein Email-User IST Admin.
        const isAdmin = !user.isAnonymous;
        toggleAdminUI(isAdmin);

        // 3. Daten laden (passiert immer, egal ob Gast oder Admin)
        const newsCollection = collectionPath(db);

        onSnapshot(newsCollection, (snapshot) => {
            let newsItems = [];
            snapshot.forEach((doc) => {
                newsItems.push({ id: doc.id, ...doc.data() });
            });
            // Sortieren nach Datum (neu oben)
            newsItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            newsContainer.innerHTML = '';
            if (newsItems.length === 0) {
                newsContainer.innerHTML = '<p style="text-align:center;">Keine Nachrichten gefunden.</p>';
            } else {
                newsItems.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'news-item';
                    
                    // Markieren, wenn ein Bild da ist
                    if (item.imageUrl) {
                        div.setAttribute('data-has-image', 'true');
                    }

                    // Admin Buttons nur rendern, aber CSS Display wird über Klasse gesteuert (doppelt hält besser)
                    // Wir setzen display:flex oder none basierend auf dem aktuellen Auth Status
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
                    
                    // --- Bildwechsel bei Mouseover ---
                    if (item.imageUrl && displayImage) {
                        div.addEventListener('mouseenter', () => {
                            if (!displayImage.getAttribute('data-default-src')) {
                                displayImage.setAttribute('data-default-src', displayImage.src);
                            }
                            displayImage.src = item.imageUrl;
                        });

                        div.addEventListener('mouseleave', () => {
                            const defaultSrc = displayImage.getAttribute('data-default-src') || 'images/news.jpg';
                            displayImage.src = defaultSrc;
                        });
                    }

                    // --- Admin Aktionen ---
                    const delBtn = div.querySelector('.delete-btn');
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteNewsItem(item.id);
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

        // Formular Absenden
        if (newsForm) {
            newsForm.onsubmit = async (e) => {
                e.preventDefault();
                // Sicherheitscheck vor dem Senden
                if (auth.currentUser?.isAnonymous) {
                    alert("Sie haben keine Berechtigung (Gast-Modus). Bitte einloggen.");
                    return;
                }

                const titleVal = document.getElementById('news-title').value;
                const dateVal = document.getElementById('news-date').value;
                const textVal = document.getElementById('news-text').value;
                const imageVal = document.getElementById('news-image-url').value;

                try {
                    const dataToSave = { 
                        title: titleVal, 
                        date: dateVal, 
                        text: textVal, 
                        imageUrl: imageVal 
                    };

                    if (editingId) {
                        // UPDATE
                        let collectionName = YOUR_OWN_CONFIG && Object.keys(YOUR_OWN_CONFIG).length > 0 ? 'news' : null;
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
                        // CREATE
                        dataToSave.timestamp = Date.now();
                        await addDoc(newsCollection, dataToSave);
                    }
                    resetForm();

                } catch (err) {
                    console.error("Fehler beim Speichern:", err);
                    alert("Fehler: " + err.message + "\n(Sind Sie als Admin eingeloggt?)");
                }
            };
        }
    });

    // --- HELPER FUNKTIONEN ---

    // UI umschalten (Admin vs Gast)
    function toggleAdminUI(isAdmin) {
        if (isAdmin) {
            document.body.classList.add('admin-mode');
            if(adminPanel) adminPanel.classList.add('active');
            document.querySelectorAll('.admin-controls').forEach(el => el.style.display = 'flex');
        } else {
            document.body.classList.remove('admin-mode');
            if(adminPanel) adminPanel.classList.remove('active');
            document.querySelectorAll('.admin-controls').forEach(el => el.style.display = 'none');
            resetForm(); // Formular leeren falls noch offen
        }
    }

    function loadIntoForm(item) {
        editingId = item.id;
        document.getElementById('news-title').value = item.title;
        document.getElementById('news-date').value = item.date;
        document.getElementById('news-text').value = item.text;
        document.getElementById('news-image-url').value = item.imageUrl || ''; 

        if(formHeadline) formHeadline.textContent = "📝 Nachricht bearbeiten";
        if(submitBtn) submitBtn.textContent = "Änderungen speichern";
        if(cancelBtn) cancelBtn.style.display = "inline-block";
        if(logoutBtn) logoutBtn.style.display = "none";
        
        adminPanel.scrollIntoView({behavior: "smooth"});
    }

    function resetForm() {
        editingId = null;
        if(newsForm) newsForm.reset();
        
        if(formHeadline) formHeadline.textContent = "📝 Neue Nachricht verfassen";
        if(submitBtn) submitBtn.textContent = "Veröffentlichen";
        if(cancelBtn) cancelBtn.style.display = "none";
        if(logoutBtn) logoutBtn.style.display = "inline-block"; 
    }

    if (cancelBtn) cancelBtn.onclick = resetForm;

    // --- LOGOUT (Jetzt sicher) ---
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (confirm("Admin Modus beenden?")) {
                try {
                    await signOut(auth); // Loggt dich bei Google aus
                    // Der onAuthStateChanged Listener oben bemerkt das,
                    // setzt user = null, und loggt dich dann automatisch
                    // wieder als Gast (anonym) ein.
                } catch(e) {
                    console.error("Logout Fehler:", e);
                }
            }
        };
    }

    // --- LOGIN LOGIK (Modal) ---
    
    if (adminToggle) {
        adminToggle.addEventListener('click', () => {
            if (loginModal) {
                loginModal.style.display = 'flex';
                if (passwordInput) passwordInput.focus();
            }
        });
    }

    if (loginClose) {
        loginClose.onclick = () => {
            loginModal.style.display = 'none';
            loginError.style.display = 'none';
            passwordInput.value = '';
        };
    }

    // SICHERER LOGIN
    const handleLogin = async () => {
        const password = passwordInput.value.trim();
        // Hier fest deine Admin-Email eintragen (die du in der Firebase Console angelegt hast)
        const email = "admin@segelfliegen.de"; 

        if (!password) return;

        try {
            // Echter Login gegen Firebase Auth
            await signInWithEmailAndPassword(auth, email, password);
            
            // Wenn erfolgreich, schließen wir das Modal
            // (onAuthStateChanged kümmert sich um den Rest)
            loginModal.style.display = 'none';
            passwordInput.value = '';
            loginError.style.display = 'none';
            
        } catch (error) {
            console.error("Login fehlgeschlagen:", error);
            loginError.style.display = 'block';
            loginError.textContent = "Falsches Passwort!"; // oder Email nicht gefunden
            passwordInput.value = '';
        }
    };

    if (loginFormTag) {
        loginFormTag.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }

    window.onclick = (event) => {
        if (event.target == loginModal) {
            loginModal.style.display = "none";
            loginError.style.display = 'none';
            passwordInput.value = '';
        }
    };
}

// Löschen Funktion
async function deleteNewsItem(docId) {
    if (confirm("Wirklich löschen?")) {
        try {
            // Sicherheitscheck
            if (auth.currentUser?.isAnonymous) {
                alert("Fehlende Berechtigung.");
                return;
            }

            let collectionName = YOUR_OWN_CONFIG && Object.keys(YOUR_OWN_CONFIG).length > 0 ? 'news' : null;
            if(!collectionName) {
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'news', docId));
            } else {
                await deleteDoc(doc(db, collectionName, docId));
            }
        } catch (e) {
            console.error(e);
            alert("Löschen fehlgeschlagen: " + e.message);
        }
    }
}

initFirebase();
