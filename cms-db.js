import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1X5H3LOGKOSrq59_am4YnkISyOyEUAg4",
    authDomain: "segelfliegen.firebaseapp.com",
    projectId: "segelfliegen",
    storageBucket: "segelfliegen.firebasestorage.app",
    messagingSenderId: "288557586639",
    appId: "1:288557586639:web:984329930e12601b04bfba"
};

let app, auth, db;
let editingFlugzeugId = null;
let editingPreisId = null;

// === Bild-Utilities (identisch mit news-db.js) ===

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

    let sha = null;
    try {
        const check = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
        });
        if (check.ok) sha = (await check.json()).sha;
    } catch {}

    const body = { message: `Flugzeug-Bild: ${filename}`, content: base64, branch };
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

async function deleteFromGitHub(imageUrl, token) {
    // Nur dynamisch hochgeladene Flugzeug-Bilder löschen (flugzeug_*.webp)
    const match = imageUrl && imageUrl.match(/raw\.githubusercontent\.com\/profex1337\/segelfliegen\/main\/(images\/flugzeug_[^?]+)/);
    if (!match) return;
    const path = match[1];
    const owner = 'profex1337';
    const repo = 'segelfliegen';
    const branch = 'main';

    try {
        const checkResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
        });
        if (!checkResp.ok) return;
        const { sha } = await checkResp.json();

        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: `Flugzeug-Bild entfernt: ${path}`, sha, branch })
        });
    } catch {}
}

// === Firestore Pfad-Helfer ===

function getCollectionRef(name) {
    if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
        return collection(db, name);
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return collection(db, 'artifacts', appId, 'public', 'data', name);
}

function getDocRef(collectionName, docId) {
    if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
        return doc(db, collectionName, docId);
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId);
}

// === Spezifikationen parsen (ein Eintrag pro Zeile: "Schlüssel: Wert") ===

function specsToHtml(specsStr) {
    return (specsStr || '').split('\n')
        .filter(s => s.trim())
        .map(s => {
            const colonIdx = s.indexOf(':');
            if (colonIdx === -1) return `<li>${s.trim()}</li>`;
            const key = s.substring(0, colonIdx).trim();
            const val = s.substring(colonIdx + 1).trim();
            return `<li><strong>${key}:</strong> ${val}</li>`;
        }).join('');
}

// ============================================================
// === FLUGZEUGPARK ===
// ============================================================

