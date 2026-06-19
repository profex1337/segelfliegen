// Lokales Test-/Vorschau-Skript für die Widerruf-Mails (nicht für Deploy).
// Nutzt EXAKT dieselben Vorlagen wie die Cloud Function (widerruf-mail.js).
//
// Vorschau (schreibt HTML-Dateien, kein Versand):
//   node functions/test-widerruf-send.js
// Versand an einen Empfänger (SMTP-Creds via env):
//   SMTP_USER="$(firebase functions:secrets:access SMTP_USER)" \
//   SMTP_PASS="$(firebase functions:secrets:access SMTP_PASS)" \
//   node functions/test-widerruf-send.js name@example.de

const fs = require("fs");
const path = require("path");
const m = require("./widerruf-mail");

const recipient = process.argv[2] || null;

const sample = {
  name: "Max Mustermann",
  email: "max.mustermann@example.de",
  bestelldetails: "Gutschein Segelflug (Windenstart)\nBestellt am 17.06.2026\nWert: 48,00 €\nEmpfänger: Oma Erna",
  grund: "Doppelt bestellt.",
  eingangLabel: m.formatBerlinTimestamp(new Date()),
};

const customerHtml = m.buildWiderrufCustomerHtml(sample);
const vereinsHtml = m.buildWiderrufVereinsHtml(sample);
// Belehrungs-Block, wie er an die Gutschein-Bestätigungsmail angehängt wird:
const belehrungHtml = "<div style='font-family:system-ui,sans-serif;max-width:600px;margin:20px auto;'>"
    + m.buildWiderrufsbelehrungHtml() + "</div>";

// 1) Vorschau-Dateien schreiben (immer)
const outDir = path.join(__dirname, "_widerruf_preview");
fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, "kunde-eingangsbestaetigung.html"), customerHtml);
fs.writeFileSync(path.join(outDir, "verein-meldung.html"), vereinsHtml);
fs.writeFileSync(path.join(outDir, "belehrung-block.html"), belehrungHtml);
console.log("Vorschau-HTML geschrieben nach:", outDir);

// 2) Optionaler Versand
if (!recipient) {
  console.log("Kein Empfänger angegeben — nur Vorschau erstellt (kein Versand).");
  return;
}
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("SMTP_USER/SMTP_PASS fehlen in der Umgebung — Versand abgebrochen.");
  process.exit(1);
}

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.strato.de",
  port: 465,
  secure: true,
  auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS},
});
const from = `"Segelflugplatz Altdorf (TEST)" <${process.env.SMTP_USER}>`;

(async () => {
  await transporter.sendMail({
    from, to: recipient,
    subject: "[TEST — so erhält es der KUNDE] Eingangsbestätigung Ihres Widerrufs",
    html: customerHtml,
  });
  console.log("→ Kunden-Eingangsbestätigung gesendet an", recipient);

  await transporter.sendMail({
    from, to: recipient,
    subject: "[TEST — so erhaltet IHR es] Widerruf eingegangen: Max Mustermann",
    html: vereinsHtml,
  });
  console.log("→ Vereins-Meldung gesendet an", recipient);

  await transporter.sendMail({
    from, to: recipient,
    subject: "[TEST — Belehrung in der Gutschein-Bestätigungsmail]",
    html: belehrungHtml,
  });
  console.log("→ Belehrungs-Block gesendet an", recipient);

  console.log("Fertig.");
})().catch((e) => {
  console.error("Versand-Fehler:", e);
  process.exit(1);
});
