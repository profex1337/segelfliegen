/* ---------------------------------------------------------------------------------------
   NEWS-DB.JS - NUR FÜR DIE DATENBANK (FIREBASE)
   Diese Datei wird als Modul geladen. Wenn sie fehlschlägt, fehlt nur der News-Teil.
--------------------------------------------------------------------------------------- */

console.log("1. news-db.js wurde geladen."); 

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Hilfsfunktion zum Hashen des Passworts (SHA-256)
async function hashPassword(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Initialisierung versuchen
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

    // Login Modal Elemente
    const loginModal = document.getElementById('login-modal');
    const loginClose = document.getElementById('login-close');
    const passwordInput = document.getElementById('admin-password-input');
    const loginError = document.getElementById('login-error');
    const loginFormTag = document.getElementById('admin-login-form');

    // Auth
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && (!YOUR_OWN_CONFIG || Object.keys(YOUR_OWN_CONFIG).length === 0)) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (e) {
        console.error("Login Fehler:", e);
    }

    onAuthStateChanged(auth, (user) => {
        if (!user) return;
        const newsCollection = collectionPath(db);

        // Anzeige
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
                    
                    // Style für Admin Mode prüfen
                    const isAdmin = document.body.classList.contains('admin-mode');
                    const adminDisplay = isAdmin ? 'flex' : 'none'; // Flexbox für Alignment!
                    
                    div.innerHTML = `
                        <!-- Buttons Container mit Flexbox -->
                        <div class="admin-controls" style="float:right; display:${adminDisplay}; gap: 5px; align-items: center;">
                            <button class="edit-btn" style="background:#e94560; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Ändern</button>
                            <button class="delete-btn" style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; height: 30px;">Löschen</button>
                        </div>
                        <span class="news-date">${item.date || ''}</span>
                        <h3>${item.title || 'Kein Titel'}</h3>
                        <p style="white-space: pre-wrap;">${item.text || ''}</p>
                    `;
                    
                    // Event Listener
                    const delBtn = div.querySelector('.delete-btn');
                    delBtn.onclick = () => deleteNewsItem(item.id);

                    const editButton = div.querySelector('.edit-btn');
                    editButton.onclick = () => loadIntoForm(item);
                    
                    newsContainer.appendChild(div);
                });
            }
        });

        // Formular Absenden
        if (newsForm) {
            newsForm.onsubmit = async (e) => {
                e.preventDefault();
                const titleVal = document.getElementById('news-title').value;
                const dateVal = document.getElementById('news-date').value;
                const textVal = document.getElementById('news-text').value;

                try {
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
                        await updateDoc(docRef, { title: titleVal, date: dateVal, text: textVal });
                        alert("Änderungen gespeichert!");
                    } else {
                        // CREATE
                        await addDoc(newsCollection, { title: titleVal, date: dateVal, text: textVal, timestamp: Date.now() });
                    }
                    resetForm();

                } catch (err) {
                    console.error("Fehler beim Speichern:", err);
                    alert("Fehler beim Speichern: " + err.message);
                }
            };
        }
    });

    // --- HELPER ---

    function loadIntoForm(item) {
        editingId = item.id;
        document.getElementById('news-title').value = item.title;
        document.getElementById('news-date').value = item.date;
        document.getElementById('news-text').value = item.text;

        if(formHeadline) formHeadline.textContent = "📝 Nachricht bearbeiten";
        if(submitBtn) submitBtn.textContent = "Änderungen speichern";
        if(cancelBtn) cancelBtn.style.display = "inline-block";
        if(logoutBtn) logoutBtn.style.display = "none"; // Logout ausblenden beim Editieren, um Verwirrung zu vermeiden
        
        adminPanel.scrollIntoView({behavior: "smooth"});
    }

    function resetForm() {
        editingId = null;
        if(newsForm) newsForm.reset();
        
        if(formHeadline) formHeadline.textContent = "📝 Neue Nachricht verfassen";
        if(submitBtn) submitBtn.textContent = "Veröffentlichen";
        if(cancelBtn) cancelBtn.style.display = "none";
        if(logoutBtn) logoutBtn.style.display = "inline-block"; // Logout wieder zeigen
    }

    // Cancel Button Klick (Editieren abbrechen)
    if (cancelBtn) cancelBtn.onclick = resetForm;

    // Logout Button Klick (Admin Modus beenden)
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm("Admin Modus beenden?")) {
                document.body.classList.remove('admin-mode');
                adminPanel.classList.remove('active');
                
                // Alle Admin-Controls verstecken
                document.querySelectorAll('.admin-controls').forEach(el => el.style.display = 'none');
                
                resetForm(); // Formular leeren falls was drin stand
            }
        };
    }

    // --- LOGIN LOGIK ---
    
    // Modal öffnen
    if (adminToggle) {
        adminToggle.addEventListener('click', () => {
            if (loginModal) {
                loginModal.style.display = 'flex';
                if (passwordInput) passwordInput.focus();
            }
        });
    }

    // Modal schließen
    if (loginClose) {
        loginClose.onclick = () => {
            loginModal.style.display = 'none';
            loginError.style.display = 'none';
            passwordInput.value = '';
        };
    }

    // Login ausführen
    const handleLogin = async () => {
        let input = passwordInput.value.trim();
        if (!input) return;

        input = input.normalize('NFC');
        const inputHash = await hashPassword(input);
        const targetHash = "88340151310a94e871db8d912c26129a18d9658d3fe4d41565a13fe4b7089795";

        if (inputHash === targetHash) {
            document.body.classList.add('admin-mode');
            if(adminPanel) adminPanel.classList.add('active');
            
            loginModal.style.display = 'none';
            passwordInput.value = '';
            loginError.style.display = 'none';
            
            // Buttons anzeigen (mit Flexbox style setzen)
            document.querySelectorAll('.admin-controls').forEach(el => el.style.display = 'flex');
        } else {
            loginError.style.display = 'block';
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
            let collectionName = YOUR_OWN_CONFIG && Object.keys(YOUR_OWN_CONFIG).length > 0 ? 'news' : null;
            if(!collectionName) {
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'news', docId));
            } else {
                await deleteDoc(doc(db, collectionName, docId));
            }
        } catch (e) {
            console.error(e);
        }
    }
}

// Funktion leer, damit keine alten Daten mehr geladen werden
async function checkAndImportData(collectionRef) {
    // Leer gelassen, wie gewünscht
}

initFirebase();