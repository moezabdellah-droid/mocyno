/**
 * Mo'Cyno - Firebase Functions (v2)
 * IMPORTANT:
 * - No hardcoded secrets
 * - RESEND_API_KEY must be provided via environment (prod) and/or functions/.env (local analysis)
 */

require("dotenv").config();

const admin = require("firebase-admin");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { Resend } = require("resend");

admin.initializeApp();

// Initialize Resend (no hardcoded key)
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not set");
}
const resend = new Resend(resendApiKey);

// Helper to generate Google Calendar Link
function generateGoogleCalendarLink(title, start, end, details, location) {
  const formatDate = (date) => date.replace(/-|:|\./g, "");
  const startStr = formatDate(new Date(start).toISOString().split(".")[0]);
  const endStr = formatDate(new Date(end).toISOString().split(".")[0]);

  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    details: details,
    location: location,
    ctz: "Europe/Paris",
  });
  return `${baseUrl}?${params.toString()}`;
}

// Generate ICS Content
function generateICS(missions) {
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MoCyno//Planning//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  missions.forEach((m) => {
    m.vacations.forEach((v) => {
      const startStr = v.date.replace(/-/g, "") + "T" + v.start.replace(/:/g, "") + "00";
      const endStr = v.date.replace(/-/g, "") + "T" + v.end.replace(/:/g, "") + "00";
      const now = new Date().toISOString().replace(/-|:|\./g, "").substring(0, 15) + "Z";

      icsContent += `BEGIN:VEVENT
UID:${m.siteName.replace(/\s/g, "")}-${v.date}-${v.start}@mocyno.com
DTSTAMP:${now}
DTSTART;TZID=Europe/Paris:${startStr}
DTEND;TZID=Europe/Paris:${endStr}
SUMMARY:Mission Mo'Cyno: ${m.siteName}
DESCRIPTION:${m.specialty} - ${m.notes || ""}
LOCATION:${m.siteAddress || m.siteName}
STATUS:CONFIRMED
END:VEVENT
`;
    });
  });

  icsContent += "END:VCALENDAR";
  return icsContent;
}

// Function to create an Agent (Auth + Firestore)
exports.createAgent = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const {
    email,
    password,
    firstName,
    lastName,
    specialties,
    birthDate,
    birthPlace,
    nationality,
    gender,
    bloodGroup,
    address,
    zipCode,
    city,
    phone,
    socialSecurityNumber,
    bankName,
    iban,
    bic,
    professionalCardNumber,
    professionalCardObtainedAt,
    sstNumber,
    sstObtainedAt,
    sstExpiresAt,
    photoURL,
    contractNature,
    contractType,
  } = request.data;

  try {
    let userRecord;
    let isNewUser = false;

    // Generate Matricule: MOCY-[Year]-[Random4Digits]
    const matricule = `MOCY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Proactively check if user exists in Auth
      userRecord = await admin.auth().getUserByEmail(email);

      // If user exists, check Firestore profile (Orphan check)
      const doc = await admin.firestore().collection("agents").doc(userRecord.uid).get();
      if (doc.exists) {
        throw new HttpsError("already-exists", "Cet email est déjà utilisé par un agent actif.");
      }

      // Orphaned user found (Auth exists, Firestore missing). Verify/Update it.
      console.log(`Recovering orphaned auth user: ${email}`);
      await admin.auth().updateUser(userRecord.uid, {
        password,
        displayName: `${firstName} ${lastName}`,
        emailVerified: true,
        photoURL: photoURL || null,
      });
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // User does not exist. Create new one.
        isNewUser = true;
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
          photoURL: photoURL || null,
        });
      } else {
        throw error;
      }
    }

    // 2. Create Firestore Document (Common path for new or recovered)
    await admin.firestore().collection("agents").doc(userRecord.uid).set({
      firstName,
      lastName,
      email,
      role: "agent",
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),

      // Generated
      matricule,

      // Professional
      specialties: specialties || [],
      professionalCardNumber: professionalCardNumber || null,
      professionalCardObtainedAt: professionalCardObtainedAt || null,
      sstNumber: sstNumber || null,
      sstObtainedAt: sstObtainedAt || null,
      sstExpiresAt: sstExpiresAt || null,
      contractNature: contractNature || null,
      contractType: contractType || null,

      // Personal
      birthDate: birthDate || null,
      birthPlace: birthPlace || null,
      nationality: nationality || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      photoURL: photoURL || null,

      // Contact
      address: address || null,
      zipCode: zipCode || null,
      city: city || null,
      phone: phone || null,

      // Administrative / Banking
      socialSecurityNumber: socialSecurityNumber || null,
      bankName: bankName || null,
      iban: iban || null,
      bic: bic || null,

      currentSpecialty: null,
    });

    return {
      uid: userRecord.uid,
      message: isNewUser ? "Agent created successfully" : "Agent account recovered and created",
    };
  } catch (error) {
    console.error("Error creating agent:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Erreur création: ${error.message}`);
  }
});

