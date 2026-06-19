// ========== Widerruf — E-Mail-Templates (§ 356a BGB) ==========
// Eigenes Modul, damit Cloud Function (index.js) und das lokale Test-Skript
// (test-widerruf-send.js) exakt dieselben Vorlagen verwenden.

const LOGO_URL = "https://raw.githubusercontent.com/profex1337/segelfliegen/main/images/LOGO%20SPN.png";

// Vereins-/Anbieterdaten (aus impressum.html)
const ANBIETER = {
  name: "Segelflieger im Post-SV Nürnberg e.V.",
  strasse: "Kastanienweg 6",
  ort: "92348 Berg / Stöckelsberg",
  telefon: "09189 310",
  email: "info@segelfliegen-altdorf.de",
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

// Eingangs-Zeitstempel in Europe/Berlin: "TT.MM.JJJJ um HH:MM Uhr"
function formatBerlinTimestamp(date) {
  const d = date.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric",
  });
  const t = date.toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit",
  });
  return d + " um " + t + " Uhr";
}

// Newlines aus Freitext für HTML-Ausgabe in <br> wandeln (nach escapeHtml)
function nl2br(str) {
  return escapeHtml(str).replace(/\r?\n/g, "<br>");
}

function mailHeader(title, subtitle) {
  return '<div style="font-family:system-ui,sans-serif,Arial; font-size:14px; color:#333; max-width:600px; margin:0 auto;">'
      + '<div style="background:linear-gradient(135deg,#0f3460,#1a4a8a); padding:25px; border-radius:12px 12px 0 0; text-align:center;">'
      + '<img src="' + LOGO_URL + '" alt="Logo" width="50" height="50" style="width:50px; max-width:50px; border-radius:50%; margin:0 auto 10px; display:block;">'
      + '<div style="font-size:21px; color:#fff; font-weight:bold;">' + escapeHtml(title) + "</div>"
      + '<div style="font-size:13px; color:#a8c8f0; margin-top:5px;">' + escapeHtml(subtitle) + "</div>"
      + "</div>"
      + '<div style="background:#fff; padding:25px; border:1px solid #e0e0e0; border-top:none;">';
}

function mailFooter() {
  return '<hr style="border:none; border-top:1px solid #eee; margin:20px 0;">'
      + '<div style="font-size:13px; color:#888; line-height:1.6;">'
      + '<strong style="color:#333;">' + ANBIETER.name + "</strong><br>"
      + ANBIETER.strasse + " · " + ANBIETER.ort + "<br>"
      + 'Tel: <a href="tel:+499189310" style="color:#0f3460;">' + ANBIETER.telefon + "</a><br>"
      + 'E-Mail: <a href="mailto:' + ANBIETER.email + '" style="color:#0f3460;">' + ANBIETER.email + "</a>"
      + "</div></div>"
      + '<div style="background:#0f3460; padding:12px; border-radius:0 0 12px 12px; text-align:center;">'
      + '<div style="color:#a8c8f0; font-size:11px;">' + ANBIETER.name + " · www.segelfliegenaltdorf.de</div>"
      + "</div></div>";
}

// Box, die die Angaben des Verbrauchers wiedergibt (Inhalt der Erklärung)
function erklaerungBox(data) {
  let rows = "";
  rows += '<tr><td style="padding:6px 10px; color:#666; width:140px; vertical-align:top;">Name:</td><td style="padding:6px 10px; font-weight:bold;">' + escapeHtml(data.name) + "</td></tr>";
  rows += '<tr><td style="padding:6px 10px; color:#666; vertical-align:top;">Bestelldetails:</td><td style="padding:6px 10px;">' + nl2br(data.bestelldetails) + "</td></tr>";
  if (data.grund) {
    rows += '<tr><td style="padding:6px 10px; color:#666; vertical-align:top;">Grund (freiwillig):</td><td style="padding:6px 10px;">' + nl2br(data.grund) + "</td></tr>";
  }
  rows += '<tr><td style="padding:6px 10px; color:#666; vertical-align:top;">Eingang:</td><td style="padding:6px 10px; font-weight:bold;">' + escapeHtml(data.eingangLabel) + "</td></tr>";
  return '<div style="background:#f4f6f8; border-radius:8px; padding:8px 6px; margin:18px 0;">'
      + '<table role="presentation" style="width:100%; border-collapse:collapse; line-height:1.6;">' + rows + "</table></div>";
}

