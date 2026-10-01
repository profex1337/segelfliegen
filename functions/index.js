const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const nodemailer = require("nodemailer");
const widerrufMail = require("./widerruf-mail");

setGlobalOptions({maxInstances: 5, region: "europe-west1"});

// Lazy-Init für Firestore (nur für Reviews benötigt)
let _db = null;
function getFirestore() {
  if (!_db) {
    const {initializeApp, getApps} = require("firebase-admin/app");
    const {getFirestore: gfs} = require("firebase-admin/firestore");
    if (!getApps().length) initializeApp();
    _db = gfs();
  }
  return _db;
}

// ========== SMTP-Transporter (Strato) ==========

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.strato.de",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ========== Hilfsfunktionen ==========

const VEREINS_EMAIL = "info@segelfliegen-altdorf.de";
const LOGO_URL = "https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/LOGO%20SPN.png";

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

// Aktions-Button für interne Benachrichtigungs-Mails (nur an Vereins-Adressen)
function buildAdminLinkHtml(url, label, hint) {
  return '<div style="text-align:center; margin-bottom:5px;">'
      + '<a href="' + url + '" '
      + 'style="display:inline-block; background:#0ea5e9; color:#ffffff; text-decoration:none; font-weight:bold; font-size:15px; padding:14px 28px; border-radius:8px;">'
      + escapeHtml(label) + "</a>"
      + '<div style="font-size:12px; color:#888; margin-top:8px;">' + escapeHtml(hint) + "</div>"
      + "</div>";
}

// Direkt-Link ins Admin-Panel (Tab "Gutscheine") — nach Zahlungseingang
const VOUCHER_ADMIN_LINK_HTML = buildAdminLinkHtml(
    "https://www.segelfliegenaltdorf.de/intern.html#gutscheine",
    "Gutschein jetzt erstellen",
    "Öffnet den internen Bereich direkt im Tab „Gutscheine“",
);

// Direkt-Link auf die Bestellungen-Seite — für den Kassier bei neuer Bestellung
const ORDER_ADMIN_LINK_HTML = buildAdminLinkHtml(
    "https://www.segelfliegenaltdorf.de/bestellungen/",
    "Bestellung als bezahlt markieren",
    "Öffnet die Bestellungen-Seite (Anmeldung erforderlich)",
);

// E-Mail-Adresse validieren (RFC 5322 vereinfacht)
function isValidEmail(email) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

// Header-Injection verhindern: Zeilenumbrüche entfernen
function sanitizeHeader(str) {
  if (!str) return "";
  return str.replace(/[\r\n]/g, "").substring(0, 500);
}

// Eingabelänge begrenzen
function limitLength(str, max) {
  if (!str) return "";
  return str.substring(0, max);
}

// Einfaches Rate-Limiting pro IP für den öffentlichen sendPublicEmail-Endpunkt.
// FAIL-OPEN: Bei jedem internen Fehler (Firestore langsam/nicht erreichbar) wird die
// Anfrage ZUGELASSEN — ein legitimer Nutzer wird niemals durch Infrastrukturfehler blockiert.
// Begrenzt Massen-Missbrauch (z. B. Gutschein-Auto-Reply an beliebige Fremdadressen).
async function checkRateLimit(req) {
  try {
    const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const rawIp = fwd || req.ip || "unknown";
    const key = String(rawIp).replace(/[^a-zA-Z0-9_.:-]/g, "_").substring(0, 200) || "unknown";
    const WINDOW_MS = 10 * 60 * 1000; // 10 Minuten
    // Großzügig gewählt: eine einzelne echte Bestellung ist 1 Anfrage; selbst mehrere
    // Gutschein-Bestellungen aus einem Haushalt/IP bleiben weit darunter. Stoppt nur Massen-Missbrauch.
    const MAX = 15; // max. 15 Formular-Sendungen pro IP und Zeitfenster
    const now = Date.now();
    const ref = getFirestore().collection("rateLimits").doc(key);
    return await getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : null;
      if (!d || (now - (d.windowStart || 0)) > WINDOW_MS) {
        tx.set(ref, {windowStart: now, count: 1});
        return true;
      }
      if ((d.count || 0) >= MAX) return false;
      tx.update(ref, {count: (d.count || 0) + 1});
      return true;
    });
  } catch (e) {
    console.error("Rate-Limit-Prüfung fehlgeschlagen (fail-open, Anfrage zugelassen):", e);
    return true;
  }
}

function getFlugdauer(flugart, zusatzMin) {
  const basis = {"Segelflug (Windenstart)": 20, "Segelflug (F-Schlepp)": 20, "Motorsegler": 15};
  let base = basis[flugart];
  if (!base) {
    const key = Object.keys(basis).find((k) => flugart.startsWith(k));
    if (key) base = basis[key];
  }
  if (!base) return "pauschal";
  let text = "bis zu " + base + " Min.";
  if (zusatzMin > 0) text += " + " + zusatzMin + " Min. zusätzlich";
  return text;
}

function buildEpcQrUrl(name, wert) {
  const betrag = (wert || "").replace(",", ".");
  const epcData = "BCD\n002\n1\nSCT\nGENODEF1HSB\nSegelflieger im Post SV Nürnberg\nDE20760614820004555554\nEUR" + betrag + "\n\n\nGutschein " + (name || "");
  return "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(epcData);
}

function buildPaymentInfoHtml(name, wert, zustellung, qrUrl) {
  const z = zustellung || "";
  const istFlugplatz = z.indexOf("Flugplatz") !== -1;
  const istAbholung = z.indexOf("Abholung") !== -1;
  if (istFlugplatz) {
    return '<div style="background: #f3e5f5; border: 1px solid #ce93d8; border-radius: 8px; padding: 20px; margin-bottom: 25px;">'
        + '<div style="font-weight: bold; color: #6a1b9a; font-size: 15px; margin-bottom: 10px;">Abholung am Flugplatz &amp; Barzahlung</div>'
        + '<div style="font-size: 14px; line-height: 1.6; color: #555;">'
        + "Hole deinen Gutschein am Segelflugplatz Altdorf-Hagenhausen ab:<br>"
        + "<strong>92348 Stöckelsberg</strong> (bitte der Beschilderung folgen)<br>"
        + "<strong>Nur am Wochenende oder an Feiertagen.</strong><br><br>"
        + 'Bitte melde dich vorher unter <a href="tel:+499189310" style="color: #6a1b9a; font-weight: bold;">09189 310</a>, damit wir deinen Gutschein ausdrucken und für dich bereitlegen.'
        + (wert ? "<br><br><strong>Betrag:</strong> " + wert + " € (Barzahlung vor Ort)" : "")
        + "</div></div>";
  }
  if (istAbholung) {
    return '<div style="background: #f3e5f5; border: 1px solid #ce93d8; border-radius: 8px; padding: 20px; margin-bottom: 25px;">'
        + '<div style="font-weight: bold; color: #6a1b9a; font-size: 15px; margin-bottom: 10px;">Abholung &amp; Barzahlung</div>'
        + '<div style="font-size: 14px; line-height: 1.6; color: #555;">'
        + "Bitte hole deinen Gutschein ab bei:<br>"
        + "<strong>Jörg Sperber, Schulstraße 18, 90518 Altdorf</strong><br>"
        + '<a href="https://maps.app.goo.gl/p4YEwmERAwFkmy479" style="color: #6a1b9a;">In Google Maps öffnen</a><br>'
        + 'Bitte vorher anrufen:<br><a href="tel:+4915117250329" style="color: #6a1b9a; font-weight: bold;">+49 1511 7250329</a>'
        + (wert ? "<br><br><strong>Betrag:</strong> " + wert + " € (Barzahlung vor Ort)" : "")
        + "</div></div>";
  }
  return '<div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 8px; padding: 20px; margin-bottom: 25px;">'
      + '<div style="font-weight: bold; color: #f57f17; font-size: 15px; margin-bottom: 15px;">Bitte überweise den Betrag auf folgendes Konto:</div>'
      + '<div style="margin-bottom: 10px;"><div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Kontoinhaber</div>'
      + '<div style="font-weight: bold; font-size: 15px; margin-top: 2px;">Segelflieger im Post SV Nürnberg</div></div>'
      + '<div style="margin-bottom: 10px;"><div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">IBAN</div>'
      + '<div style="font-weight: bold; font-family: monospace; font-size: 16px; margin-top: 2px;">DE20 7606 1482 0004 5555 54</div></div>'
      + '<div style="margin-bottom: 10px;"><div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">BIC</div>'
      + '<div style="font-weight: bold; font-size: 15px; margin-top: 2px;">GENODEF1HSB</div></div>'
      + '<div style="margin-bottom: 10px;"><div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Bank</div>'
      + '<div style="font-size: 15px; margin-top: 2px;">Raiffeisenbank im Nürnberger Land</div></div>'
      + '<div><div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Verwendungszweck</div>'
      + '<div style="font-weight: bold; color: #0ea5e9; font-size: 15px; margin-top: 2px;">Gutschein ' + escapeHtml(name) + "</div></div></div>"
      + '<div style="text-align: center; margin-bottom: 25px;">'
      + '<img src="' + (qrUrl || "") + '" alt="QR-Code für Überweisung" width="200" height="200" style="border-radius: 8px;">'
      + '<div style="font-size: 12px; color: #888; margin-top: 8px;">QR-Code für deine Banking-App scannen</div></div>'
      + '<div style="font-size: 14px; line-height: 1.7; color: #555; margin-bottom: 25px;">Nach Zahlungseingang erstellen wir deinen personalisierten Gutschein und senden ihn dir per E-Mail zu.</div>';
}

