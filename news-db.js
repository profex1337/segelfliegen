/* ---------------------------------------------------------------------------------------
   NEWS-DB.JS - NUR FÜR DIE DATENBANK (FIREBASE)
   Diese Datei wird als Modul geladen. Wenn sie fehlschlägt, fehlt nur der News-Teil.
--------------------------------------------------------------------------------------- */

console.log("1. news-db.js wurde geladen."); // DEBUG

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Hilfsfunktion zum Hashen des Passworts (SHA-256)
async function hashPassword(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// DEBUG: Hash Test beim Start
hashPassword("stöckelsberg").then(h => console.log("DEBUG: Erwarteter Hash für 'stöckelsberg' ist:", h));

// Initialisierung versuchen
async function initFirebase() {
    console.log("2. initFirebase gestartet");
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

        console.log("3. Firebase initialisiert");
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
    console.log("4. startNewsLogic läuft");
    
    const newsContainer = document.getElementById('dynamic-news-list');
    const adminToggle = document.getElementById('admin-toggle');
    const adminPanel = document.getElementById('admin-panel');
    const newsForm = document.getElementById('news-form');
    
    // Login Modal Elemente
    const loginModal = document.getElementById('login-modal');
    const loginClose = document.getElementById('login-close');
    const passwordInput = document.getElementById('admin-password-input');
    const loginError = document.getElementById('login-error');
    const loginFormTag = document.getElementById('admin-login-form'); // NEU

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
                checkAndImportData(newsCollection);
                newsContainer.innerHTML = '<p style="text-align:center;">Keine Nachrichten gefunden.</p>';
            } else {
                newsItems.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'news-item';
                    div.innerHTML = `
                        <button class="delete-btn" style="float:right; background:red; color:white; border:none; padding:5px; display:${document.body.classList.contains('admin-mode') ? 'block' : 'none'}">Löschen</button>
                        <span class="news-date">${item.date || ''}</span>
                        <h3>${item.title || 'Kein Titel'}</h3>
                        <p>${item.text || ''}</p>
                    `;
                    const delBtn = div.querySelector('.delete-btn');
                    delBtn.onclick = () => deleteNewsItem(item.id);
                    
                    newsContainer.appendChild(div);
                });
            }
        });

        // Formular
        if (newsForm) {
            newsForm.onsubmit = async (e) => {
                e.preventDefault();
                try {
                    await addDoc(newsCollection, {
                        title: document.getElementById('news-title').value,
                        date: document.getElementById('news-date').value,
                        text: document.getElementById('news-text').value,
                        timestamp: Date.now()
                    });
                    newsForm.reset();
                } catch (err) {
                    console.error("Fehler beim Speichern:", err);
                }
            };
        }
    });

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
        
        console.log("Eingabe:", input);
        console.log("Berechneter Hash:", inputHash);

        // Hash für "stöckelsberg"
        const targetHash = "f6339d29c36214197592815616f91d094770387532395632007823700055745e";

        if (inputHash === targetHash) {
            console.log("Passwort KORREKT!");
            document.body.classList.add('admin-mode');
            
            if(adminPanel) adminPanel.classList.add('active');
            
            loginModal.style.display = 'none';
            passwordInput.value = '';
            loginError.style.display = 'none';
            
            document.querySelectorAll('.delete-btn').forEach(btn => btn.style.display = 'block');
        } else {
            console.log("Passwort FALSCH.");
            loginError.style.display = 'block';
            passwordInput.value = '';
        }
    };

    // Formular Submit Event (Wichtig für Browser Kompatibilität)
    if (loginFormTag) {
        loginFormTag.addEventListener('submit', (e) => {
            e.preventDefault(); // Verhindert das Neuladen der Seite
            handleLogin();
        });
    }

    // Klick außerhalb des Modals schließt es
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

// Auto Import
async function checkAndImportData(collectionRef) {
    try {
        const snapshot = await getDocs(collectionRef);
        if (snapshot.empty) {
             const oldNews = [
                { title: "Hallenfest", date: "14.09.2025", text: "Vielen Dank für euren Besuch auf unserem Hallenfest!", timestamp: Date.now() },
                { title: "VGC Treffen!", date: "05.05.2025", text: "Ein voller Erfolg war das VGC Treffen.", timestamp: Date.now() - 10000 },
                { title: "Traumwetter!", date: "08.04.2025", text: "Bei Traumwetter starten wir in die Saison!", timestamp: Date.now() - 20000 }
            ];
            for (const item of oldNews) {
                await addDoc(collectionRef, item);
            }
        }
    } catch(e) { console.log(e); }
}

initFirebase();