/* ---------------------------------------------------------------------------------------
   NEWS-DB.JS - NUR FÜR DIE DATENBANK (FIREBASE)
   Diese Datei wird als Modul geladen. Wenn sie fehlschlägt, fehlt nur der News-Teil.
--------------------------------------------------------------------------------------- */

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

// Initialisierung versuchen
async function initFirebase() {
    const newsContainer = document.getElementById('dynamic-news-list');
    if (!newsContainer) return; // Wir sind nicht auf der Seite mit News

    try {
        if (YOUR_OWN_CONFIG && Object.keys(YOUR_OWN_CONFIG).length > 0) {
            // Production Mode
            console.log("Verbinde mit Datenbank: " + YOUR_OWN_CONFIG.projectId);
            app = initializeApp(YOUR_OWN_CONFIG);
            auth = getAuth(app);
            db = getFirestore(app);
            collectionPath = (dbRef) => collection(dbRef, 'news');
        } else if (typeof __firebase_config !== 'undefined') {
            // Preview Mode
            const firebaseConfig = JSON.parse(__firebase_config);
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            collectionPath = (dbRef) => collection(dbRef, 'artifacts', appId, 'public', 'data', 'news');
        } else {
            throw new Error("Keine Konfiguration gefunden");
        }

        // Login und Start
        await startNewsLogic();

    } catch (e) {
        console.warn("Datenbank Fehler (Offline?):", e);
        newsContainer.innerHTML = `
            <div class="news-item">
                <span class="news-date">Hinweis</span>
                <h3>Offline Modus</h3>
                <p>Die Neuigkeiten konnten nicht geladen werden. Bitte prüfe deine Internetverbindung.</p>
            </div>`;
    }
}

async function startNewsLogic() {
    const newsContainer = document.getElementById('dynamic-news-list');
    const adminToggle = document.getElementById('admin-toggle');
    const adminPanel = document.getElementById('admin-panel');
    const newsForm = document.getElementById('news-form');

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
                // Import Check
                checkAndImportData(newsCollection);
                newsContainer.innerHTML = '<p style="text-align:center;">Keine Nachrichten gefunden.</p>';
            } else {
                newsItems.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'news-item';
                    div.innerHTML = `
                        <button class="delete-btn" style="float:right; background:red; color:white; border:none; padding:5px; display:${document.body.classList.contains('admin-mode') ? 'block' : 'none'}" onclick="window.deleteNews('${item.id}')">Löschen</button>
                        <span class="news-date">${item.date || ''}</span>
                        <h3>${item.title || 'Kein Titel'}</h3>
                        <p>${item.text || ''}</p>
                    `;
                    // Event Listener für den dynamischen Button direkt hier anhängen, 
                    // da window.deleteNews über Module schwer global erreichbar ist
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
                await addDoc(newsCollection, {
                    title: document.getElementById('news-title').value,
                    date: document.getElementById('news-date').value,
                    text: document.getElementById('news-text').value,
                    timestamp: Date.now()
                });
                newsForm.reset();
                alert("Gespeichert!");
            };
        }
    });

    // Admin Toggle
    if (adminToggle) {
        adminToggle.addEventListener('click', () => {
            if(prompt("Passwort:") === 'segelflug') {
                document.body.classList.add('admin-mode');
                adminPanel.classList.add('active');
                // Löschen Buttons sichtbar machen
                document.querySelectorAll('.delete-btn').forEach(btn => btn.style.display = 'block');
            }
        });
    }
}

// Löschen Funktion (Intern)
async function deleteNewsItem(docId) {
    if (confirm("Wirklich löschen?")) {
        try {
            // Wir müssen den Pfad neu bauen oder die Collection nutzen
            // Einfachster Weg: doc() mit db referenz
            let collectionName = YOUR_OWN_CONFIG && Object.keys(YOUR_OWN_CONFIG).length > 0 ? 'news' : null;
            if(!collectionName) {
                // Preview Logic complex path reconstruction... 
                // Einfacher: Wir nutzen deleteDoc mit der Referenz, die wir haben, aber wir haben hier keine direkte Ref.
                // Alternative: Neu holen.
                console.log("Lösche in Preview Mode nicht unterstützt via einfachem Button - bitte neu laden.");
                return;
            }
            await deleteDoc(doc(db, collectionName, docId));
        } catch (e) {
            console.error(e);
            alert("Fehler beim Löschen");
        }
    }
}

// Auto Import
async function checkAndImportData(collectionRef) {
    try {
        const snapshot = await getDocs(collectionRef);
        if (snapshot.empty) {
             console.log("Importiere Start-Daten...");
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

// Modul starten
initFirebase();