// Benachrichtigungs-E-Mail an den Verein (ersetzt EmailJS Template 1)
function buildNotificationHtml(subject, name, email, telefon, message, detailsHtml, extraHtml) {
  return '<div style="font-family:system-ui,sans-serif,Arial; font-size:14px; color:#333; max-width:600px; margin:0 auto;">'
      + '<div style="background:linear-gradient(135deg,#0f3460,#1a4a8a); padding:25px; border-radius:12px 12px 0 0; text-align:center;">'
      + '<img src="' + LOGO_URL + '" alt="Logo" width="50" height="50" style="width:50px; max-width:50px; border-radius:50%; margin:0 auto 10px; display:block;">'
      + '<div style="font-size:20px; color:#fff; font-weight:bold;">' + escapeHtml(subject) + "</div>"
      + '<div style="font-size:13px; color:#a8c8f0; margin-top:5px;">Segelflugplatz Altdorf-Hagenhausen</div>'
      + "</div>"
      + '<div style="background:#fff; padding:25px; border:1px solid #e0e0e0; border-top:none;">'
      + '<div style="margin-bottom:20px;">'
      + '<div style="font-size:15px; font-weight:bold; color:#0f3460; margin-bottom:5px;">' + escapeHtml(name) + "</div>"
      + '<div style="font-size:13px; color:#666;">' + escapeHtml(email) + (telefon ? " · " + escapeHtml(telefon) : "") + "</div>"
      + "</div>"
      + (detailsHtml ? '<table role="presentation" style="width:100%; border-collapse:collapse; margin-bottom:20px;">' + detailsHtml + "</table>" : "")
      + (message ? '<div style="background:#f4f6f8; border-radius:8px; padding:16px; margin-bottom:20px; white-space:pre-wrap; line-height:1.6;">' + escapeHtml(message) + "</div>" : "")
      + (extraHtml || "")
      + "</div>"
      + '<div style="background:#0f3460; padding:12px; border-radius:0 0 12px 12px; text-align:center;">'
      + '<div style="color:#a8c8f0; font-size:11px;">Segelflieger im Post-SV Nürnberg e.V. · www.segelfliegenaltdorf.de</div>'
      + "</div></div>";
}

// Kunden-E-Mail (Auto-Reply / Reminder) (ersetzt EmailJS Template 2)
function buildCustomerReplyHtml(title, subtitle, intro, flugart, empfaenger, wert, flugdauer, zustellung, paymentInfoHtml, extraHtml) {
  let detailRows = "";
  if (flugart) {
    detailRows += '<tr><td style="padding:8px 12px; color:#666; width:130px;">Flugart:</td><td style="padding:8px 12px; font-weight:bold;">' + escapeHtml(flugart) + "</td></tr>";
  }
  if (empfaenger) {
    detailRows += '<tr><td style="padding:8px 12px; color:#666;">Empfänger:</td><td style="padding:8px 12px; font-weight:bold;">' + escapeHtml(empfaenger) + "</td></tr>";
  }
  if (wert) {
    detailRows += '<tr><td style="padding:8px 12px; color:#666;">Gutscheinwert:</td><td style="padding:8px 12px; font-weight:bold; color:#0ea5e9;">' + escapeHtml(wert) + " €</td></tr>";
  }
  if (flugdauer && flugdauer !== "pauschal") {
    detailRows += '<tr><td style="padding:8px 12px; color:#666;">Flugdauer:</td><td style="padding:8px 12px; font-weight:bold;">' + escapeHtml(flugdauer) + "</td></tr>";
  }
  if (zustellung) {
    detailRows += '<tr><td style="padding:8px 12px; color:#666;">Zustellung:</td><td style="padding:8px 12px; font-weight:bold; color:#6a1b9a;">' + escapeHtml(zustellung) + "</td></tr>";
  }

  return '<div style="font-family:system-ui,sans-serif,Arial; font-size:14px; color:#333; max-width:600px; margin:0 auto;">'
      + '<div style="background:linear-gradient(135deg,#0f3460,#1a4a8a); padding:25px; border-radius:12px 12px 0 0; text-align:center;">'
      + '<img src="' + LOGO_URL + '" alt="Logo" width="50" height="50" style="width:50px; max-width:50px; border-radius:50%; margin:0 auto 10px; display:block;">'
      + '<div style="font-size:22px; color:#fff; font-weight:bold;">' + escapeHtml(title) + "</div>"
      + '<div style="font-size:13px; color:#a8c8f0; margin-top:5px;">' + escapeHtml(subtitle) + "</div>"
      + "</div>"
      + '<div style="background:#fff; padding:25px; border:1px solid #e0e0e0; border-top:none;">'
      + '<div style="font-size:15px; line-height:1.7; margin-bottom:20px;">' + intro + "</div>"
      + (detailRows ? '<div style="background:#f4f6f8; border-radius:8px; padding:16px; margin-bottom:20px;"><div style="font-weight:bold; color:#0f3460; font-size:14px; margin-bottom:10px;">Deine Bestellung</div><table role="presentation" style="width:100%; border-collapse:collapse;">' + detailRows + "</table></div>" : "")
      + (paymentInfoHtml || "")
      + (extraHtml || "")
      + '<hr style="border:none; border-top:1px solid #eee; margin:20px 0;">'
      + '<div style="font-size:13px; color:#888; line-height:1.6;">'
      + "Viele Grüße<br><br>"
      + '<strong style="color:#333;">Segelflieger im Post-SV Nürnberg e.V.</strong><br>'
      + "Segelflugplatz Altdorf-Hagenhausen<br>"
      + 'Tel: <a href="tel:+499189310" style="color:#0f3460;">09189/310</a> <span style="font-size:12px;">(Wochenende)</span><br>'
      + 'E-Mail: <a href="mailto:info@segelfliegen-altdorf.de" style="color:#0f3460;">info@segelfliegen-altdorf.de</a><br>'
      + 'Web: <a href="https://www.segelfliegenaltdorf.de" style="color:#0f3460;">www.segelfliegenaltdorf.de</a>'
      + "</div></div>"
      + '<div style="background:#0f3460; padding:12px; border-radius:0 0 12px 12px; text-align:center;">'
      + '<div style="color:#fff; font-size:12px; font-weight:bold;">Segelflieger im Post-SV Nürnberg e.V.</div>'
      + '<div style="color:#a8c8f0; font-size:11px; margin-top:4px;">Segelflugplatz Altdorf-Hagenhausen · www.segelfliegenaltdorf.de</div>'
      + "</div></div>";
}

// Detail-Tabellenzeile für Benachrichtigungs-E-Mails
function buildDetailRow(label, value, index, style) {
  const bg = index % 2 === 0 ? "" : " background: #f4f6f8;";
  const valStyle = style ? " " + style : "";
  return "<tr>"
      + '<td style="padding: 10px 12px;' + bg + " border-bottom: 1px solid #e8e8e8; width: 130px; font-weight: bold; color: #0f3460;\">" + escapeHtml(label) + "</td>"
      + '<td style="padding: 10px 12px;' + bg + " border-bottom: 1px solid #e8e8e8;" + valStyle + '">' + escapeHtml(value) + "</td>"
      + "</tr>";
}

