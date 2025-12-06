/**
 * MO'Cyno — Formulaire de contact
 * Node 22 / Firebase Functions V2 / Resend
 * - Email admin -> contact@mocyno.com
 * - Accusé de réception -> email du client
 */

const express = require("express");
const { onRequest } = require("firebase-functions/v2/https");
const { Resend } = require("resend");
const corsPackage = require("cors");

// === A ADAPTER SI BESOIN ===
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/mocyno.firebasestorage.app/o/mocyno-logo.png?alt=media&token=84148995-5eeb-4ce2-913d-78e95e10cfe3";
const FROM_EMAIL = "no-reply@mocyno.com";    // domaine vérifié Resend
const ADMIN_EMAIL = "contact@mocyno.com";    // destinataire admin
// ===========================

const cors = corsPackage({
  origin: [
    "https://mocyno.com",
    "https://www.mocyno.com",
    "https://mocyno.web.app",
    "http://localhost:5000",
    "http://localhost:3000",
  ],
  methods: ["POST", "OPTIONS"],
});

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Pré-vol CORS
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return cors(req, res, () => res.status(204).send(""));
  }
  return cors(req, res, next);
});

// Route du formulaire
app.post("/api/contact", async (req, res) => {
  try {
    // Honeypot anti-bot
    if (req.body.website) return res.redirect(303, "/merci.html");

    // Champs
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const service = String(req.body.service || "").trim();
    const message = String(req.body.message || "").trim();

    // Validations
    if (!name || !email || !message) return res.status(400).send("Champs requis manquants.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send("Adresse email invalide.");
    if (message.length > 10000) return res.status(413).send("Message trop long.");

    // Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).send("Clé d'API Resend manquante.");
    const resend = new Resend(apiKey);

    // Gabarits
    const escaped = (s) => s.replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const msgHtml = escaped(message).replace(/\n/g, "<br>");

    const frameOpen = `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#222;background:#f5f7fa;padding:20px"><div style="max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 3px 10px rgba(0,0,0,.08)">`;
    const header = `
      <div style="text-align:center;margin-bottom:16px">
        <img src="${LOGO_URL}" alt="MO'Cyno" width="120" style="height:auto;margin-bottom:8px">
        <h2 style="margin:0;color:#0f3552">MO'Cyno Sécurité Privée</h2>
        <p style="margin:4px 0 0;color:#555;font-size:13px">Cynophile • Incendie • Sécurité</p>
      </div>`;
    const frameClose = `<hr style="margin:24px 0;border:none;border-top:1px solid #eee"><p style="font-size:12px;color:#888;text-align:center">Mail envoyé depuis <a href="https://mocyno.com" style="color:#0f62fe;text-decoration:none">mocyno.com</a></p></div></div>`;

    // --- Email ADMIN ---
    const subjectAdmin = `Nouveau message — MO'Cyno (${escaped(name)})`;
    const htmlAdmin = `
      ${frameOpen}${header}
      <h3 style="margin:0 0 10px 0;color:#222">📩 Nouveau message depuis le site</h3>
      <p><strong>Nom / Entreprise :</strong> ${escaped(name)}</p>
      <p><strong>Email :</strong> ${escaped(email)}</p>
      <p><strong>Téléphone :</strong> ${escaped(phone)}</p>
      <p><strong>Service :</strong> ${escaped(service)}</p>
      <p><strong>Message :</strong><br>${msgHtml}</p>
      ${frameClose}
    `;
    const textAdmin =
      `Nom / Entreprise: ${name}\n` +
      `Email: ${email}\nTéléphone: ${phone}\nService: ${service}\n\n` +
      `Message:\n${message}\n`;

    // --- Email CLIENT (accusé de réception) ---
    const subjectClient = "Accusé de réception — MO'Cyno";
    const htmlClient = `
      ${frameOpen}${header}
      <h3 style="margin:0 0 10px 0;color:#222">Merci ${escaped(name)} ✅</h3>
      <p>Nous avons bien reçu votre message et vous répondrons rapidement.</p>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:14px 0">
        <p style="margin:0 0 6px 0"><strong>Récapitulatif :</strong></p>
        <p style="margin:0"><strong>Service :</strong> ${escaped(service) || "—"}</p>
        <p style="margin:0"><strong>Téléphone :</strong> ${escaped(phone) || "—"}</p>
        <p style="margin:0"><strong>Message :</strong><br>${msgHtml}</p>
      </div>
      ${frameClose}
    `;
    const textClient =
      `Bonjour ${name},\n\n` +
      `Nous confirmons la réception de votre message. Nous vous recontactons rapidement.\n\n` +
      `— MO'Cyno`;

    // Envois
    await Promise.all([
      resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: subjectAdmin,
        reply_to: email,          // <-- Resend attend reply_to (snake_case)
        html: htmlAdmin,
        text: textAdmin,
      }),
      resend.emails.send({
        from: FROM_EMAIL,
        to: email,                // accusé de réception
        subject: subjectClient,
        reply_to: ADMIN_EMAIL,
        html: htmlClient,
        text: textClient,
      }),
    ]);

    return res.redirect(303, "/merci.html");
  } catch (err) {
    console.error("contactForm error:", err);
    return res.status(500).send("Impossible d'envoyer le message pour le moment.");
  }
});

// Export function
exports.contactForm = onRequest(
  { region: "europe-west1", cors: false, secrets: ["RESEND_API_KEY"] },
  app
);
