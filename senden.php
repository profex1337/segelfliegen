<?php
// Konfiguration
$empfaenger = "info@segelfliegen-altdorf.de"; // <-- HIER DEINE E-MAIL EINTRAGEN
$betreff = "Neue Anfrage über Webseite (Mitfliegen)";

// Prüfung, ob Formular abgesendet wurde
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Daten bereinigen
    $name = strip_tags(trim($_POST["name"]));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $telefon = strip_tags(trim($_POST["telefon"]));
    $flugtyp = strip_tags(trim($_POST["flugtyp"]));
    $nachricht = strip_tags(trim($_POST["nachricht"]));

    // Inhalt der E-Mail bauen
    $email_inhalt = "Neue Nachricht von der Webseite:\n\n";
    $email_inhalt .= "Name: $name\n";
    $email_inhalt .= "E-Mail: $email\n";
    $email_inhalt .= "Telefon: $telefon\n\n";
    $email_inhalt .= "Interesse an: $flugtyp\n";
    $email_inhalt .= "Nachricht:\n$nachricht\n";

    // Header bauen
    $header = "From: $name <$email>";

    // Senden
    if (mail($empfaenger, $betreff, $email_inhalt, $header)) {
        // Erfolg: Weiterleitung auf eine Danke-Seite oder zurück
        echo "<!DOCTYPE html>
        <html lang='de'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Danke</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 50px; background: #f4f6f8; color: #333; }
                .box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: inline-block; }
                h1 { color: #0f3460; }
                a { color: #e94560; text-decoration: none; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class='box'>
                <h1>Vielen Dank!</h1>
                <p>Ihre Anfrage wurde erfolgreich versendet.</p>
                <p>Wir werden uns schnellstmöglich bei Ihnen melden.</p>
                <br>
                <a href='index.html'>Zurück zur Startseite</a>
            </div>
        </body>
        </html>";
    } else {
        // Fehler
        echo "Es gab ein Problem beim Versenden der Nachricht. Bitte versuchen Sie es später erneut oder rufen Sie uns an.";
    }
} else {
    // Falls jemand die Datei direkt aufruft
    header("Location: index.html");
    exit;
}
?>