// ========== sendPublicEmail (onRequest — kein Auth nötig, für öffentliche Formulare) ==========

const ALLOWED_ORIGINS = [
  "https://www.segelfliegenaltdorf.de",
  "https://segelfliegenaltdorf.de",
];

// Gibt true zurück wenn Origin erlaubt, sonst false
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return false;
  }
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "86400");
  return true;
}

exports.sendPublicEmail = onRequest(
    {
      secrets: ["SMTP_USER", "SMTP_PASS"],
      invoker: "public",
      cors: false, // CORS manuell
    },
    async (req, res) => {
      // CORS prüfen
      if (!setCorsHeaders(req, res)) {
        // Preflight ohne gültige Origin trotzdem beantworten (Browser braucht 204)
        if (req.method === "OPTIONS") {
          res.status(204).send("");
          return;
        }
        res.status(403).json({error: "Origin nicht erlaubt"});
        return;
      }

      // Preflight
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({error: "Nur POST erlaubt"});
        return;
      }

      const data = req.body;

      // Honeypot-Spam-Schutz
      if (data.website_url) {
        res.status(200).json({success: true});
        return;
      }

      // Rate-Limiting (fail-open): begrenzt Massen-Versand über den öffentlichen Endpunkt
      if (!(await checkRateLimit(req))) {
        res.status(429).json({error: "Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut."});
        return;
      }

      const formType = sanitizeHeader(data.formType);
      const name = limitLength(sanitizeHeader(data.name), 200);
      const email = sanitizeHeader(data.email);
      const telefon = limitLength(sanitizeHeader(data.telefon), 50);
      const message = limitLength(data.message, 5000);

      if (!formType || !name || !email) {
        res.status(400).json({error: "formType, name und email sind Pflichtfelder."});
        return;
      }

      if (!isValidEmail(email)) {
        res.status(400).json({error: "Ungültige E-Mail-Adresse."});
        return;
      }

      // ===== Widerruf (§ 356a BGB) — eigener Ablauf, eigene Empfänger =====
      if (formType === "widerruf") {
        // KEIN sanitizeHeader: diese Freitextfelder landen nur im HTML-Body (via nl2br,
        // das HTML escaped) und im Firestore-Protokoll — nie in einem Mail-Header.
        // sanitizeHeader würde die Zeilenumbrüche der Textareas zerstören.
        const bestelldetails = limitLength(data.bestelldetails, 1000);
        const grund = limitLength(data.grund, 2000);
        if (!bestelldetails) {
          res.status(400).json({error: "Bitte geben Sie Angaben zur Identifizierung Ihrer Bestellung an."});
          return;
        }
        const now = new Date();
        const eingangLabel = widerrufMail.formatBerlinTimestamp(now);
        const wTransporter = createTransporter();
        const wFrom = `"Segelflugplatz Altdorf" <${process.env.SMTP_USER}>`;
        const payload = {name, email, bestelldetails, grund, eingangLabel};
        try {
          // 1) Eingangsbestätigung an den Kunden (dauerhafter Datenträger)
          await wTransporter.sendMail({
            from: wFrom,
            to: email,
            subject: "Eingangsbestätigung Ihres Widerrufs — Segelflugplatz Altdorf",
            html: widerrufMail.buildWiderrufCustomerHtml(payload),
          });
          // 2) Meldung an den Verein (CC: Vorstand + Kassier wegen Rückzahlung)
          await wTransporter.sendMail({
            from: wFrom,
            to: VEREINS_EMAIL,
            cc: "dan@segelfliegen-altdorf.de,r.dachauer-kassier@web.de",
            replyTo: email,
            subject: "Widerruf eingegangen: " + name,
            html: widerrufMail.buildWiderrufVereinsHtml(payload),
          });
          // 3) Protokoll in Firestore (Nachweis) — Fehler nicht blockierend
          try {
            await getFirestore().collection("widerrufe").add({
              name, email, bestelldetails, grund,
              receivedAt: now.getTime(),
              receivedAtLabel: eingangLabel,
            });
          } catch (logErr) {
            console.error("Widerruf-Protokoll Fehler:", logErr);
          }
          res.status(200).json({success: true});
        } catch (error) {
          console.error("Widerruf-Mail Fehler:", error);
          res.status(500).json({error: "Mail konnte nicht gesendet werden."});
        }
        return;
      }

      const transporter = createTransporter();
      const from = `"Segelflugplatz Altdorf" <${process.env.SMTP_USER}>`;
      let subject = "";
      let detailsHtml = "";
      const ccList = ["dan@segelfliegen-altdorf.de"];
      let rowIndex = 0;

      try {
        if (formType === "kontakt") {
          const betreff = data.betreff || "Allgemein";
          subject = "Kontaktanfrage: " + betreff;
          detailsHtml = buildDetailRow("Betreff", betreff, rowIndex++);
          if (betreff === "Ausbildung") {
            ccList.push("Jeremy.Wolfsteiner@gmail.com");
          }
        } else if (formType === "gutschein") {
          subject = "Neue Gutschein-Bestellung";
          if (data.flugart) detailsHtml += buildDetailRow("Flugart", data.flugart, rowIndex++);
          detailsHtml += buildDetailRow("Zusatzzeit", (data.zusatzzeit || "0") + " Min.", rowIndex++);
          detailsHtml += buildDetailRow("Gutscheinwert", (data.wert || "") + " €", rowIndex++, "font-weight: bold; color: #0ea5e9;");
          const wertAnzeigen = data.wertAnzeigen ? "Ja" : "Nein";
          detailsHtml += buildDetailRow("Wert im Gutschein", wertAnzeigen, rowIndex++);
          if (data.empfaenger) detailsHtml += buildDetailRow("Empfänger", data.empfaenger, rowIndex++);
          if (data.anlass) detailsHtml += buildDetailRow("Anlass", data.anlass, rowIndex++);
          if (data.zustellung) detailsHtml += buildDetailRow("Zustellung", data.zustellung, rowIndex++, "font-weight: bold; color: #6a1b9a;");
          // Abholung am Flugplatz: nur info@ + Dan (kein Jörg, kein Kassier).
          if ((data.zustellung || "").indexOf("Flugplatz") === -1) {
            if ((data.zustellung || "").indexOf("Abholung") !== -1) {
              ccList.push("joergsperber@arcor.de");
            }
            ccList.push("r.dachauer-kassier@web.de");
          }
        } else if (formType === "gastflug") {
          subject = "Neue Gastflug-Anfrage";
          if (data.interest) detailsHtml += buildDetailRow("Interesse an", data.interest, rowIndex++);
        } else {
          res.status(400).json({error: "Unbekannter Formulartyp."});
          return;
        }

        const notificationMsg = formType === "gutschein" ? (data.grusstext || "(kein Grußtext)") : (message || "");
        // Bei Gutschein-Bestellungen: Direkt-Link auf die Bestellungen-Seite (Kassier)
        const actionHtml = formType === "gutschein" ? ORDER_ADMIN_LINK_HTML : "";
        const html = buildNotificationHtml(subject, name, email, telefon, notificationMsg, detailsHtml, actionHtml);

        // Benachrichtigung an Verein
        await transporter.sendMail({
          from,
          to: VEREINS_EMAIL,
          cc: ccList.join(","),
          replyTo: email,
          subject,
          html,
        });

        // Bei Gutschein: Auto-Reply an Kunden
        if (formType === "gutschein") {
          const flugdauer = data.flugdauer || getFlugdauer(data.flugart || "", parseInt(data.zusatzzeit || "0", 10));
          const qrUrl = buildEpcQrUrl(name, data.wert);
          const paymentHtml = buildPaymentInfoHtml(name, data.wert || "", data.zustellung || "", qrUrl);

          const replyHtml = buildCustomerReplyHtml(
              "Vielen Dank!",
              "Deine Gutschein-Bestellung ist bei uns eingegangen",
              "Hallo <strong>" + escapeHtml(name) + "</strong>,<br><br>vielen Dank für deine Bestellung eines Flug-Gutscheins beim Segelflugplatz Altdorf-Hagenhausen!",
              data.flugart, data.empfaenger, data.wert, flugdauer, data.zustellung, paymentHtml,
              widerrufMail.buildWiderrufsbelehrungHtml(),
          );

          await transporter.sendMail({
            from,
            to: email,
            subject: "Deine Gutschein-Bestellung beim Segelflugplatz Altdorf",
            html: replyHtml,
          });
        }

        res.status(200).json({success: true});
      } catch (error) {
        console.error("sendPublicEmail Fehler:", error);
        res.status(500).json({error: "Mail konnte nicht gesendet werden."});
      }
    },
);

