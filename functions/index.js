const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const nodemailer = require("nodemailer");

setGlobalOptions({maxInstances: 5, region: "europe-west1"});

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

function getFlugdauer(flugart, zusatzMin) {
  const basis = {"Segelflug (Windenstart)": 20, "Segelflug (F-Schlepp)": 20, "Motorsegler": 15};
  const base = basis[flugart];
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
  const istAbholung = (zustellung || "").indexOf("Abholung") !== -1;
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
      + '<div style="font-weight: bold; color: #e94560; font-size: 15px; margin-top: 2px;">Gutschein ' + escapeHtml(name) + "</div></div></div>"
      + '<div style="text-align: center; margin-bottom: 25px;">'
      + '<img src="' + (qrUrl || "") + '" alt="QR-Code für Überweisung" width="200" height="200" style="border-radius: 8px;">'
      + '<div style="font-size: 12px; color: #888; margin-top: 8px;">QR-Code für deine Banking-App scannen</div></div>'
      + '<div style="font-size: 14px; line-height: 1.7; color: #555; margin-bottom: 25px;">Nach Zahlungseingang erstellen wir deinen personalisierten Gutschein und senden ihn dir per E-Mail zu.</div>';
}

// Benachrichtigungs-E-Mail an den Verein (ersetzt EmailJS Template 1)
function buildNotificationHtml(subject, name, email, telefon, message, detailsHtml) {
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
      + "</div>"
      + '<div style="background:#0f3460; padding:12px; border-radius:0 0 12px 12px; text-align:center;">'
      + '<div style="color:#a8c8f0; font-size:11px;">Segelflieger im Post-SV Nürnberg e.V. · segelfliegenaltdorf.de</div>'
      + "</div></div>";
}

// Kunden-E-Mail (Auto-Reply / Reminder) (ersetzt EmailJS Template 2)
function buildCustomerReplyHtml(title, subtitle, intro, flugart, empfaenger, wert, flugdauer, zustellung, paymentInfoHtml) {
  let detailRows = "";
  if (flugart) {
    detailRows += '<tr><td style="padding:8px 12px; color:#666; width:130px;">Flugart:</td><td style="padding:8px 12px; font-weight:bold;">' + escapeHtml(flugart) + "</td></tr>";
  }
  if (empfaenger) {
    detailRows += '<tr><td style="padding:8px 12px; color:#666;">Empfänger:</td><td style="padding:8px 12px; font-weight:bold;">' + escapeHtml(empfaenger) + "</td></tr>";
  }
  if (wert) {
    detailRows += '<tr><td style="padding:8px 12px; color:#666;">Gutscheinwert:</td><td style="padding:8px 12px; font-weight:bold; color:#e94560;">' + escapeHtml(wert) + " €</td></tr>";
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
      + '<div style="color:#a8c8f0; font-size:11px; margin-top:4px;">Segelflugplatz Altdorf-Hagenhausen · segelfliegenaltdorf.de</div>'
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
          detailsHtml += buildDetailRow("Gutscheinwert", (data.wert || "") + " €", rowIndex++, "font-weight: bold; color: #e94560;");
          const wertAnzeigen = data.wertAnzeigen ? "Ja" : "Nein";
          detailsHtml += buildDetailRow("Wert im Gutschein", wertAnzeigen, rowIndex++);
          if (data.empfaenger) detailsHtml += buildDetailRow("Empfänger", data.empfaenger, rowIndex++);
          if (data.anlass) detailsHtml += buildDetailRow("Anlass", data.anlass, rowIndex++);
          if (data.zustellung) detailsHtml += buildDetailRow("Zustellung", data.zustellung, rowIndex++, "font-weight: bold; color: #6a1b9a;");
          if ((data.zustellung || "").indexOf("Abholung") !== -1) {
            ccList.push("joergsperber@arcor.de");
          }
          ccList.push("r.dachauer-kassier@web.de");
        } else if (formType === "gastflug") {
          subject = "Neue Gastflug-Anfrage";
          if (data.interest) detailsHtml += buildDetailRow("Interesse an", data.interest, rowIndex++);
        } else {
          res.status(400).json({error: "Unbekannter Formulartyp."});
          return;
        }

        const notificationMsg = formType === "gutschein" ? (data.grusstext || "(kein Grußtext)") : (message || "");
        const html = buildNotificationHtml(subject, name, email, telefon, notificationMsg, detailsHtml);

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
          const zusatz = parseInt(data.zusatzzeit || "0", 10);
          const flugdauer = getFlugdauer(data.flugart || "", zusatz);
          const qrUrl = buildEpcQrUrl(name, data.wert);
          const paymentHtml = buildPaymentInfoHtml(name, data.wert || "", data.zustellung || "", qrUrl);

          const replyHtml = buildCustomerReplyHtml(
              "Vielen Dank!",
              "Deine Gutschein-Bestellung ist bei uns eingegangen",
              "Hallo <strong>" + escapeHtml(name) + "</strong>,<br><br>vielen Dank für deine Bestellung eines Flug-Gutscheins beim Segelflugplatz Altdorf-Hagenhausen!",
              data.flugart, data.empfaenger, data.wert, flugdauer, data.zustellung, paymentHtml,
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
        grusstext: limitLength(order.grusstext, 2000),
      };

      const transporter = createTransporter();
      const from = `"Segelflugplatz Altdorf" <${process.env.SMTP_USER}>`;

      try {
        if (action === "paymentReminder") {
          // Zahlungserinnerung an Kunden
          if (!safeOrder.email || !isValidEmail(safeOrder.email)) {
            throw new HttpsError("invalid-argument", "Ungültige Kunden-E-Mail.");
          }

          const zusatz = parseInt(safeOrder.zusatzzeit || "0", 10);
          const flugdauer = getFlugdauer(safeOrder.flugart || "", zusatz);
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
          const flugdauer = getFlugdauer(safeOrder.flugart || "", parseInt(safeOrder.zusatzzeit || "0", 10));
          let detailsHtml = "";
          const rows = [
            {label: "Name", value: safeOrder.name || ""},
            {label: "E-Mail", value: safeOrder.email || ""},
            {label: "Telefon", value: safeOrder.telefon || ""},
            {label: "Flugart", value: safeOrder.flugart || ""},
            {label: "Gutscheinwert", value: (safeOrder.wert || "") + " €", style: "font-weight: bold; color: #e94560;"},
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
          const html = buildNotificationHtml(subject, safeOrder.name || "", safeOrder.email || "", safeOrder.telefon || "", safeOrder.grusstext || "(kein Grußtext)", detailsHtml);

          const info = await transporter.sendMail({
            from,
            to: VEREINS_EMAIL,
            cc: "dan@segelfliegen-altdorf.de" + ((safeOrder.zustellung || "").indexOf("Abholung") !== -1 ? ",joergsperber@arcor.de" : ""),
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