// Öffentliche Ansicht auf flugzeugpark.html
function renderFlugzeugePage(items) {
    const kategorien = ['Segelflugzeuge', 'Motorsegler', 'Oldtimer', 'Winde'];
    kategorien.forEach(cat => {
        const container = document.getElementById(`flugzeuge-grid-${cat}`);
        if (!container) return;

        const catItems = items
            .filter(i => i.category === cat)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        // Nur ersetzen wenn Firestore-Daten vorhanden – sonst statisches HTML beibehalten
        if (catItems.length === 0) return;

        container.innerHTML = '';
        catItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            if (item.highlight) {
                card.style.cssText = 'border: 2px solid var(--accent); transform: scale(1.02);';
            }

            const regHtml = item.registration
                ? ` <span style="font-weight:normal; font-size: 0.9rem; color:#666;">(${item.registration})</span>`
                : '';
            const titleStyle = item.highlight ? ' style="color: var(--accent);"' : '';

            card.innerHTML = `
                ${item.highlight ? '<div class="badge-highlight">★ Highlight</div>' : ''}
                <div class="card-img-top">
                    <img src="${item.imageUrl || 'images/hero.jpg'}" alt="${item.name}" loading="lazy" class="zoomable" onerror="this.src='images/hero.jpg'">
                </div>
                <div class="card-body">
                    <h3 class="card-title"${titleStyle}>${item.name}${regHtml}</h3>
                    ${item.subtitle ? `<p style="font-size: 0.9rem; margin-bottom: 10px; font-weight: 600;">${item.subtitle}</p>` : ''}
                    <ul class="data-list" style="font-size: 0.9rem; margin-top: 10px;">${specsToHtml(item.specs)}</ul>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// Admin-Liste auf intern.html
function renderFlugzeugAdminList(items) {
    const container = document.getElementById('flugzeuge-admin-list');
    if (!container) return;

    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<p style="color:#999;">Noch keine Flugzeuge erfasst. Nutzen Sie das Formular oben, um Flugzeuge hinzuzufügen.</p>';
        return;
    }

    const byCategory = {};
    items.forEach(item => {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
    });

    ['Segelflugzeuge', 'Motorsegler', 'Oldtimer', 'Winde'].forEach(cat => {
        if (!byCategory[cat] || byCategory[cat].length === 0) return;
        const catDiv = document.createElement('div');
        catDiv.style.marginBottom = '20px';
        catDiv.innerHTML = `<h4 style="color:var(--primary); margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:6px;">${cat}</h4>`;

        byCategory[cat]
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; align-items:center; gap:12px; padding:10px; background:#f9f9f9; border-radius:8px; margin-bottom:8px;';
                row.innerHTML = `
                    ${item.imageUrl
                        ? `<img src="${item.imageUrl}" alt="${item.name}" style="width:64px; height:48px; object-fit:cover; border-radius:6px; flex-shrink:0;">`
                        : `<div style="width:64px; height:48px; background:#e0e0e0; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">✈️</div>`}
                    <div style="flex:1; min-width:0;">
                        <strong>${item.name}</strong>${item.registration ? ` <span style="color:#888;">(${item.registration})</span>` : ''}
                        ${item.highlight ? ' <span style="color:var(--accent); font-size:0.8rem; font-weight:600;">★ Highlight</span>' : ''}
                        <div style="font-size:0.8rem; color:#888; margin-top:2px;">${item.category} · Reihenfolge: ${item.sortOrder || 0}</div>
                    </div>
                    <button class="edit-f-btn" style="background:var(--accent); color:white; border:none; padding:6px 12px; cursor:pointer; border-radius:4px; white-space:nowrap;">Ändern</button>
                    <button class="delete-f-btn" style="background:#c0392b; color:white; border:none; padding:6px 12px; cursor:pointer; border-radius:4px; white-space:nowrap;">Löschen</button>
                `;
                row.querySelector('.edit-f-btn').onclick = () => loadFlugzeugIntoForm(item);
                row.querySelector('.delete-f-btn').onclick = () => deleteFlugzeug(item.id, item.imageUrl);
                catDiv.appendChild(row);
            });

        container.appendChild(catDiv);
    });
}

function loadFlugzeugIntoForm(item) {
    editingFlugzeugId = item.id;
    document.getElementById('fz-name').value = item.name || '';
    document.getElementById('fz-registration').value = item.registration || '';
    document.getElementById('fz-category').value = item.category || 'Segelflugzeuge';
    document.getElementById('fz-subtitle').value = item.subtitle || '';
    document.getElementById('fz-specs').value = item.specs || '';
    document.getElementById('fz-highlight').checked = item.highlight || false;
    document.getElementById('fz-sortorder').value = item.sortOrder || 0;
    document.getElementById('fz-image-url').value = item.imageUrl || '';

    const fileEl = document.getElementById('fz-image-file');
    const previewCont = document.getElementById('fz-image-preview-container');
    const currentInfo = document.getElementById('fz-current-image-info');
    const currentLink = document.getElementById('fz-current-image-link');
    if (fileEl) fileEl.value = '';
    if (previewCont) previewCont.style.display = 'none';
    if (item.imageUrl && currentInfo && currentLink) {
        currentLink.href = item.imageUrl;
        currentInfo.style.display = 'block';
    } else if (currentInfo) {
        currentInfo.style.display = 'none';
    }

    const headline = document.getElementById('fz-form-headline');
    const submitBtn = document.getElementById('fz-submit-btn');
    const cancelBtn = document.getElementById('fz-cancel-btn');
    if (headline) headline.textContent = 'Flugzeug bearbeiten';
    if (submitBtn) submitBtn.textContent = 'Änderungen speichern';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    document.getElementById('fz-form-section')?.scrollIntoView({ behavior: 'smooth' });
}

function resetFlugzeugForm() {
    editingFlugzeugId = null;
    document.getElementById('flugzeug-form')?.reset();
    const imageUrlHidden = document.getElementById('fz-image-url');
    const previewCont = document.getElementById('fz-image-preview-container');
    const currentInfo = document.getElementById('fz-current-image-info');
    if (imageUrlHidden) imageUrlHidden.value = '';
    if (previewCont) previewCont.style.display = 'none';
    if (currentInfo) currentInfo.style.display = 'none';

    const headline = document.getElementById('fz-form-headline');
    const submitBtn = document.getElementById('fz-submit-btn');
    const cancelBtn = document.getElementById('fz-cancel-btn');
    if (headline) headline.textContent = 'Neues Flugzeug hinzufügen';
    if (submitBtn) submitBtn.textContent = 'Flugzeug speichern';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function deleteFlugzeug(docId, imageUrl) {
    if (!confirm('Dieses Flugzeug wirklich löschen?')) return;
    try {
        await deleteDoc(getDocRef('flugzeuge', docId));
        const token = localStorage.getItem('gh_pat');
        if (token && imageUrl) await deleteFromGitHub(imageUrl, token);
    } catch (e) {
        alert('Löschen fehlgeschlagen: ' + e.message);
    }
}

function setupFlugzeugAdmin() {
    const form = document.getElementById('flugzeug-form');
    if (!form) return;

    // Bild-Vorschau
    const fileEl = document.getElementById('fz-image-file');
    if (fileEl) {
        fileEl.addEventListener('change', () => {
            const container = document.getElementById('fz-image-preview-container');
            const preview = document.getElementById('fz-image-preview');
            const statusEl = document.getElementById('fz-image-upload-status');
            if (fileEl.files.length > 0) {
                const f = fileEl.files[0];
                if (preview) preview.src = URL.createObjectURL(f);
                if (container) container.style.display = 'block';
                if (statusEl) statusEl.textContent = `Bereit: ${f.name} (${(f.size / 1024).toFixed(0)} KB) – wird beim Speichern komprimiert & hochgeladen`;
            } else {
                if (container) container.style.display = 'none';
            }
        });
    }

    const cancelBtn = document.getElementById('fz-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = resetFlugzeugForm;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('fz-submit-btn');

        const nameVal = document.getElementById('fz-name').value.trim();
        const registrationVal = document.getElementById('fz-registration').value.trim();
        const categoryVal = document.getElementById('fz-category').value;
        const subtitleVal = document.getElementById('fz-subtitle').value.trim();
        const specsVal = document.getElementById('fz-specs').value.trim();
        const highlightVal = document.getElementById('fz-highlight').checked;
        const sortOrderVal = parseInt(document.getElementById('fz-sortorder').value) || 0;

        const imageUrlHidden = document.getElementById('fz-image-url');
        let imageVal = imageUrlHidden ? imageUrlHidden.value : '';

        if (fileEl && fileEl.files.length > 0) {
            const token = localStorage.getItem('gh_pat') || '';
            if (!token) {
                alert('Bitte zuerst einen GitHub Token im Neuigkeiten-Tab eingeben, um Bilder hochzuladen.');
                return;
            }
            const statusEl = document.getElementById('fz-image-upload-status');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Bild wird hochgeladen…'; }
            if (statusEl) statusEl.textContent = 'Komprimiere und lade hoch…';
            try {
                const compressed = await compressImage(fileEl.files[0]);
                const safeName = `flugzeug_${Date.now()}.webp`;
                imageVal = await uploadToGitHub(compressed, safeName, token);
                if (imageUrlHidden) imageUrlHidden.value = imageVal;
                if (statusEl) statusEl.textContent = `Hochgeladen: ${safeName}`;
            } catch (uploadErr) {
                alert('Bild-Upload fehlgeschlagen: ' + uploadErr.message);
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editingFlugzeugId ? 'Änderungen speichern' : 'Flugzeug speichern'; }
                return;
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editingFlugzeugId ? 'Änderungen speichern' : 'Flugzeug speichern'; }
            }
        }

        const data = {
            name: nameVal,
            registration: registrationVal,
            category: categoryVal,
            subtitle: subtitleVal,
            specs: specsVal,
            highlight: highlightVal,
            sortOrder: sortOrderVal,
            imageUrl: imageVal
        };

        try {
            if (editingFlugzeugId) {
                await updateDoc(getDocRef('flugzeuge', editingFlugzeugId), data);
                alert('Flugzeug aktualisiert!');
            } else {
                data.timestamp = Date.now();
                await addDoc(getCollectionRef('flugzeuge'), data);
            }
            resetFlugzeugForm();
        } catch (err) {
            alert('Fehler beim Speichern: ' + err.message);
        }
    };
}

// ============================================================
// === PREISE ===
// ============================================================

// Öffentliche Ansicht auf mitfliegen.html
function renderPreiseListe(items) {
    const container = document.getElementById('preise-list');
    if (!container) return;

    const sorted = [...items].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Nur ersetzen wenn Firestore-Daten vorhanden – sonst statisches HTML beibehalten
    if (sorted.length === 0) return;

    container.innerHTML = '';
    sorted.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.name}</strong>
            <span>${item.description || ''}</span>
            <span style="float:right; font-weight:bold; color:var(--primary);">${item.price}</span>
        `;
        container.appendChild(li);
    });
}