// ========== sendAdminEmail (onCall — Auth erforderlich, für Admin-Aktionen) ==========

exports.sendAdminEmail = onCall(
    {
      secrets: ["SMTP_USER", "SMTP_PASS"],
      cors: [
        "https://www.segelfliegenaltdorf.de",
        "https://segelfliegenaltdorf.de",
      ],
    },
    async (request) => {
      // Auth-Check: Admin oder bestellung@ User
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Nicht eingeloggt.");
      }
      const userEmail = request.auth.token.email;
      if (userEmail !== VEREINS_EMAIL && userEmail !== "bestellung@segelfliegen-altdorf.de") {
        throw new HttpsError("permission-denied", "Keine Berechtigung.");
      }

      const {action, order} = request.data;
      if (!action || !order || typeof order !== "object") {
        throw new HttpsError("invalid-argument", "action und order sind Pflichtfelder.");
      }

      // Order-Felder sanitizen
      const safeOrder = {
        name: limitLength(sanitizeHeader(order.name), 200),
        email: sanitizeHeader(order.email),
        telefon: limitLength(sanitizeHeader(order.telefon), 50),
        flugart: limitLength(sanitizeHeader(order.flugart), 100),
        wert: limitLength(sanitizeHeader(order.wert), 20),
        empfaenger: limitLength(sanitizeHeader(order.empfaenger), 200),
        zustellung: limitLength(sanitizeHeader(order.zustellung), 200),
        zusatzzeit: limitLength(sanitizeHeader(order.zusatzzeit), 10),
        grusstext: limitLength(sanitizeHeader(order.grusstext), 2000),
        flugdauer: limitLength(sanitizeHeader(order.flugdauer), 200),
      };

      const transporter = createTransporter();
      const from = `"Segelflugplatz Altdorf" <${process.env.SMTP_USER}>`;

      try {
        if (action === "paymentReminder") {
          // Zahlungserinnerung an Kunden
          if (!safeOrder.email || !isValidEmail(safeOrder.email)) {
            throw new HttpsError("invalid-argument", "Ungültige Kunden-E-Mail.");
          }

          const flugdauer = safeOrder.flugdauer || getFlugdauer(safeOrder.flugart || "", parseInt(safeOrder.zusatzzeit || "0", 10));
          const qrUrl = buildEpcQrUrl(safeOrder.name, safeOrder.wert);
          const paymentHtml = buildPaymentInfoHtml(safeOrder.name || "", safeOrder.wert || "", safeOrder.zustellung || "", qrUrl);
          const istAbholung = (safeOrder.zustellung || "").indexOf("Abholung") !== -1;

          const replyHtml = buildCustomerReplyHtml(
              "Erinnerung",
              istAbholung ? "Dein Gutschein wartet auf Abholung" : "Deine Zahlung steht noch aus",
              istAbholung
                ? "Hallo <strong>" + escapeHtml(safeOrder.name) + "</strong>,<br><br>wir möchten dich freundlich daran erinnern, dass dein Flug-Gutschein beim Segelflugplatz Altdorf-Hagenhausen noch auf Abholung wartet."
                : "Hallo <strong>" + escapeHtml(safeOrder.name) + "</strong>,<br><br>wir möchten dich freundlich daran erinnern, dass die Zahlung für deinen Flug-Gutschein beim Segelflugplatz Altdorf-Hagenhausen noch aussteht.",
              safeOrder.flugart, safeOrder.empfaenger, safeOrder.wert, flugdauer, safeOrder.zustellung, paymentHtml,
          );

          const reminderSubject = istAbholung ? "Erinnerung — Gutschein-Abholung" : "Zahlungserinnerung — Gutschein-Bestellung";

          const info = await transporter.sendMail({
            from,
            to: safeOrder.email,
            subject: reminderSubject,
            html: replyHtml,
          });
          return {success: true, messageId: info.messageId};
        } else if (action === "paidNotification") {
          // Bezahlt-Benachrichtigung an Verein
          const flugdauer = safeOrder.flugdauer || getFlugdauer(safeOrder.flugart || "", parseInt(safeOrder.zusatzzeit || "0", 10));
          let detailsHtml = "";
          const rows = [
            {label: "Name", value: safeOrder.name || ""},
            {label: "E-Mail", value: safeOrder.email || ""},
            {label: "Telefon", value: safeOrder.telefon || ""},
            {label: "Flugart", value: safeOrder.flugart || ""},
            {label: "Gutscheinwert", value: (safeOrder.wert || "") + " €", style: "font-weight: bold; color: #0ea5e9;"},
            {label: "Empfänger", value: safeOrder.empfaenger || ""},
            {label: "Zustellung", value: safeOrder.zustellung || ""},
            {label: "Flugdauer", value: flugdauer},
            {label: "Status", value: "BEZAHLT", style: "font-weight: bold; color: #2e7d32;"},
          ];
          rows.forEach((row, i) => {
            if (!row.value) return;
            detailsHtml += buildDetailRow(row.label, row.value, i, row.style);
          });

          const subject = "Gutschein-Bestellung bezahlt: " + (safeOrder.name || "");
          const html = buildNotificationHtml(subject, safeOrder.name || "", safeOrder.email || "", safeOrder.telefon || "", safeOrder.grusstext || "(kein Grußtext)", detailsHtml, VOUCHER_ADMIN_LINK_HTML);

          const info = await transporter.sendMail({
            from,
            to: VEREINS_EMAIL,
            cc: "dan@segelfliegen-altdorf.de" + (((safeOrder.zustellung || "").indexOf("Abholung") !== -1 && (safeOrder.zustellung || "").indexOf("Flugplatz") === -1) ? ",joergsperber@arcor.de" : ""),
            subject,
            html,
          });
          return {success: true, messageId: info.messageId};
        } else {
          throw new HttpsError("invalid-argument", "Unbekannte Aktion.");
        }
      } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error("sendAdminEmail Fehler:", error);
        throw new HttpsError("internal", "Mail konnte nicht gesendet werden.");
      }
    },
);

// ========== sendVoucherEmail (bestehend — Gutschein-PDF per E-Mail) ==========