// ---- Eingangsbestätigung an den Kunden (dauerhafter Datenträger) ----
// WICHTIG: bestätigt nur den EINGANG, kein Anerkenntnis der Wirksamkeit.
function buildWiderrufCustomerHtml(data) {
  return mailHeader("Eingang bestätigt", "Ihre Widerrufserklärung ist bei uns eingegangen")
      + '<div style="font-size:15px; line-height:1.7; margin-bottom:5px;">Guten Tag <strong>' + escapeHtml(data.name) + "</strong>,</div>"
      + '<div style="font-size:15px; line-height:1.7; margin-bottom:5px;">wir bestätigen den <strong>Eingang</strong> Ihrer Widerrufserklärung am <strong>' + escapeHtml(data.eingangLabel) + "</strong>.</div>"
      + '<div style="font-size:13px; color:#666; margin-bottom:5px;">Inhalt Ihrer Erklärung:</div>'
      + erklaerungBox(data)
      + '<div style="background:#e8f4ea; border:1px solid #b6dcc0; border-radius:8px; padding:16px; margin-bottom:18px; font-size:14px; line-height:1.7; color:#2e5d3b;">'
      + "Sofern Ihr Widerruf fristgerecht (innerhalb von 14 Tagen) und wirksam ist, erstatten wir Ihnen einen <strong>bereits gezahlten</strong> Betrag in voller Höhe &mdash; unverz&uuml;glich, sp&auml;testens binnen 14 Tagen &mdash; &uuml;ber <strong>dasselbe Zahlungsmittel</strong>, das Sie bei der Zahlung verwendet haben."
      + "</div>"
      + '<div style="font-size:14px; line-height:1.7; color:#555; margin-bottom:10px;">Die abschlie&szlig;ende Pr&uuml;fung der Wirksamkeit nehmen wir gesondert vor und melden uns bei Ihnen. Diese Nachricht dient ausschlie&szlig;lich als Best&auml;tigung des Eingangs und stellt keine Anerkennung des Widerrufs dar.</div>'
      + mailFooter();
}

// ---- Benachrichtigung an den Verein (mit Handlungs-Hinweis für Kassier) ----
function buildWiderrufVereinsHtml(data) {
  return mailHeader("Widerruf eingegangen", "Ein Kunde hat einen Vertrag widerrufen")
      + '<div style="margin-bottom:10px;">'
      + '<div style="font-size:15px; font-weight:bold; color:#0f3460;">' + escapeHtml(data.name) + "</div>"
      + '<div style="font-size:13px; color:#666;">' + escapeHtml(data.email) + "</div>"
      + "</div>"
      + erklaerungBox(data)
      + '<div style="background:#fff8e1; border-left:5px solid #ffc107; border-radius:6px; padding:16px; margin-bottom:8px; font-size:14px; line-height:1.7; color:#7a5b00;">'
      + '<strong style="color:#856404;">&#9888;&#65039; Aufgabe Kassier:</strong> Bei wirksamem Widerruf den vollen Betrag <strong>unverz&uuml;glich, sp&auml;testens binnen 14 Tagen</strong> &uuml;ber <strong>dasselbe Zahlungsmittel</strong> zur&uuml;ckzahlen, das der Kunde verwendet hat. Bei noch nicht erfolgter Zahlung (Abholung/Barzahlung) entf&auml;llt die R&uuml;ckzahlung.'
      + "</div>"
      + mailFooter();
}