// Admin-Liste auf intern.html
function renderPreiseAdminList(items) {
    const container = document.getElementById('preise-admin-list');
    if (!container) return;

    const sorted = [...items].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    container.innerHTML = '';

    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:#999;">Noch keine Preise erfasst. Nutzen Sie das Formular oben, um Preise hinzuzufügen.</p>';
        return;
    }

    sorted.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:12px; padding:10px; background:#f9f9f9; border-radius:8px; margin-bottom:8px;';
        row.innerHTML = `
            <div style="flex:1; min-width:0;">
                <strong>${item.name}</strong>
                <div style="font-size:0.85rem; color:#666; margin-top:2px;">${item.description || ''} — <span style="color:var(--primary); font-weight:600;">${item.price}</span> · Reihenfolge: ${item.sortOrder || 0}</div>
            </div>
            <button class="edit-pr-btn" style="background:var(--accent); color:white; border:none; padding:6px 12px; cursor:pointer; border-radius:4px; white-space:nowrap;">Ändern</button>
            <button class="delete-pr-btn" style="background:#c0392b; color:white; border:none; padding:6px 12px; cursor:pointer; border-radius:4px; white-space:nowrap;">Löschen</button>
        `;
        row.querySelector('.edit-pr-btn').onclick = () => loadPreisIntoForm(item);
        row.querySelector('.delete-pr-btn').onclick = () => deletePreis(item.id);
        container.appendChild(row);
    });
}