exports.sendVoucherEmail = onCall(
    {
      secrets: ["SMTP_USER", "SMTP_PASS"],
      cors: [
        "https://www.segelfliegenaltdorf.de",
        "https://segelfliegenaltdorf.de",
      ],
    },
    async (request) => {
      // Nur authentifizierte Admin-User
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Nicht eingeloggt.");
      }
      if (request.auth.token.email !== "info@segelfliegen-altdorf.de") {
        throw new HttpsError("permission-denied", "Nur Admin darf Mails senden.");
      }

      const {to, subject, html, pdfBase64, pdfFilename} = request.data;

      // Validierung
      if (!to || !subject || !html) {
        throw new HttpsError(
            "invalid-argument",
            "to, subject und html sind Pflichtfelder.",
        );
      }

      const mailOptions = {
        from: `"Segelflugplatz Altdorf" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      };

      // PDF-Anhang falls vorhanden
      if (pdfBase64 && pdfFilename) {
        mailOptions.attachments = [
          {
            filename: pdfFilename,
            content: Buffer.from(pdfBase64, "base64"),
            contentType: "application/pdf",
          },
        ];
      }

      const transporter = createTransporter();

      try {
        const info = await transporter.sendMail(mailOptions);
        return {success: true, messageId: info.messageId};
      } catch (error) {
        console.error("SMTP Fehler:", error);
        throw new HttpsError("internal", "Mail konnte nicht gesendet werden.");
      }
    },
);

// ========== Abholung: Übergabe & Barzahlung (Ein-Klick-Link für Jörg) ==========
// Ablauf Abholung Altdorf: Admin erstellt Gutschein (Status "Zahlung offen") → "An Jörg senden"
// (PDF + Einmal-Link) → Jörg übergibt, kassiert, klickt → Bestellung bezahlt + abgeschlossen,
// Gutschein freigeschaltet. Abholung Flugplatz: dasselbe über den "Bezahlt"-Button (ohne Link).

const crypto = require("crypto");
const JOERG_EMAIL = "joergsperber@arcor.de";
const CONFIRM_PICKUP_URL = "https://europe-west1-segelfliegen.cloudfunctions.net/confirmPickup";

function isPickupOrder(zustellung) {
  return (zustellung || "").indexOf("Abholung") !== -1;
}

function isAltdorfPickup(zustellung) {
  return isPickupOrder(zustellung) && (zustellung || "").indexOf("Flugplatz") === -1;
}

// Nur der Hash des Links wird gespeichert — wer Firestore lesen kann, kann den Link nicht nachbauen
function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function tokenMatches(token, storedHash) {
  if (!token || !storedHash || typeof token !== "string" || typeof storedHash !== "string") return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isValidDocId(id) {
  return typeof id === "string" && /^[A-Za-z0-9]{1,64}$/.test(id);
}

// Abholungs-Bestellung als bezahlt verbuchen (Transaktion):
// - Bestellung: paid = true; ist ein Gutschein verknüpft, zusätzlich abgeschlossen
// - verknüpfte Gutscheine: Zahlungsvorbehalt aufheben (paymentPending = false)
// Ohne verknüpften Gutschein bleibt die Bestellung offen, damit er noch erstellt werden kann.
async function settlePickupOrder(orderId, via) {
  const db = getFirestore();
  const orderRef = db.collection("voucherOrders").doc(orderId);
  const voucherQuery = db.collection("vouchers").where("orderId", "==", orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return {status: "missing"};
    const order = snap.data();
    if (!isPickupOrder(order.zustellung)) return {status: "notPickup", order};
    const vSnap = await tx.get(voucherQuery);
    // Wurde ein Gutschein an Jörg geschickt, gilt genau dieser (ältere Fassungen bleiben gesperrt)
    const vouchers = vSnap.docs.filter((d) => !order.handoverVoucherNumber || d.data().number === order.handoverVoucherNumber);
    const voucherNumbers = vouchers.map((d) => d.data().number || "").filter(Boolean);
    const completed = vouchers.length > 0;
    if (order.paid === true && (order.status === "abgeschlossen" || !completed)) {
      // Nichts Neues zu verbuchen (verhindert doppelte Info-Mails bei wiederholtem Klick)
      return {status: "already", order, completed: order.status === "abgeschlossen", voucherNumbers};
    }
    const now = Date.now();
    const update = {paid: true, paidAt: order.paidAt || now, paidVia: order.paidVia || via};
    if (completed) {
      update.status = "abgeschlossen";
      update.completedAt = now;
    }
    tx.update(orderRef, update);
    vouchers.forEach((d) => {
      if (d.data().paymentPending) tx.update(d.ref, {paymentPending: false});
    });
    return {status: "ok", order, completed, voucherNumbers};
  });
}

// Info-Mail an den Verein, nachdem eine Abholung bezahlt wurde
async function sendPickupSettledMail(order, result, viaLabel, fromHandoverLink) {
  const completed = result.completed;
  const flugdauer = order.flugdauer || getFlugdauer(order.flugart || "", parseInt(order.zusatzzeit || "0", 10));
  const rows = [
    {label: "Flugart", value: order.flugart || ""},
    {label: "Gutscheinwert", value: (order.wert || "") + " €", style: "font-weight: bold; color: #0ea5e9;"},
    {label: "Empfänger", value: order.empfaenger || ""},
    {label: "Zustellung", value: order.zustellung || ""},
    {label: "Flugdauer", value: flugdauer},
    {label: "Gutschein-Nr.", value: (result.voucherNumbers || []).join(", ")},
    {label: "Bestätigt über", value: viaLabel},
    {label: "Status", value: completed ? "BEZAHLT & ABGESCHLOSSEN" : "BEZAHLT — Gutschein noch erstellen",
      style: "font-weight: bold; color: #2e7d32;"},
  ];
  let detailsHtml = "";
  let i = 0;
  rows.forEach((row) => {
    if (!row.value) return;
    detailsHtml += buildDetailRow(row.label, row.value, i++, row.style);
  });
  const subject = (completed ? "Gutschein übergeben & bezahlt: " : "Gutschein-Abholung bezahlt: ")
      + sanitizeHeader(order.name || "");
  const html = buildNotificationHtml(subject, order.name || "", order.email || "", order.telefon || "",
      completed ? "Der Gutschein wurde übergeben und bar bezahlt. Bestellung ist abgeschlossen, der Gutschein ist freigeschaltet — nichts mehr zu tun."
                : "Bezahlt, aber es ist noch kein Gutschein mit dieser Bestellung verknüpft. Bitte Gutschein erstellen und die Bestellung danach abschließen.",
      detailsHtml, completed ? "" : VOUCHER_ADMIN_LINK_HTML);
  await createTransporter().sendMail({
    from: `"Segelflugplatz Altdorf" <${process.env.SMTP_USER}>`,
    to: VEREINS_EMAIL,
    // Jörg bei Altdorf-Abholungen informieren — außer er hat selbst über seinen Link bestätigt
    cc: "dan@segelfliegen-altdorf.de"
        + (isAltdorfPickup(order.zustellung) && !fromHandoverLink ? "," + JOERG_EMAIL : ""),
    subject,
    html,
  });
}

// "Bezahlt" bei Abholungs-Bestellungen (intern.html + /bestellungen/) — bezahlt + abschließen + freischalten
exports.markPickupPaid = onCall(
    {
      secrets: ["SMTP_USER", "SMTP_PASS"],
      cors: [
        "https://www.segelfliegenaltdorf.de",
        "https://segelfliegenaltdorf.de",
      ],
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Nicht eingeloggt.");
      }
      const userEmail = request.auth.token.email;
      if (userEmail !== VEREINS_EMAIL && userEmail !== "bestellung@segelfliegen-altdorf.de") {
        throw new HttpsError("permission-denied", "Keine Berechtigung.");
      }
      const {orderId, notify} = request.data || {};
      if (!isValidDocId(orderId)) {
        throw new HttpsError("invalid-argument", "Ungültige Bestell-ID.");
      }
      const viaLabel = userEmail === VEREINS_EMAIL ? "Admin (intern)" : "Bestellungen-Seite";
      const result = await settlePickupOrder(orderId, userEmail === VEREINS_EMAIL ? "admin" : "bestellungen");
      if (result.status === "missing") throw new HttpsError("not-found", "Bestellung nicht gefunden.");
      if (result.status === "notPickup") throw new HttpsError("failed-precondition", "Keine Abholungs-Bestellung.");

      let mailSent = false;
      if (result.status === "ok" && notify) {
        try {
          await sendPickupSettledMail(result.order, result, viaLabel);
          mailSent = true;
        } catch (e) {
          // Buchung ist bereits gespeichert — Mailfehler nicht als Gesamtfehler melden
          console.error("markPickupPaid: Info-Mail fehlgeschlagen:", e);
        }
      }
      return {status: result.status, completed: !!result.completed, mailSent};
    },
);

// "An Jörg senden": Gutschein-PDF + Einmal-Link zur Übergabe-Bestätigung an Jörg (Abholung Altdorf)
exports.sendPickupHandover = onCall(
    {
      secrets: ["SMTP_USER", "SMTP_PASS"],
      cors: [
        "https://www.segelfliegenaltdorf.de",
        "https://segelfliegenaltdorf.de",
      ],
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Nicht eingeloggt.");
      }
      if (request.auth.token.email !== VEREINS_EMAIL) {
        throw new HttpsError("permission-denied", "Nur Admin.");
      }
      const {orderId, voucherNumber, pdfBase64, pdfFilename} = request.data || {};
      if (!isValidDocId(orderId)) {
        throw new HttpsError("invalid-argument", "Ungültige Bestell-ID.");
      }
      if (typeof voucherNumber !== "string" || !voucherNumber.trim() || voucherNumber.length > 60) {
        throw new HttpsError("invalid-argument", "Gutschein-Nummer fehlt.");
      }
      if (typeof pdfBase64 !== "string" || !pdfBase64 || pdfBase64.length > 8 * 1024 * 1024) {
        throw new HttpsError("invalid-argument", "PDF fehlt oder ist zu groß.");
      }
      const safeFilename = /^[A-Za-z0-9._-]{1,100}\.pdf$/.test(pdfFilename || "") ? pdfFilename : "Gutschein.pdf";

      const db = getFirestore();
      const orderRef = db.collection("voucherOrders").doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) throw new HttpsError("not-found", "Bestellung nicht gefunden.");
      const order = orderSnap.data();
      if (!isAltdorfPickup(order.zustellung)) {
        throw new HttpsError("failed-precondition", "Nur für Abholung in Altdorf.");
      }
      if (order.status === "abgeschlossen") {
        throw new HttpsError("failed-precondition", "Bestellung ist bereits abgeschlossen.");
      }

      // Gutschein verknüpfen + neuer Einmal-Link — in einer Transaktion:
      // - nur ein Gutschein ohne fremde Bestellung und nicht eingelöst
      // - ältere, für diese Bestellung angelegte Fassungen werden entkoppelt (bleiben gesperrt)
      // - ein erneutes Senden macht den alten Link ungültig
      const number = voucherNumber.trim();
      const token = crypto.randomBytes(24).toString("hex");
      const isPaid = order.paid === true;
      await db.runTransaction(async (tx) => {
        const vSnap = await tx.get(db.collection("vouchers").where("number", "==", number).limit(1));
        if (vSnap.empty) {
          throw new HttpsError("failed-precondition", "Gutschein ist noch nicht gespeichert — bitte erneut versuchen.");
        }
        const v = vSnap.docs[0].data();
        if (v.orderId && v.orderId !== orderId) {
          throw new HttpsError("failed-precondition", "Diese Gutschein-Nr. gehört zu einer anderen Bestellung.");
        }
        if (v.redeemed) {
          throw new HttpsError("failed-precondition", "Dieser Gutschein ist bereits eingelöst.");
        }
        const others = await tx.get(db.collection("vouchers").where("orderId", "==", orderId));
        others.forEach((d) => {
          if (d.id !== vSnap.docs[0].id && !d.data().redeemed) {
            tx.update(d.ref, {orderId: null, supersededBy: number, paymentPending: true});
          }
        });
        tx.update(vSnap.docs[0].ref, {orderId, paymentPending: !isPaid});
        tx.update(orderRef, {
          handoverTokenHash: hashToken(token),
          handoverSentAt: Date.now(),
          handoverVoucherNumber: number,
        });
      });
      const confirmUrl = CONFIRM_PICKUP_URL + "?o=" + encodeURIComponent(orderId) + "&t=" + token;

      const wert = order.wert || "";
      const flugdauer = order.flugdauer || getFlugdauer(order.flugart || "", parseInt(order.zusatzzeit || "0", 10));
      let detailsHtml = "";
      let i = 0;
      [
        {label: "Gutschein-Nr.", value: number},
        {label: "Empfänger", value: order.empfaenger || ""},
        {label: "Flugart", value: order.flugart || ""},
        {label: "Flugdauer", value: flugdauer},
        isPaid
          ? {label: "Zahlung", value: "Bereits bezahlt — NICHTS kassieren", style: "font-weight: bold; color: #2e7d32; font-size: 16px;"}
          : {label: "Bar kassieren", value: wert ? wert + " €" : "", style: "font-weight: bold; color: #c62828; font-size: 16px;"},
      ].forEach((row) => {
        if (!row.value) return;
        detailsHtml += buildDetailRow(row.label, row.value, i++, row.style);
      });
      const buttonHtml = buildAdminLinkHtml(
          confirmUrl,
          isPaid ? "Gutschein übergeben" : "Übergeben & " + (wert ? wert + " € " : "Geld ") + "erhalten",
          isPaid ? "Erst klicken, wenn der Gutschein übergeben ist — danach folgt noch eine Bestätigungsseite."
                 : "Erst klicken, wenn der Gutschein übergeben und bezahlt ist — danach folgt noch eine Bestätigungsseite.",
      );
      const subject = "Gutschein zur Abholung: " + sanitizeHeader(order.empfaenger || order.name || "");
      const html = buildNotificationHtml(subject, order.name || "", order.email || "", order.telefon || "",
          "Hallo Jörg,\n\nder Gutschein für diese Bestellung liegt als PDF im Anhang. "
          + (isPaid ? "Der Besteller holt ihn bei dir ab — er ist bereits bezahlt, bitte nichts kassieren.\n\n"
                    : "Der Besteller holt ihn bei dir ab und zahlt bar.\n\n")
          + "Sobald der Gutschein übergeben" + (isPaid ? "" : " und bezahlt") + " ist, klick bitte einfach auf den Button unten — "
          + "damit ist die Bestellung erledigt und der Gutschein freigeschaltet.",
          detailsHtml, buttonHtml);

      try {
        const info = await createTransporter().sendMail({
          from: `"Segelflugplatz Altdorf" <${process.env.SMTP_USER}>`,
          to: JOERG_EMAIL,
          cc: VEREINS_EMAIL,
          subject,
          html,
          attachments: [{
            filename: safeFilename,
            content: Buffer.from(pdfBase64, "base64"),
            contentType: "application/pdf",
          }],
        });
        return {success: true, messageId: info.messageId};
      } catch (error) {
        console.error("sendPickupHandover SMTP Fehler:", error);
        throw new HttpsError("internal", "Mail konnte nicht gesendet werden.");
      }
    },
);

// Einfache, eigenständige HTML-Seite für den Übergabe-Link (kein Login, keine externen Skripte)
function buildPickupPage(title, bodyHtml, tone) {
  const color = tone === "ok" ? "#2e7d32" : (tone === "warn" ? "#c62828" : "#0f3460");
  return "<!DOCTYPE html><html lang=\"de\"><head><meta charset=\"utf-8\">"
      + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
      + "<meta name=\"robots\" content=\"noindex, nofollow\">"
      + "<title>" + escapeHtml(title) + " — Segelflugplatz Altdorf</title>"
      + "<style>body{margin:0;padding:0 16px;background:#f4f6f8;font-family:system-ui,sans-serif,Arial;color:#333;}"
      + ".card{max-width:480px;margin:24px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.08);overflow:hidden;}"
      + ".head{background:linear-gradient(135deg,#0f3460,#1a4a8a);color:#fff;padding:20px;text-align:center;}"
      + ".head img{width:48px;height:48px;border-radius:50%;display:block;margin:0 auto 8px;}"
      + ".body{padding:22px;font-size:16px;line-height:1.6;}"
      + "h1{font-size:20px;color:" + color + ";margin:0 0 12px;}"
      + "table{width:100%;border-collapse:collapse;margin:14px 0;font-size:15px;}"
      + "td{padding:8px 6px;border-bottom:1px solid #eee;}td:first-child{color:#666;width:42%;}"
      + "button{width:100%;padding:16px;font-size:17px;font-weight:bold;color:#fff;background:#2e7d32;border:0;border-radius:10px;cursor:pointer;}"
      + ".hint{font-size:13px;color:#888;margin-top:10px;text-align:center;}"
      + "</style></head><body><div class=\"card\"><div class=\"head\">"
      + "<img src=\"" + LOGO_URL + "\" alt=\"\"><div style=\"font-size:13px;color:#a8c8f0;\">Segelflugplatz Altdorf-Hagenhausen</div></div>"
      + "<div class=\"body\"><h1>" + escapeHtml(title) + "</h1>" + bodyHtml + "</div></div></body></html>";
}

function sendPickupPage(res, statusCode, title, bodyHtml, tone) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "no-store");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-Robots-Tag", "noindex, nofollow");
  res.set("Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; img-src https://raw.githubusercontent.com; frame-ancestors 'none'; base-uri 'none'");
  res.status(statusCode).send(buildPickupPage(title, bodyHtml, tone));
}

// Übergabe-Link: GET zeigt nur die Bestätigungsseite (Mail-Virenscanner, die Links vorab
// aufrufen, lösen so nichts aus); erst der POST über den Button verbucht die Zahlung.
exports.confirmPickup = onRequest(
    {
      secrets: ["SMTP_USER", "SMTP_PASS"],
      invoker: "public",
      cors: false,
    },
    async (req, res) => {
      if (req.method !== "GET" && req.method !== "POST") {
        res.status(405).send("Nur GET/POST erlaubt");
        return;
      }
      const params = req.method === "POST" ? Object.assign({}, req.query, req.body || {}) : req.query;
      const orderId = typeof params.o === "string" ? params.o : "";
      const token = typeof params.t === "string" ? params.t : "";
      const invalidHtml = "<p>Dieser Link ist ungültig oder wurde durch einen neueren Link ersetzt.</p>"
          + "<p>Bitte melde dich kurz bei Stefan bzw. unter info@segelfliegen-altdorf.de.</p>";

      try {
        if (!isValidDocId(orderId) || !/^[a-f0-9]{48}$/.test(token)) {
          sendPickupPage(res, 404, "Link ungültig", invalidHtml, "warn");
          return;
        }
        const snap = await getFirestore().collection("voucherOrders").doc(orderId).get();
        const order = snap.exists ? snap.data() : null;
        if (!order || !tokenMatches(token, order.handoverTokenHash)) {
          sendPickupPage(res, 404, "Link ungültig", invalidHtml, "warn");
          return;
        }

        const alreadyPaid = order.paid === true;
        const summary = "<table>"
            + "<tr><td>Gutschein-Nr.</td><td><strong>" + escapeHtml(order.handoverVoucherNumber || "—") + "</strong></td></tr>"
            + "<tr><td>Besteller</td><td>" + escapeHtml(order.name || "—") + "</td></tr>"
            + "<tr><td>Empfänger</td><td>" + escapeHtml(order.empfaenger || "—") + "</td></tr>"
            + "<tr><td>Flugart</td><td>" + escapeHtml(order.flugart || "—") + "</td></tr>"
            + (alreadyPaid
              ? "<tr><td>Zahlung</td><td><strong style=\"color:#2e7d32;\">bereits bezahlt — nichts kassieren</strong></td></tr>"
              : "<tr><td>Betrag (bar)</td><td><strong>" + escapeHtml(order.wert ? order.wert + " €" : "—") + "</strong></td></tr>")
            + "</table>";

        if (order.paid === true && order.status === "abgeschlossen") {
          sendPickupPage(res, 200, "Bereits erledigt", summary
              + "<p>Diese Übergabe ist schon bestätigt — es ist nichts mehr zu tun. Danke!</p>", "ok");
          return;
        }

        if (req.method === "GET") {
          sendPickupPage(res, 200, "Gutschein übergeben?", summary
              + (alreadyPaid
                ? "<p>Bitte erst bestätigen, wenn du den Gutschein <strong>übergeben</strong> hast.</p>"
                : "<p>Bitte erst bestätigen, wenn du den Gutschein <strong>übergeben</strong> und das Geld <strong>erhalten</strong> hast.</p>")
              // o/t zusätzlich in der URL — funktioniert auch, falls der Formular-Body nicht geparst wird
              + "<form method=\"post\" action=\"" + CONFIRM_PICKUP_URL + "?o=" + encodeURIComponent(orderId) + "&amp;t=" + encodeURIComponent(token) + "\">"
              + "<input type=\"hidden\" name=\"o\" value=\"" + escapeHtml(orderId) + "\">"
              + "<input type=\"hidden\" name=\"t\" value=\"" + escapeHtml(token) + "\">"
              + "<button type=\"submit\">✔ " + (alreadyPaid ? "Gutschein übergeben"
                : "Übergeben &amp; " + escapeHtml(order.wert ? order.wert + " € " : "Geld ") + "erhalten") + "</button>"
              + "</form><div class=\"hint\">Danach ist die Bestellung abgeschlossen und der Gutschein freigeschaltet.</div>", "info");
          return;
        }

        // POST: verbuchen
        const result = await settlePickupOrder(orderId, "uebergabe-link");
        if (result.status === "missing" || result.status === "notPickup") {
          sendPickupPage(res, 404, "Link ungültig", invalidHtml, "warn");
          return;
        }
        let mailOk = result.status !== "ok";
        if (result.status === "ok") {
          try {
            await sendPickupSettledMail(result.order, result, "Jörg (Übergabe-Link)", true);
            mailOk = true;
          } catch (e) {
            console.error("confirmPickup: Info-Mail fehlgeschlagen:", e);
          }
        }
        if (!result.completed) {
          // Kein (gültiger) Gutschein mehr verknüpft — Zahlung ist verbucht, Rest muss der Verein klären
          sendPickupPage(res, 200, "Zahlung verbucht", summary
              + "<p>Die Zahlung ist verbucht. Der Gutschein ist im System aber nicht mehr mit dieser Bestellung verknüpft — "
              + "bitte kurz bei Stefan bzw. unter info@segelfliegen-altdorf.de melden.</p>", "warn");
          return;
        }
        sendPickupPage(res, 200, "Danke — erledigt!", summary
            + "<p>Die Bestellung ist als <strong>bezahlt und abgeschlossen</strong> verbucht, der Gutschein ist freigeschaltet."
            + (mailOk ? " Der Verein wurde automatisch informiert." : "") + "</p>", "ok");
      } catch (e) {
        console.error("confirmPickup Fehler:", e);
        sendPickupPage(res, 500, "Technischer Fehler",
            "<p>Das hat leider nicht geklappt. Bitte versuch es gleich nochmal oder melde dich bei info@segelfliegen-altdorf.de.</p>", "warn");
      }
    },
);

// ========== uploadImage (onCall — Bild auf GitHub hochladen) ==========

const GH_OWNER = "profex1337";
const GH_REPO = "segelfliegen";
const GH_BRANCH = "main";

exports.uploadImage = onCall(
    {
      secrets: ["GH_PAT"],
      cors: [
        "https://www.segelfliegenaltdorf.de",
        "https://segelfliegenaltdorf.de",
      ],
    },
    async (request) => {
      // Nur Admin darf Bilder hochladen
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Nicht eingeloggt.");
      }
      if (request.auth.token.email !== VEREINS_EMAIL) {
        throw new HttpsError("permission-denied", "Nur Admin darf Bilder hochladen.");
      }

      const {base64, filename} = request.data;
      if (!base64 || !filename) {
        throw new HttpsError("invalid-argument", "base64 und filename sind Pflichtfelder.");
      }

      // Nur erlaubte Dateinamen (news_*.webp oder aircraft_*.webp)
      if (!/^(?:news|aircraft)_[\d_]+\.webp$/.test(filename)) {
        throw new HttpsError("invalid-argument", "Ungültiger Dateiname.");
      }

      const token = process.env.GH_PAT;
      const path = `images/${filename}`;
      const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      };

      try {
        // Prüfen ob Datei existiert (SHA für Update)
        let sha = null;
        const checkResp = await fetch(apiUrl, {headers});
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          sha = checkData.sha;
        }

        const body = {message: `Bild: ${filename}`, content: base64, branch: GH_BRANCH};
        if (sha) body.sha = sha;

        const resp = await fetch(apiUrl, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.message || "GitHub Upload fehlgeschlagen");
        }

        const url = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${path}`;
        return {success: true, url};
      } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error("uploadImage Fehler:", error);
        throw new HttpsError("internal", "Bild-Upload fehlgeschlagen: " + error.message);
      }
    },
);

