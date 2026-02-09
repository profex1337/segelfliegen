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

        // Update Nav Link
        const navIntern = document.getElementById('nav-intern');
        if (navIntern) {
            navIntern.style.display = isAdmin ? 'inline-block' : 'none';
        }

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
                            displayImage.src = item.imageUrl;
                            
                            
                            displayImage.classList.add('active-preview');
                        });

                        div.addEventListener('mouseleave', () => {
                            const defaultSrc = displayImage.getAttribute('data-default-src') || 'images/news.png';
                            displayImage.src = defaultSrc;
                            
                            
                            displayImage.classList.remove('active-preview');
                        });
                    }

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
                const imageVal = document.getElementById('news-image-url').value;

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
                            editingId = item.id;
                            document.getElementById('news-title').value = item.title;
                            document.getElementById('news-date').value = item.date;
                            document.getElementById('news-text').value = item.text;
                            document.getElementById('news-image-url').value = item.imageUrl || ''; 
                    
                            if(formHeadline) formHeadline.textContent = "Nachricht bearbeiten";
                            if(submitBtn) submitBtn.textContent = "Änderungen speichern";
                            if(cancelBtn) cancelBtn.style.display = "inline-block";
                            if(logoutBtn) logoutBtn.style.display = "none";
                            
                            adminPanel.scrollIntoView({behavior: "smooth"});
                        }
                    
                        function resetForm() {
                            editingId = null;
                            if(newsForm) newsForm.reset();
                            
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
                                    if (modal) modal.style.display = 'flex';
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
                    
                        const handleLogin = async () => {
                            const password = passwordInput.value.trim();
                            const email = "info@segelfliegen-altdorf.de"; 
                    
                            if (!password) return;
                    
                            try {
                                await signInWithEmailAndPassword(auth, email, password);
                                
                                loginModal.style.display = 'none';
                                passwordInput.value = '';
                                loginError.style.display = 'none';
                                
                            } catch (error) {
                                loginError.style.display = 'block';
                                loginError.textContent = "Falsches Passwort!";
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
                    
                    async function deleteNewsItem(docId) {
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
                            } catch (e) {
                                alert("Löschen fehlgeschlagen");
                            }
                        }
                    }
                    
                    initFirebase();

