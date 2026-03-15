const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const nodemailer = require("nodemailer");

setGlobalOptions({maxInstances: 5, region: "europe-west1"});

// SMTP-Transporter (Strato)
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

// Callable Function: Gutschein-E-Mail mit PDF-Anhang versenden
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
        throw new HttpsError("internal", `Mail konnte nicht gesendet werden: ${error.message}`);
      }
    },
);