// ========== deleteImage (onCall — Bild aus GitHub löschen) ==========

exports.deleteImage = onCall(
    {
      secrets: ["GH_PAT"],
      cors: [
        "https://www.segelfliegenaltdorf.de",
        "https://segelfliegenaltdorf.de",
      ],
    },
    async (request) => {
      // Nur Admin darf Bilder löschen
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Nicht eingeloggt.");
      }
      if (request.auth.token.email !== VEREINS_EMAIL) {
        throw new HttpsError("permission-denied", "Nur Admin darf Bilder löschen.");
      }

      const {imageUrl} = request.data;
      if (!imageUrl) return {success: true, skipped: true};

      // Nur GitHub-Raw-URLs mit erlaubtem Pattern.
      // [^/?#]+ verbietet '/', '?' und '#' im Dateinamen und verhindert damit
      // Path-Traversal (z. B. images/news_x/../../CNAME).
      const match = imageUrl.match(
          /raw\.githubusercontent\.com\/profex1337\/segelfliegen\/main\/(images\/(?:news|aircraft)_[^/?#]+)/,
      );
      if (!match) return {success: true, skipped: true};

      const path = match[1];
      const token = process.env.GH_PAT;
      const apiUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      };

      try {
        const checkResp = await fetch(apiUrl, {headers});
        if (!checkResp.ok) return {success: true, skipped: true}; // Datei existiert nicht
        const {sha} = await checkResp.json();

        await fetch(apiUrl, {
          method: "DELETE",
          headers,
          body: JSON.stringify({message: `Bild entfernt: ${path}`, sha, branch: GH_BRANCH}),
        });

        return {success: true};
      } catch (error) {
        console.error("deleteImage Fehler:", error);
        // Löschfehler nicht propagieren — soll restlichen Ablauf nicht blockieren
        return {success: false, error: error.message};
      }
    },
);