// Function to send planning emails when a mission is created
exports.sendPlanningEmail = onDocumentCreated(
  { document: "planning/{missionId}", region: "europe-west1" },
  async (event) => {
    try {
      const mission = event.data.data();
      const missionId = event.params.missionId;

      console.log(`Sending planning emails for mission ${missionId}`);

      if (!mission.agentAssignments || mission.agentAssignments.length === 0) {
        console.log("No agent assignments found, skipping email");
        return;
      }

      const emailPromises = mission.agentAssignments.map(async (assignment) => {
        try {
          const agentDoc = await admin.firestore().collection("agents").doc(assignment.agentId).get();
          if (!agentDoc.exists) {
            console.error(`Agent ${assignment.agentId} not found`);
            return;
          }

          const agent = agentDoc.data();

          const vacationsHtml = assignment.vacations
            .map((v) => `<li><strong>${formatDate(v.date)}</strong> : ${v.start} - ${v.end}</li>`)
            .join("");

          const { data, error } = await resend.emails.send({
            from: "Mo'Cyno Planning <planning@mocyno.com>",
            to: [agent.email],
            subject: `Nouvelle Mission : ${mission.siteName}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                  .header { background-color: #000000; padding: 20px; text-align: center; }
                  .logo { max-height: 60px; }
                  .content { padding: 30px 20px; }
                  .info-block { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #CD1A20; }
                  .button { display: inline-block; background-color: #CD1A20; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
                  .footer { background-color: #f4f4f4; padding: 20px; text-align: center; color: #666; font-size: 12px; }
                  h1 { color: #CD1A20; margin-top: 0; }
                  h3 { color: #333; margin-bottom: 5px; }
                  ul { padding-left: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <img src="https://mocyno.com/mocyno-logo.webp" alt="Mo'Cyno" class="logo">
                  </div>
                  <div class="content">
                    <h1>🔔 Nouvelle Mission</h1>
                    <p>Bonjour <strong>${agent.firstName} ${agent.lastName}</strong>,</p>
                    <p>Une nouvelle mission vous a été assignée. Voici les détails :</p>
                    
                    <div class="info-block">
                      <h3>📍 Site</h3>
                      <p><strong>${mission.siteName}</strong></p>
                    </div>

                    <div class="info-block">
                      <h3>🎯 Spécialité</h3>
                      <p><strong>${assignment.specialty}</strong></p>
                    </div>

                    <div class="info-block">
                      <h3>📅 Planning</h3>
                      <ul>${vacationsHtml}</ul>
                    </div>

                    ${mission.notes
                ? `
                    <div class="info-block">
                      <h3>📝 Consignes Spécifiques</h3>
                      <p>${mission.notes}</p>
                    </div>
                    `
                : ""
              }

                    <div style="text-align: center;">
                      <a href="https://mocyno.web.app/mobile" class="button">Voir sur l'App Mobile</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p><strong>MO'CYNO</strong> - Agence de Sécurité Privée Var & Cynophile</p>
                    <p>Cet email est envoyé automatiquement. Merci de ne pas répondre.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          if (error) {
            console.error(`Error sending email to ${agent.email}:`, error);
          } else {
            console.log(`Email sent successfully to ${agent.email}:`, data);
          }
        } catch (error) {
          console.error(`Error processing agent ${assignment.agentId}:`, error);
        }
      });

      await Promise.all(emailPromises);
      console.log(`All planning emails sent for mission ${missionId}`);
    } catch (error) {
      console.error("Error in sendPlanningEmail:", error);
    }
  }
);

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Callable function to send a planning summary email manually
exports.sendAgentPlanningSummary = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  const { agentId } = request.data;
  if (!agentId) {
    throw new HttpsError("invalid-argument", 'The function must be called with an "agentId".');
  }

  try {
    const agentDoc = await admin.firestore().collection("agents").doc(agentId).get();
    if (!agentDoc.exists) {
      throw new HttpsError("not-found", "Agent not found.");
    }
    const agent = agentDoc.data();
    if (!agent.email) {
      throw new HttpsError("failed-precondition", "Agent has no email address.");
    }

    const planningSnapshot = await admin.firestore()
      .collection("planning")
      .where("assignedAgentIds", "array-contains", agentId)
      .get();

    const upcomingMissions = [];

    const missionPromises = planningSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const assignment = data.agentAssignments?.find((a) => a.agentId === agentId);
      if (!assignment || !assignment.vacations) return;

      const futureVacations = assignment.vacations
        .filter((v) => {
          const vacEnd = new Date(`${v.date}T${v.end}`);
          return vacEnd > new Date();
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (futureVacations.length > 0) {
        let siteAddress = "";
        if (data.siteId) {
          try {
            const siteDoc = await admin.firestore().collection("sites").doc(data.siteId).get();
            if (siteDoc.exists) {
              siteAddress = siteDoc.data().address || "";
            }
          } catch (e) {
            console.error("Error fetching site address", e);
          }
        }

        upcomingMissions.push({
          siteName: data.siteName,
          siteAddress: siteAddress,
          specialty: assignment.specialty,
          notes: data.notes,
          vacations: futureVacations,
        });
      }
    });

    await Promise.all(missionPromises);

    upcomingMissions.sort((a, b) => {
      if (a.vacations.length && b.vacations.length) {
        return new Date(a.vacations[0].date) - new Date(b.vacations[0].date);
      }
      return 0;
    });

    if (upcomingMissions.length === 0) {
      return { message: "Aucune mission future trouvée pour cet agent." };
    }

    const missionsHtml = upcomingMissions
      .map(
        (m) => `
          <div class="info-block">
            <h3>📍 ${m.siteName} (${m.specialty})</h3>
            ${m.siteAddress ? `<p style="margin: 0 0 10px 0; color: #666; font-size: 0.9em;">📍 ${m.siteAddress}</p>` : ""}
            <ul>
              ${m.vacations
            .map((v) => {
              const startISO = `${v.date}T${v.start}:00`;
              const endISO = `${v.date}T${v.end}:00`;
              const gCalLink = generateGoogleCalendarLink(
                `Mission: ${m.siteName}`,
                startISO,
                endISO,
                `Spécialité: ${m.specialty}\nNotes: ${m.notes || "Aucune"}`,
                m.siteAddress || m.siteName
              );

              return `
                    <li style="margin-bottom: 8px;">
                      Le <strong>${v.date}</strong> de ${v.start} à ${v.end}
                      <br/>
                      <a href="${gCalLink}" target="_blank" style="font-size: 12px; color: #CD1A20; text-decoration: none;">📅 Ajouter à Google Agenda</a>
                    </li>`;
            })
            .join("")}
            </ul>
            ${m.notes ? `<p><em>Note: ${m.notes}</em></p>` : ""}
          </div>
        `
      )
      .join("");

    const icsFileContent = generateICS(upcomingMissions);
    const icsBuffer = Buffer.from(icsFileContent);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #000000; padding: 20px; text-align: center; }
          .logo { max-height: 60px; }
          .content { padding: 30px 20px; }
          .info-block { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #CD1A20; }
          .button { display: inline-block; background-color: #CD1A20; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
          .footer { background-color: #f4f4f4; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          h1 { color: #CD1A20; margin-top: 0; }
          h3 { color: #333; margin-bottom: 5px; }
          ul { padding-left: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://mocyno.com/mocyno-logo.webp" alt="Mo'Cyno" class="logo">
          </div>
          <div class="content">
            <h1>📅 Rappel Planning</h1>
            <p>Bonjour <strong>${agent.firstName}</strong>,</p>
            <p>Voici le récapitulatif de vos prochaines missions planifiées :</p>
            ${missionsHtml}
            <div style="text-align: center;">
              <a href="https://mocyno.web.app/mobile" class="button">Voir sur l'App Mobile</a>
            </div>
          </div>
          <div class="footer">
            <p><strong>MO'CYNO</strong> - Agence de Sécurité Privée Var & Cynophile</p>
            <p>Cet email est envoyé automatiquement.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: "Mo'Cyno Planning <planning@mocyno.com>",
      to: [agent.email],
      subject: "Votre Planning à venir - Mo'Cyno",
      html: emailHtml,
      attachments: [{ filename: "planning-mocyno.ics", content: icsBuffer }],
    });

    if (error) {
      console.error("Resend API Error:", error);
      throw new HttpsError("internal", "Erreur lors de l'envoi de l'email via Resend.");
    }

    return { success: true, message: `Planning envoyé à ${agent.email}` };
  } catch (error) {
    console.error("Error sending planning summary:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Function to generate matricule for existing agents
exports.generateMatricule = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { agentId } = request.data;
  if (!agentId) {
    throw new HttpsError("invalid-argument", "Agent ID is required.");
  }

  try {
    const db = admin.firestore();
    const agentRef = db.collection("agents").doc(agentId);

    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new HttpsError("not-found", "Agent not found.");
    }

    if (agentDoc.data().matricule) {
      return { matricule: agentDoc.data().matricule, message: "Agent already has a matricule." };
    }

    const matricule = await db.runTransaction(async (transaction) => {
      const counterRef = db.collection("counters").doc("agents");
      const counterDoc = await transaction.get(counterRef);

      let nextCount = 101;
      if (counterDoc.exists) {
        nextCount = (counterDoc.data().count || 100) + 1;
      }

      transaction.set(counterRef, { count: nextCount }, { merge: true });
      return `M${String(nextCount).padStart(5, "0")}`;
    });

    await agentRef.update({ matricule });
    return { matricule, message: "Matricule generated successfully." };
  } catch (error) {
    console.error("Error generating matricule:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Function to update an agent's password
exports.updateAgentPassword = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { agentId, newPassword } = request.data;
  if (!agentId || !newPassword) {
    throw new HttpsError("invalid-argument", "Agent ID and new password are required.");
  }

  if (newPassword.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  try {
    const agentDoc = await admin.firestore().collection("agents").doc(agentId).get();
    if (!agentDoc.exists) {
      throw new HttpsError("not-found", "Agent profile not found.");
    }

    await admin.auth().updateUser(agentId, { password: newPassword });
    console.log(`Password updated for agent ${agentId} by ${request.auth.uid}`);

    return { success: true, message: "Password updated successfully." };
  } catch (error) {
    console.error("Error updating password:", error);
    throw new HttpsError("internal", error.message);
  }
});

// Function to handle Contact Form submissions
exports.contactForm = onRequest({ region: "europe-west1" }, async (req, res) => {
  if (req.method !== "POST") {
    res.set("Allow", "POST");
    res.status(405).send("Méthode non autorisée. Utilisez POST.");
    return;
  }

  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip;

  // Accept both x-www-form-urlencoded and JSON (Firebase parses req.body)
  const { name, email, phone, service, message, website } = req.body || {};

  // Honeypot anti-spam
  if (website) {
    console.log(`Spam détecté (honeypot) depuis IP: ${ip}`);
    res.redirect("/merci.html");
    return;
  }

  // Basic validation
  const nameStr = String(name || "").trim();
  const emailStr = String(email || "").trim();
  const messageStr = String(message || "").trim();
  const phoneStr = String(phone || "").trim();
  const serviceStr = String(service || "").trim();

  if (!nameStr || !emailStr || !messageStr) {
    res.status(400).send("Champs obligatoires manquants (Nom, Email ou Message).");
    return;
  }

  // Email validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  if (!emailValid) {
    res.status(400).send("Email invalide.");
    return;
  }

  // Size limit (anti-abuse)
  if (messageStr.length > 5000) {
    res.status(400).send("Message trop long.");
    return;
  }

  try {
    // 1. Send Admin Notification (to Mo'Cyno Team)
    const adminEmail = await resend.emails.send({
      from: "Mo'Cyno Contact <no-reply@mocyno.com>",
      to: ["contact@mocyno.com", "abdellahmoez@gmail.com", "moezabdellah@mocyno.com"],
      replyTo: emailStr,
      subject: `Nouveau Contact Site : ${nameStr} (${serviceStr || "Général"})`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #0f3552;">Nouveau Message via le Site Web</h2>
          <p><strong>Nom :</strong> ${escapeHtml(nameStr)}</p>
          <p><strong>Email :</strong> <a href="mailto:${escapeHtml(emailStr)}">${escapeHtml(emailStr)}</a></p>
          <p><strong>Téléphone :</strong> ${escapeHtml(phoneStr || "Non renseigné")}</p>
          <p><strong>Service Intéressé :</strong> ${escapeHtml(serviceStr || "Non spécifié")}</p>
          <p><strong>IP :</strong> ${escapeHtml(String(ip || ""))}</p>
          <hr>
          <h3>Message :</h3>
          <p style="white-space: pre-wrap; background: #f9f9f9; padding: 15px; border-left: 4px solid #CD1A20;">${escapeHtml(
        messageStr
      ).replace(/\n/g, "<br/>")}</p>
        </body>
        </html>
      `,
    });

    if (adminEmail.error) {
      console.error("Resend Admin Error:", adminEmail.error);
      // We continue even if admin email fails, to try telling the user or at least redirecting?
      // But standard practice is to fail if admin notification fails.
      res.status(500).send("Erreur lors de l'envoi de l'email.");
      return;
    }

    // 2. Send User Confirmation (to the sender)
    // We do not block execution on error for this one (fire and forget logic or loose coupling)
    try {
      await resend.emails.send({
        from: "Mo'Cyno <no-reply@mocyno.com>",
        to: [emailStr],
        subject: "Confirmation de réception - MO'CYNO",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .email-container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background-color: #022C51; padding: 30px; text-align: center; }
            .logo { max-height: 60px; border-radius: 4px; }
            .content { padding: 40px 30px; }
            .h1 { color: #022C51; font-size: 24px; margin-top: 0; }
            .message-box { background: #f9f9f9; padding: 20px; border-left: 4px solid #CD1A20; margin: 20px 0; color: #555; font-style: italic; }
            .btn { display: inline-block; background-color: #CD1A20; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
            .footer { background-color: #0f3552; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; }
            .footer a { color: #ffffff; text-decoration: underline; }
          </style>
          </head>
          <body>
          <div class="email-container">
            <div class="header">
              <img src="https://mocyno.com/mocyno-logo.webp" alt="MO'CYNO" class="logo">
            </div>
            <div class="content">
              <h1 class="h1">Bonjour ${escapeHtml(nameStr)},</h1>
              <p>Nous avons bien reçu votre demande concernant <strong>${escapeHtml(serviceStr || "Sécurité Privée")}</strong>.</p>
              <p>Notre équipe traite votre message actuellement. Un expert sécurité MO'CYNO reviendra vers vous sous <strong>24 heures ouvrées</strong> pour étudier votre besoin.</p>
              <hr style="border:0; border-top:1px solid #eee; margin: 25px 0;">
              <p><strong>Récapitulatif de votre message :</strong></p>
              <div class="message-box">
                "${escapeHtml(messageStr).replace(/\n/g, "<br/>")}"
              </div>
              <p>En attendant, n'hésitez pas à consulter nos zones d'intervention ou nos dernières actualités.</p>
              <div style="text-align: center;">
                <a href="https://mocyno.com" class="btn">Retourner sur le site</a>
              </div>
            </div>
            <div class="footer">
              <p><strong>MO'CYNO - Sécurité Privée & Cynophile</strong><br>
              31 Rue Chevalier Paul, 83000 Toulon</p>
              <p>Autorisation CNAPS : AUT-83-2124-09-09-20250998415</p>
              <p><a href="https://mocyno.com">www.mocyno.com</a></p>
            </div>
          </div>
          </body>
          </html>
        `
      });
      console.log(`Confirmation email sent to ${emailStr}`);
    } catch (confError) {
      console.error("Error sending user confirmation:", confError);
    } // End user confirmation

    console.log(`Contact email sent from ${emailStr}`, adminEmail.data);
    res.redirect("/merci.html");
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).send("Erreur interne du serveur.");
  }
});

// Minimal HTML escaping to avoid injection in emails
function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