function loadPreisIntoForm(item) {
    editingPreisId = item.id;
    document.getElementById('preis-name').value = item.name || '';
    document.getElementById('preis-description').value = item.description || '';
    document.getElementById('preis-price').value = item.price || '';
    document.getElementById('preis-sortorder').value = item.sortOrder || 0;

    const headline = document.getElementById('preis-form-headline');
    const submitBtn = document.getElementById('preis-submit-btn');
    const cancelBtn = document.getElementById('preis-cancel-btn');
    if (headline) headline.textContent = 'Preis bearbeiten';
    if (submitBtn) submitBtn.textContent = 'Änderungen speichern';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    document.getElementById('preis-form-section')?.scrollIntoView({ behavior: 'smooth' });
}

function resetPreisForm() {
    editingPreisId = null;
    document.getElementById('preis-form')?.reset();

    const headline = document.getElementById('preis-form-headline');
    const submitBtn = document.getElementById('preis-submit-btn');
    const cancelBtn = document.getElementById('preis-cancel-btn');
    if (headline) headline.textContent = 'Neuen Preis hinzufügen';
    if (submitBtn) submitBtn.textContent = 'Preis speichern';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function deletePreis(docId) {
    if (!confirm('Diesen Preis wirklich löschen?')) return;
    try {
        await deleteDoc(getDocRef('preise', docId));
    } catch (e) {
        alert('Löschen fehlgeschlagen: ' + e.message);
    }
}

function setupPreiseAdmin() {
    const form = document.getElementById('preis-form');
    if (!form) return;

    const cancelBtn = document.getElementById('preis-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = resetPreisForm;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById('preis-name').value.trim(),
            description: document.getElementById('preis-description').value.trim(),
            price: document.getElementById('preis-price').value.trim(),
            sortOrder: parseInt(document.getElementById('preis-sortorder').value) || 0
        };

        try {
            if (editingPreisId) {
                await updateDoc(getDocRef('preise', editingPreisId), data);
                alert('Preis aktualisiert!');
            } else {
                data.timestamp = Date.now();
                await addDoc(getCollectionRef('preise'), data);
            }
            resetPreisForm();
        } catch (err) {
            alert('Fehler beim Speichern: ' + err.message);
        }
    };
}

// ============================================================
// === TAB-STEUERUNG (intern.html) ===
// ============================================================

function setupTabs() {
    const tabs = document.querySelectorAll('.cms-tab-btn');
    if (tabs.length === 0) return;

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.cms-tab-content').forEach(c => c.style.display = 'none');
            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.style.display = 'block';
        });
    });
}

// ============================================================
// === HAUPT-INITIALISIERUNG ===
// ============================================================

async function initCms() {
    try {
        app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e) {
        return;
    }

    if (window.location.pathname.includes('intern.html')) {
        setupTabs();
    }

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            signInAnonymously(auth).catch(() => {});
            return;
        }

        const isAdmin = !user.isAnonymous;

        // Flugzeuge: öffentliche Seite
        if (document.querySelector('[id^="flugzeuge-grid-"]')) {
            onSnapshot(getCollectionRef('flugzeuge'), snapshot => {
                const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                renderFlugzeugePage(items);
            });
        }

        // Preise: öffentliche Seite
        if (document.getElementById('preise-list')) {
            onSnapshot(getCollectionRef('preise'), snapshot => {
                const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                renderPreiseListe(items);
            });
        }

        // Admin-Bereich: intern.html
        if (window.location.pathname.includes('intern.html') && isAdmin) {
            setupFlugzeugAdmin();
            onSnapshot(getCollectionRef('flugzeuge'), snapshot => {
                const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                renderFlugzeugAdminList(items);
            });

            setupPreiseAdmin();
            onSnapshot(getCollectionRef('preise'), snapshot => {
                const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                renderPreiseAdminList(items);
            });
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCms);
} else {
    initCms();
}