// ---- Widerrufsbelehrung + Muster-Widerrufsformular als E-Mail-Block ----
// Wird an die Gutschein-Bestätigungsmail angehängt (dauerhafter Datenträger,
// § 312f BGB i.V.m. Art. 246a EGBGB). Basis: amtliche Muster.
function buildWiderrufsbelehrungHtml() {
  const h = (t) => '<div style="font-weight:bold; color:#0f3460; font-size:14px; margin:14px 0 6px;">' + t + "</div>";
  const p = (t) => '<div style="font-size:12.5px; line-height:1.6; color:#555; margin-bottom:8px;">' + t + "</div>";
  return '<div style="background:#f4f6f8; border:1px solid #e0e0e0; border-radius:8px; padding:18px 18px 8px; margin-bottom:20px;">'
      + '<div style="font-weight:bold; color:#0f3460; font-size:15px; margin-bottom:4px;">Widerrufsbelehrung</div>'
      + h("Widerrufsrecht")
      + p("Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gr&uuml;nden diesen Vertrag zu widerrufen. Die Widerrufsfrist betr&auml;gt vierzehn Tage ab dem Tag des Vertragsabschlusses.")
      + p("Um Ihr Widerrufsrecht auszu&uuml;ben, m&uuml;ssen Sie uns (" + ANBIETER.name + ", " + ANBIETER.strasse + ", " + ANBIETER.ort + ", Telefon: " + ANBIETER.telefon + ", E-Mail: " + ANBIETER.email + ") mittels einer eindeutigen Erkl&auml;rung (z.&nbsp;B. ein mit der Post versandter Brief oder eine E-Mail) &uuml;ber Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie k&ouml;nnen daf&uuml;r das beigef&uuml;gte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Sie k&ouml;nnen den Widerruf auch elektronisch &uuml;ber die Widerrufsfunktion auf unserer Website (Schaltfl&auml;che &bdquo;Vertrag widerrufen&ldquo; unter www.segelfliegenaltdorf.de/widerruf.html) erkl&auml;ren; in diesem Fall &uuml;bermitteln wir Ihnen unverz&uuml;glich eine Best&auml;tigung &uuml;ber den Eingang eines solchen Widerrufs auf einem dauerhaften Datentr&auml;ger (z.&nbsp;B. per E-Mail).")
      + p("Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung &uuml;ber die Aus&uuml;bung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.")
      + h("Folgen des Widerrufs")
      + p("Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverz&uuml;glich und sp&auml;testens binnen vierzehn Tagen ab dem Tag zur&uuml;ckzuzahlen, an dem die Mitteilung &uuml;ber Ihren Widerruf dieses Vertrags bei uns eingegangen ist. F&uuml;r diese R&uuml;ckzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der urspr&uuml;nglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdr&uuml;cklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser R&uuml;ckzahlung Entgelte berechnet.")
      + p("Haben Sie verlangt, dass die Dienstleistung w&auml;hrend der Widerrufsfrist beginnen soll, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Aus&uuml;bung des Widerrufsrechts unterrichten, bereits erbrachten Leistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Leistungen entspricht.")
      + '<div style="font-weight:bold; color:#0f3460; font-size:15px; margin:18px 0 4px;">Muster-Widerrufsformular</div>'
      + p("(Wenn Sie den Vertrag widerrufen wollen, dann f&uuml;llen Sie bitte dieses Formular aus und senden Sie es zur&uuml;ck.)")
      + '<div style="font-size:12.5px; line-height:1.8; color:#555; background:#fff; border:1px dashed #c5cdd6; border-radius:6px; padding:12px;">'
      + "An: " + ANBIETER.name + ", " + ANBIETER.strasse + ", " + ANBIETER.ort + ", E-Mail: " + ANBIETER.email + "<br><br>"
      + "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag &uuml;ber den Kauf des folgenden Gutscheins / die Erbringung der folgenden Dienstleistung (*):<br>"
      + "_______________________________________________<br>"
      + "Bestellt am (*) / erhalten am (*): __________________<br>"
      + "Name des/der Verbraucher(s): _____________________<br>"
      + "Anschrift des/der Verbraucher(s): _________________<br>"
      + "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): __________<br>"
      + "Datum: __________<br><br>"
      + "(*) Unzutreffendes streichen."
      + "</div>"
      + "</div>";
}

module.exports = {
  formatBerlinTimestamp,
  buildWiderrufCustomerHtml,
  buildWiderrufVereinsHtml,
  buildWiderrufsbelehrungHtml,
};