// ========== Google Reviews (Places API → Firestore Cache) ==========

const PLACE_ID = "ChIJy0SiW22fDEERyio73FxdAI0";
const REVIEWS_CACHE_DOC = "reviewsCache/latest";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Stunden

async function fetchAndCacheReviews() {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) {
    console.error("GOOGLE_PLACES_KEY Secret nicht gesetzt.");
    return null;
  }

  try {
    const url = "https://places.googleapis.com/v1/places/" + PLACE_ID
        + "?fields=rating,userRatingCount,reviews&languageCode=de";

    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Places API Fehler:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const reviews = (data.reviews || []).map((r) => ({
      name: (r.authorAttribution && r.authorAttribution.displayName) || "Anonym",
      rating: r.rating || 5,
      text: (r.originalText && r.originalText.text) || (r.text && r.text.text) || "",
      date: r.relativePublishTimeDescription || "",
      publishTime: r.publishTime || "",
    }));

    const cacheData = {
      rating: data.rating || 0,
      totalReviews: data.userRatingCount || 0,
      reviews: reviews,
      updatedAt: Date.now(),
    };

    await getFirestore().doc(REVIEWS_CACHE_DOC).set(cacheData);
    console.log("Reviews gecached:", reviews.length, "Bewertungen");
    return cacheData;
  } catch (error) {
    console.error("fetchAndCacheReviews Fehler:", error);
    return null;
  }
}

// Öffentlicher Endpoint: Reviews aus Cache liefern, bei Bedarf neu holen
exports.getGoogleReviews = onRequest(
    {
      secrets: ["GOOGLE_PLACES_KEY"],
      invoker: "public",
      cors: false,
    },
    async (req, res) => {
      // CORS
      if (!setCorsHeaders(req, res)) {
        if (req.method === "OPTIONS") {
          res.status(204).send("");
          return;
        }
        res.status(403).json({error: "Origin nicht erlaubt"});
        return;
      }
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      try {
        // Cache prüfen
        const cacheDoc = await getFirestore().doc(REVIEWS_CACHE_DOC).get();
        if (cacheDoc.exists) {
          const cached = cacheDoc.data();
          const age = Date.now() - (cached.updatedAt || 0);
          if (age < CACHE_MAX_AGE_MS) {
            res.status(200).json(cached);
            return;
          }
        }

        // Cache abgelaufen oder nicht vorhanden → neu holen
        const fresh = await fetchAndCacheReviews();
        if (fresh) {
          res.status(200).json(fresh);
        } else if (cacheDoc.exists) {
          // API-Fehler → alten Cache liefern
          res.status(200).json(cacheDoc.data());
        } else {
          res.status(500).json({error: "Keine Reviews verfügbar."});
        }
      } catch (error) {
        console.error("getGoogleReviews Fehler:", error);
        res.status(500).json({error: "Interner Fehler."});
      }
    },
);

// Kein Scheduled Job nötig — getGoogleReviews aktualisiert den Cache bei Ablauf (24h) automatisch

// ========== Gemini-Grußtext-Generator ==========

const SCHREIBSTIL_WHITELIST = new Set([
  "",
  "herzlich und warmherzig",
  "lustig und humorvoll",
  "förmlich und elegant",
  "als gereimtes Gedicht",
  "mit bayerischem Dialekt/Slang",
  "mit fränkischem Dialekt",
  "episch und dramatisch, wie ein Filmtrailer",
  "kurz und knackig, maximal 2-3 Sätze",
]);

exports.generateGreetingText = onCall(
    {
      secrets: ["GEMINI_API_KEY"],
      cors: [
        "https://www.segelfliegenaltdorf.de",
        "https://segelfliegenaltdorf.de",
      ],
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Nicht eingeloggt.");
      }

      const data = request.data || {};
      const empfaenger = limitLength(String(data.empfaenger || "").trim(), 200);
      const flugart = limitLength(String(data.flugart || "").trim(), 100);
      const anlassRaw = limitLength(String(data.anlass || "").trim(), 200);
      const schreibstilRaw = String(data.schreibstil || "").trim();
      const besteller = limitLength(String(data.besteller || "").trim(), 200);

      if (!empfaenger || !flugart) {
        throw new HttpsError("invalid-argument", "empfaenger und flugart sind Pflichtfelder.");
      }

      const schreibstil = SCHREIBSTIL_WHITELIST.has(schreibstilRaw) ? schreibstilRaw : "";
      const anlass = anlassRaw || "ohne bestimmten Anlass";

      const stilAnweisung = schreibstil ?
        "Schreibe den Text im folgenden Stil: " + schreibstil + ". " :
        "Schreibe 3-5 begeisternde Sätze. Verwende gerne Metaphern rund ums Fliegen, Freiheit und Abenteuer. ";

      const prompt = "Erstelle einen kreativen Gutscheintext für einen Flug-Gutschein mit folgenden Daten:\n" +
        "- Name des Beschenkten: " + empfaenger + "\n" +
        "- Flugart: " + flugart + "\n" +
        "- Anlass: " + anlass + "\n" +
        (besteller ? "- Geschenk von: " + besteller + "\n" : "") +
        "\nDer Gutschein ist vom Segelflugplatz Altdorf-Hagenhausen (Segelfliegen). " +
        stilAnweisung +
        "Gehe auf den Anlass und den Namen ein. " +
        "Beginne mit einer persönlichen Anrede (z.B. \"Lieber Hans,\"). " +
        (besteller ? "Ende mit einer persönlichen Grußformel vom Schenkenden (z.B. \"Dein " + besteller + "\"). " : "") +
        "Schreibe NUR den Grußtext — keine Überschrift. " +
        "Verwende KEINE Emojis und keine Sonderzeichen außerhalb üblicher Satzzeichen. " +
        "WICHTIG: Der Text darf MAXIMAL 600 Zeichen und MAXIMAL 8 Zeilen haben. Halte dich strikt an dieses Limit! Verwende Zeilenumbrüche sparsam. Sprache: Deutsch.";

      try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
        const response = await fetch(url, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            contents: [{parts: [{text: prompt}]}],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 1024,
              thinkingConfig: {thinkingBudget: 0},
            },
          }),
        });

        if (response.status === 429) {
          throw new HttpsError("resource-exhausted", "Zu viele Anfragen. Bitte einen Moment warten.");
        }

        const result = await response.json();
        if (!response.ok) {
          const msg = (result.error && result.error.message) || "Unbekannter Fehler";
          console.error("Gemini API Fehler:", msg);
          throw new HttpsError("internal", "Textgenerierung fehlgeschlagen.");
        }

        let text = result.candidates &&
          result.candidates[0] &&
          result.candidates[0].content &&
          result.candidates[0].content.parts &&
          result.candidates[0].content.parts[0] &&
          result.candidates[0].content.parts[0].text;

        if (!text) {
          throw new HttpsError("internal", "Kein Text generiert.");
        }

        text = text.trim();
        const lines = text.split("\n");
        if (lines.length > 10) text = lines.slice(0, 10).join("\n");
        if (text.length > 800) text = text.substring(0, 800);

        return {text: text};
      } catch (e) {
        if (e instanceof HttpsError) throw e;
        console.error("generateGreetingText Fehler:", e);
        throw new HttpsError("internal", "Textgenerierung fehlgeschlagen.");
      }
    },
);
