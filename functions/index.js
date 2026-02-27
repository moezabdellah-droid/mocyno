/**
 * Mo'Cyno - Firebase Functions (v2)
 * IMPORTANT:
 * - No hardcoded secrets
 * - RESEND_API_KEY must be provided via environment (prod) and/or functions/.env (local analysis)
 */

// Load .env only for local/dev (Cloud Functions/Run provides env vars at runtime)
try {
  if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
} catch (_) {
  // If dotenv isn't installed or .env is missing, ignore in non-prod
}

const admin = require("firebase-admin");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { Resend } = require("resend");
const { FieldValue } = require("firebase-admin/firestore");
const { generateClientReport } = require("./reporting");
const { DateTime } = require("luxon");

const TZ = "Europe/Paris";
const REGION = "europe-west1";

admin.initializeApp();

// Initialize Resend (no hardcoded key)
// Initialize Resend (no hardcoded key)
const resendApiKey = process.env.RESEND_API_KEY;
let resend;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn("RESEND_API_KEY is not set. Emails will fail.");
}

const crypto = require("crypto");

// --- RBAC helpers (P0) ---
async function getCallerRole(uid) {
  const snap = await admin.firestore().collection("agents").doc(uid).get();
  return snap.exists && snap.data()?.role ? snap.data().role : "agent";
}

async function requireAdminOrManager(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  // Dual source: Claims OR Firestore
  let role = request.auth.token?.role;
  if (!role || (role !== "admin" && role !== "manager")) {
    role = await getCallerRole(request.auth.uid);
  }
  if (role !== "admin" && role !== "manager") {
    throw new HttpsError("permission-denied", "Admin/Manager privileges required.");
  }
  return role;
}

async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  let role = request.auth.token?.role;
  if (!role || role !== "admin") {
    role = await getCallerRole(request.auth.uid);
  }
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
  return role;
}

// --- Rate limiting (Firestore transaction) ---
async function rateLimitOrThrow(key, limit, windowMs) {
  const now = Date.now();
  const ref = admin.firestore().collection("rateLimits").doc(key);

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const resetAt = data.resetAt || 0;
    let count = data.count || 0;

    if (now > resetAt) count = 0;
    count += 1;

    if (count > limit) {
      console.warn(JSON.stringify({
        securityEvent: "RATE_LIMIT",
        key: key,
        limit: limit,
      }));
      throw new HttpsError("resource-exhausted", "Too many requests. Try again later.");
    }

    tx.set(
      ref,
      {
        count,
        resetAt: now + windowMs,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

// --- Audit log minimal (P0) ---
async function writeAudit({ action, actorUid, targetUid, meta }) {
  await admin.firestore().collection("auditLogs").add({
    action,
    actorUid,
    targetUid: targetUid || null,
    meta: meta || {},
    at: FieldValue.serverTimestamp(),
  });
}

// --- Utils ---
function sha1(input) {
  return crypto.createHash("sha1").update(String(input || "")).digest("hex");
}

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

// Function to create Portal Access for a Client
exports.createClientPortalAccess = onCall({ region: "europe-west1" }, async (request) => {
  await requireAdminOrManager(request);
  await rateLimitOrThrow(`createClientPortalAccess:${request.auth.uid}`, 10, 60_000);

  const { clientId, email, name } = request.data;
  if (!clientId || !email || !name) {
    throw new HttpsError("invalid-argument", "clientId, email, and name are required.");
  }

  try {
    let userRecord;
    let tempPassword = null;
    let isNewUser = false;

    try {
      // 1. Check if user already exists
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`User already exists for email: ${email}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // 2. Create Firebase Auth user
        isNewUser = true;
        tempPassword = crypto.randomBytes(6).toString("hex"); // 12 chars
        userRecord = await admin.auth().createUser({
          email: email,
          password: tempPassword,
          displayName: name,
          emailVerified: true,
        });
      } else {
        throw error;
      }
    }

    // 3. Set Custom Claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'client',
      clientId: clientId
    });

    // 4. Update Client Document
    await admin.firestore().collection('clients').doc(clientId).update({
      authUid: userRecord.uid,
      portalAccess: true,
      portalActivatedAt: FieldValue.serverTimestamp()
    });

    // 5. Send Email via Resend - ONLY IF NEW USER OR RESET PASSWORD
    if (resend) {
      let emailSubject = "";
      let emailHtml = "";

      if (isNewUser) {
        // Générer le lien de reset du mot de passe direct au lieu d'envoyer le mot de passe en clair (Best Practice)
        const resetLink = await admin.auth().generatePasswordResetLink(email);
        emailSubject = "Votre accès sécurisé Espace Client MO'CYNO";
        emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0288d1;">Bienvenue sur votre Espace Client MO'CYNO</h2>
            <p>Bonjour ${name},</p>
            <p>Votre portail client sécurisé vient d'être activé.</p>
            <p><strong>Vos identifiants de connexion :</strong></p>
            <ul>
                <li>Email : ${email}</li>
            </ul>
             <div style="text-align: center; margin: 20px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #0288d1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Définir mon mot de passe et me connecter</a>
            </div>
            <p>Lien du portail de connexion : <a href="https://mocyno.com/client">https://mocyno.com/client</a></p>
            <hr />
            <p style="font-size: 12px; color: #777;">Ceci est un message automatique, merci de ne pas y répondre.</p>
          </div>
        `;
      } else {
        // Envoi d'un lien de réinitialisation si le compte existe déjà
        const resetLink = await admin.auth().generatePasswordResetLink(email);
        emailSubject = "Vos accès Espace Client MO'CYNO (Réinitialisation)";
        emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0288d1;">Bonjour ${name},</h2>
            <p>Un administrateur vous a (ré)attribué des accès à votre Espace Client MO'CYNO.</p>
            <p>Votre compte est déjà créé. Si vous ne connaissez pas ou avez oublié votre mot de passe, vous pouvez le réinitialiser en cliquant sur le lien sécurisé ci-dessous :</p>
            <div style="text-align: center; margin: 20px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #0288d1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Réinitialiser mon mot de passe</a>
            </div>
            <p>Lien du portail de connexion : <a href="https://mocyno.com/client">https://mocyno.com/client</a></p>
            <p>Email de connexion : <strong>${email}</strong></p>
            <hr />
            <p style="font-size: 12px; color: #777;">Ceci est un message automatique, merci de ne pas y répondre.</p>
          </div>
        `;
      }

      await resend.emails.send({
        from: "Mo'Cyno Sécurité <ne-pas-repondre@mocyno.com>",
        to: email,
        subject: emailSubject,
        html: emailHtml
      });
    }

    return { success: true, uid: userRecord.uid, message: isNewUser ? 'Created and emailed' : 'Already exists, link emailed' };
  } catch (error) {
    console.error("Error in createClientPortalAccess:", error);
    throw new HttpsError("internal", error.message || "Erreur lors de la création de l'accès client.");
  }
});

// Function to create an Agent (Auth + Firestore)
exports.createAgent = onCall({ region: "europe-west1" }, async (request) => {
  const callerRole = await requireAdminOrManager(request);
  await rateLimitOrThrow(`createAgent:${request.auth.uid}`, 10, 60_000);

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

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new HttpsError("invalid-argument", "Email is required.");
  }
  if (!password || String(password).length < 12) {
    throw new HttpsError("invalid-argument", "Password must be at least 12 characters.");
  }

  try {
    let userRecord;
    let isNewUser = false;

    // Generate Matricule: MOCY-[Year]-[Random4Digits]
    const matricule = `MOCY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Proactively check if user exists in Auth
      userRecord = await admin.auth().getUserByEmail(normalizedEmail);

      // If user exists, check Firestore profile (Orphan check)
      const doc = await admin.firestore().collection("agents").doc(userRecord.uid).get();
      if (doc.exists) {
        throw new HttpsError("already-exists", "Cet email est déjà utilisé par un agent actif.");
      }

      // Orphaned user found (Auth exists, Firestore missing). Verify/Update it.
      console.log(`Recovering orphaned auth user: ${normalizedEmail}`);
      const userUpdate = {
        password,
        displayName: `${firstName} ${lastName}`,
      };
      if (photoURL) userUpdate.photoURL = photoURL;
      await admin.auth().updateUser(userRecord.uid, userUpdate);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // User does not exist. Create new one.
        isNewUser = true;
        const userCreate = {
          email: normalizedEmail,
          password,
          displayName: `${firstName} ${lastName}`,
        };
        if (photoURL) userCreate.photoURL = photoURL;
        userRecord = await admin.auth().createUser(userCreate);
      } else {
        throw error;
      }
    }

    // 2. Custom Claims (role=agent)
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: "agent",
      agentId: matricule,
    });

    // 3. WriteBatch atomique : agents/{uid} (public) + agents/{uid}/private/data (PII)
    // Si le batch échoue → rollback Auth pour éviter un compte Auth orphelin.
    const db = admin.firestore();
    const agentRef = db.collection("agents").doc(userRecord.uid);
    const privateRef = agentRef.collection("private").doc("data");
    const batch = db.batch();

    // Champs publics (lisibles par l'agent lui-même et par l'admin)
    batch.set(agentRef, {
      firstName,
      lastName,
      email: normalizedEmail,
      role: "agent",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      matricule,
      specialties: specialties || [],
      professionalCardNumber: professionalCardNumber || null,
      professionalCardObtainedAt: professionalCardObtainedAt || null,
      sstNumber: sstNumber || null,
      sstObtainedAt: sstObtainedAt || null,
      sstExpiresAt: sstExpiresAt || null,
      contractNature: contractNature || null,
      contractType: contractType || null,
      photoURL: photoURL || null,
      phone: phone || null,
      currentSpecialty: null,
    });

    // Champs sensibles (PII) — sous-collection private (accessible self + admin)
    batch.set(privateRef, {
      socialSecurityNumber: socialSecurityNumber || null,
      bankName: bankName || null,
      iban: iban || null,
      bic: bic || null,
      birthDate: birthDate || null,
      birthPlace: birthPlace || null,
      nationality: nationality || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      address: address || null,
      zipCode: zipCode || null,
      city: city || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (batchError) {
      // Rollback : supprimer le compte Auth pour éviter un utilisateur orphelin
      console.error(`Batch failed for ${userRecord.uid}, rolling back Auth user:`, batchError);
      try {
        if (isNewUser) await admin.auth().deleteUser(userRecord.uid);
      } catch (rollbackErr) {
        console.error(`Rollback also failed for ${userRecord.uid}:`, rollbackErr);
      }
      throw new HttpsError("internal", `Échec de la création atomique (rollback effectué): ${batchError.message}`);
    }

    await writeAudit({
      action: "CREATE_AGENT",
      actorUid: request.auth.uid,
      targetUid: userRecord.uid,
      meta: { isNewUser, callerRole },
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

// ════════════════════════════════════════════════════════════════════════
// SEC-002 : setUserRole — Callable admin uniquement
// Synchronise le rôle en Firestore ET en custom claim JWT
// ════════════════════════════════════════════════════════════════════════
exports.setUserRole = onCall({ region: "europe-west1" }, async (request) => {
  await requireAdmin(request);
  await rateLimitOrThrow(`setUserRole:${request.auth.uid}`, 20, 60_000);

  const { uid, role } = request.data;

  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "uid is required.");
  }

  const VALID_ROLES = ["admin", "manager", "agent"];
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  // Vérifier que la cible existe
  const targetSnap = await admin.firestore().collection("agents").doc(uid).get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "Agent not found.");
  }
  const previousRole = targetSnap.data()?.role || "agent";

  // Anti-IDOR : admin ne peut pas se dégrader lui-même
  if (uid === request.auth.uid && role !== "admin") {
    throw new HttpsError("permission-denied", "Admin cannot change their own role.");
  }

  // Mise à jour simultanée : custom claims JWT + Firestore
  await Promise.all([
    admin.auth().setCustomUserClaims(uid, { role }),
    admin.firestore().collection("agents").doc(uid).update({ role }),
  ]);

  await writeAudit({
    action: "SET_USER_ROLE",
    actorUid: request.auth.uid,
    targetUid: uid,
    meta: { previousRole, newRole: role },
  });

  console.log(`Role updated: ${uid} ${previousRole} → ${role} by ${request.auth.uid}`);
  return { success: true, message: `Role updated to ${role}. User must re-login for JWT to refresh.` };
});

// ════════════════════════════════════════════════════════════════════════
// SEC-001 : updateAgentSensitiveData — Callable admin/manager
// Met à jour les données PII dans agents/{uid}/private/data
// ════════════════════════════════════════════════════════════════════════
exports.updateAgentSensitiveData = onCall({ region: "europe-west1" }, async (request) => {
  await requireAdminOrManager(request);
  await rateLimitOrThrow(`updateSensitive:${request.auth.uid}`, 30, 60_000);

  const { agentId, sensitiveData } = request.data;

  if (!agentId || typeof agentId !== "string") {
    throw new HttpsError("invalid-argument", "agentId is required.");
  }
  if (!sensitiveData || typeof sensitiveData !== "object") {
    throw new HttpsError("invalid-argument", "sensitiveData object is required.");
  }

  // Whitelist des champs autorisés (sécurité contre injection de champs arbitraires)
  const ALLOWED_SENSITIVE_FIELDS = [
    "socialSecurityNumber", "iban", "bic", "bankName",
    "birthDate", "birthPlace", "nationality", "gender", "bloodGroup",
    "address", "zipCode", "city",
  ];

  const sanitized = {};
  for (const field of ALLOWED_SENSITIVE_FIELDS) {
    if (sensitiveData[field] !== undefined) {
      sanitized[field] = sensitiveData[field];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new HttpsError("invalid-argument", "No valid sensitive fields provided.");
  }

  // Vérifier que l'agent existe
  const agentSnap = await admin.firestore().collection("agents").doc(agentId).get();
  if (!agentSnap.exists) {
    throw new HttpsError("not-found", "Agent not found.");
  }

  const privateRef = admin.firestore()
    .collection("agents").doc(agentId)
    .collection("private").doc("data");

  await privateRef.set(
    { ...sanitized, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  await writeAudit({
    action: "UPDATE_AGENT_SENSITIVE_DATA",
    actorUid: request.auth.uid,
    targetUid: agentId,
    meta: { updatedFields: Object.keys(sanitized) },
  });

  console.log(`Sensitive data updated for agent ${agentId} by ${request.auth.uid}`);
  return { success: true, updatedFields: Object.keys(sanitized) };
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
  const callerRole = await requireAdminOrManager(request);
  await rateLimitOrThrow(`updateAgentPassword:${request.auth.uid}`, 10, 60_000);

  const { agentId, newPassword } = request.data;
  if (!agentId || !newPassword) {
    throw new HttpsError("invalid-argument", "Agent ID and new password are required.");
  }

  if (String(newPassword).length < 12) {
    throw new HttpsError("invalid-argument", "Password must be at least 12 characters.");
  }

  try {
    const agentDoc = await admin.firestore().collection("agents").doc(agentId).get();
    if (!agentDoc.exists) {
      throw new HttpsError("not-found", "Agent profile not found.");
    }

    const targetRole = agentDoc.data()?.role || "agent";

    // Anti-IDOR : un manager ne peut pas toucher admin/manager
    if (callerRole === "manager" && targetRole !== "agent") {
      throw new HttpsError("permission-denied", "Manager cannot reset admin/manager passwords.");
    }

    await admin.auth().updateUser(agentId, { password: String(newPassword) });

    await writeAudit({
      action: "RESET_PASSWORD",
      actorUid: request.auth.uid,
      targetUid: agentId,
      meta: { callerRole, targetRole },
    });

    console.log(`Password updated for agent ${agentId} by ${request.auth.uid}`);

    return { success: true, message: "Password updated successfully." };
  } catch (error) {
    console.error("Error updating password:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

// Function to handle Contact Form submissions
exports.contactForm = onRequest({ region: "europe-west1" }, async (req, res) => {
  const origin = req.headers.origin || "";
  const allowedOrigins = (process.env.CONTACT_ALLOWED_ORIGINS || "https://mocyno.com,https://www.mocyno.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.set("Allow", "POST");
    res.status(405).send("Méthode non autorisée. Utilisez POST.");
    return;
  }

  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip;

  // Rate limit: 20 req / 10 minutes par IP
  const ipKey = sha1(String(ip || "unknown"));
  await rateLimitOrThrow(`contactForm:${ipKey}`, 20, 10 * 60_000);

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
    const contactTo = (process.env.CONTACT_TO || "contact@mocyno.com")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // 1. Send Admin Notification (to Mo'Cyno Team)
    const adminEmail = await resend.emails.send({
      from: "Mo'Cyno Contact <no-reply@mocyno.com>",
      to: contactTo,
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

// ===================================================================
// DOCUMENTS MANAGEMENT V1 (RBAC FIRESTORE-ONLY - PRO BÉTON v2.3.1 rev2)
// ===================================================================

/**
 * Sanitize filename (éviter path traversal)
 */
function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    throw new HttpsError('invalid-argument', 'Invalid fileName');
  }

  const trimmed = fileName.trim();
  if (!trimmed) {
    throw new HttpsError('invalid-argument', 'fileName is empty after trim');
  }

  const dangerous = /[\/\\]|\.\.|\x00|[\x00-\x1F\x7F]/;
  if (dangerous.test(trimmed)) {
    throw new HttpsError('invalid-argument', 'fileName contains forbidden characters (/, \\, .., null bytes, or control chars)');
  }

  if (trimmed.length > 255) {
    throw new HttpsError('invalid-argument', 'fileName too long (max 255 characters)');
  }

  return trimmed;
}

/**
 * Validate documentId (UUID v4 format STRICT)
 */
function validateDocumentId(documentId) {
  if (!documentId || typeof documentId !== 'string') {
    throw new HttpsError('invalid-argument', 'Invalid documentId');
  }

  const trimmed = documentId.trim();
  if (!trimmed) {
    throw new HttpsError('invalid-argument', 'documentId is empty');
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new HttpsError('invalid-argument', 'documentId cannot contain / or \\');
  }

  if (trimmed.length > 128) {
    throw new HttpsError('invalid-argument', 'documentId too long (max 128 chars)');
  }

  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4Regex.test(trimmed)) {
    throw new HttpsError('invalid-argument', 'documentId must be a valid UUID v4 (use crypto.randomUUID())');
  }

  return trimmed;
}

/**
 * Create Document + Generate Receipts for assigned agents
 * RBAC: Admin/Manager
 * v2.3 P1: status CREATING → ACTIVE/PARTIAL, assignedAgentIds stocké, PDF-only, trim avant dedupe
 */
exports.createDocument = onCall({ region: "europe-west1" }, async (request) => {
  await requireAdminOrManager(request);
  await rateLimitOrThrow(`createDocument:${request.auth.uid}`, 20, 60_000);

  const {
    documentId,
    title,
    type,
    fileName,
    assignedAgentIds,
    requiresAck = true,
    description,
    expiresAt,
    forceAck = false,
  } = request.data;

  if (!documentId || !title || !type || !fileName || !assignedAgentIds) {
    throw new HttpsError("invalid-argument", "Missing required fields: documentId, title, type, fileName, assignedAgentIds");
  }

  const validTypes = ['PROCEDURE', 'CONSIGNE', 'FORMATION', 'LEGAL', 'OTHER'];
  if (!validTypes.includes(type)) {
    throw new HttpsError("invalid-argument", `Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  const safeDocumentId = validateDocumentId(documentId);
  const safeFileName = sanitizeFileName(fileName);

  // PDF-only strict
  if (!safeFileName.toLowerCase().endsWith('.pdf')) {
    throw new HttpsError('invalid-argument', 'Only PDF files are allowed');
  }

  // Trim PUIS dedupe assignedAgentIds
  const trimmedAgentIds = assignedAgentIds
    .filter(id => id && typeof id === 'string')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  const uniqueAgentIds = [...new Set(trimmedAgentIds)];

  if (uniqueAgentIds.length === 0) {
    throw new HttpsError("invalid-argument", "assignedAgentIds is empty or contains only invalid values");
  }

  if (uniqueAgentIds.length > 500) {
    throw new HttpsError("invalid-argument", "Max 500 unique agents per document (Firestore batch limit)");
  }

  let expiresAtTimestamp = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) {
      throw new HttpsError("invalid-argument", "expiresAt is not a valid date");
    }
    expiresAtTimestamp = admin.firestore.Timestamp.fromDate(d);
  }

  try {
    const db = admin.firestore();
    const now = FieldValue.serverTimestamp();
    const storagePath = `documents/${safeDocumentId}/${safeFileName}`;

    const docRef = db.collection("documents").doc(safeDocumentId);

    const documentData = {
      title,
      type,
      fileName: safeFileName,
      storagePath,
      requiresAck,
      uploadedAt: now,
      uploadedBy: request.auth.uid,
      totalAgents: uniqueAgentIds.length,
      ackCount: 0,
      pendingCount: uniqueAgentIds.length,
      forceAck,
      status: "CREATING",
      assignedAgentIds: uniqueAgentIds,
    };

    if (description) documentData.description = description;
    if (expiresAtTimestamp) documentData.expiresAt = expiresAtTimestamp;

    try {
      await docRef.create(documentData);
    } catch (error) {
      const code = error?.code;
      if (code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS') {
        throw new HttpsError("already-exists", `Document ${safeDocumentId} already exists`);
      }
      throw error;
    }

    const chunkSize = 450;
    const chunks = [];
    for (let i = 0; i < uniqueAgentIds.length; i += chunkSize) {
      chunks.push(uniqueAgentIds.slice(i, i + chunkSize));
    }

    let successCount = 0;
    let failedChunks = 0;

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const batch = db.batch();

      for (const agentId of chunk) {
        const receiptId = `${agentId}_${safeDocumentId}`;
        const receiptRef = db.collection("documentReceipts").doc(receiptId);

        batch.set(receiptRef, {
          documentId: safeDocumentId,
          agentId,
          documentTitle: title,
          documentType: type,
          fileName: safeFileName,
          requiresAck,
          uploadedAt: now,
          status: "PENDING",
          createdAt: now,
          viewCount: 0,
        });
      }

      try {
        await batch.commit();
        successCount += chunk.length;
      } catch (error) {
        failedChunks++;
        console.error(`Batch commit failed for chunk ${chunkIndex + 1}/${chunks.length}:`, error);
      }
    }

    const finalStatus = failedChunks === 0 ? "ACTIVE" : "PARTIAL";

    await docRef.update({
      status: finalStatus,
    });

    if (failedChunks > 0) {
      await writeAudit({
        action: "CREATE_DOCUMENT_PARTIAL",
        actorUid: request.auth.uid,
        targetUid: null,
        meta: {
          documentId: safeDocumentId,
          totalAgents: uniqueAgentIds.length,
          successCount,
          failedCount: uniqueAgentIds.length - successCount,
          failedChunks,
          severity: "HIGH",
        },
      });

      return {
        documentId: safeDocumentId,
        message: `Document created with PARTIAL receipts (${successCount}/${uniqueAgentIds.length}). Use repairDocumentReceipts to complete.`,
        partial: true,
        successCount,
        failedCount: uniqueAgentIds.length - successCount,
      };
    }

    await writeAudit({
      action: "CREATE_DOCUMENT",
      actorUid: request.auth.uid,
      targetUid: null,
      meta: { documentId: safeDocumentId, assignedAgents: uniqueAgentIds.length },
    });

    return {
      documentId: safeDocumentId,
      message: "Document created successfully",
      status: finalStatus,
    };
  } catch (error) {
    console.error("Error creating document:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Error creating document: ${error.message}`);
  }
});

/**
 * Repair Document Receipts (créer receipts manquants, idempotent)
 * RBAC: Admin/Manager
 * v2.3.1 rev2 HARDENING:
 * ✅ Fail-tolerant: try/catch par chunk, continue si échec
 * ✅ Audit PARTIAL si ≥1 chunk échoue, NOOP si rien à créer
 * ✅ failedChunkDetails truncate 200 chars, attemptedCreates
 * ✅ Garde-fou assignedAgentIds > 500, cohérence storagePath
 */
exports.repairDocumentReceipts = onCall({ region: "europe-west1" }, async (request) => {
  await requireAdminOrManager(request);
  await rateLimitOrThrow(`repairDocumentReceipts:${request.auth.uid}`, 10, 60_000);

  const { documentId, agentIds } = request.data;

  if (!documentId) {
    throw new HttpsError("invalid-argument", "documentId is required");
  }

  const safeDocumentId = validateDocumentId(documentId);

  try {
    const db = admin.firestore();
    const now = FieldValue.serverTimestamp();

    const docRef = db.collection("documents").doc(safeDocumentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Document not found");
    }

    const docData = docSnap.data();

    // PDF-only strict
    const fileName = String(docData.fileName || "").trim();
    if (!fileName || !fileName.toLowerCase().endsWith(".pdf")) {
      throw new HttpsError("failed-precondition", "Document is not a PDF (.pdf). Repair is refused.");
    }

    // Cohérence storagePath
    const storagePath = String(docData.storagePath || "").trim();
    if (!storagePath.endsWith(`/${fileName}`) || !storagePath.toLowerCase().endsWith(".pdf")) {
      throw new HttpsError(
        "failed-precondition",
        `storagePath is inconsistent (expected ending: /${fileName}). Repair refused for data integrity.`
      );
    }

    const assigned = Array.isArray(docData.assignedAgentIds) ? docData.assignedAgentIds : [];
    if (!assigned.length) {
      throw new HttpsError(
        "failed-precondition",
        "Document missing assignedAgentIds field. Cannot auto-repair safely."
      );
    }

    const assignedNormalized = assigned
      .filter((id) => id && typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    const assignedSet = new Set(assignedNormalized);
    if (assignedSet.size === 0) {
      throw new HttpsError("failed-precondition", "Document assignedAgentIds is empty after normalization.");
    }

    // Garde-fou assignedAgentIds > 500
    if (assignedSet.size > 500) {
      throw new HttpsError(
        "failed-precondition",
        `Document has ${assignedSet.size} assigned agents (max 500 for repair safety). Contact dev team.`
      );
    }

    let targetAgentIds = [];

    if (agentIds && Array.isArray(agentIds) && agentIds.length > 0) {
      targetAgentIds = agentIds
        .filter((id) => id !== null && id !== undefined)
        .map((id) => String(id).trim())
        .filter((id) => id.length > 0);

      targetAgentIds = [...new Set(targetAgentIds)];

      if (targetAgentIds.length === 0) {
        throw new HttpsError("invalid-argument", "agentIds provided but empty after normalization");
      }

      const notAssigned = targetAgentIds.filter((a) => !assignedSet.has(a));
      if (notAssigned.length > 0) {
        throw new HttpsError(
          "invalid-argument",
          `Some agentIds are not assigned to this document: ${notAssigned.slice(0, 5).join(", ")}`
        );
      }
    } else {
      targetAgentIds = [...assignedSet];
    }

    if (targetAgentIds.length > 500) {
      throw new HttpsError("invalid-argument", "Max 500 agents per repair call (batch limit safety)");
    }

    const receiptsSnap = await db
      .collection("documentReceipts")
      .where("documentId", "==", safeDocumentId)
      .get();

    const receiptByAgent = new Map();
    for (const r of receiptsSnap.docs) {
      const d = r.data();
      const agentId = d.agentId;
      if (!agentId || typeof agentId !== "string") continue;
      const norm = agentId.trim();
      if (!assignedSet.has(norm)) continue;
      receiptByAgent.set(norm, d);
    }

    const missingAgentIds = targetAgentIds.filter((agentId) => !receiptByAgent.has(agentId));

    if (missingAgentIds.length === 0) {
      const totalAgents = assignedSet.size;
      let ackCount = 0;
      let receiptsForAssigned = receiptByAgent.size;

      for (const [, d] of receiptByAgent) {
        if (d.status === "ACKED") ackCount++;
      }

      const missingForAssigned = totalAgents - receiptsForAssigned;
      const pendingCount = totalAgents - ackCount;
      const newStatus = missingForAssigned === 0 ? "ACTIVE" : "PARTIAL";

      await docRef.update({
        totalAgents,
        ackCount,
        pendingCount,
        status: newStatus,
      });

      // Audit NOOP
      await writeAudit({
        action: "REPAIR_DOCUMENT_RECEIPTS_NOOP",
        actorUid: request.auth.uid,
        targetUid: null,
        meta: {
          documentId: safeDocumentId,
          requestedAgents: targetAgentIds.length,
          finalStatus: newStatus,
          totalAgents,
          ackCount,
          pendingCount,
          missingForAssigned,
        },
      });

      return {
        documentId: safeDocumentId,
        message: "All receipts already exist for requested agents (nothing to create). Counters/status refreshed.",
        createdReceipts: 0,
        attemptedCreates: 0,
        failedChunks: 0,
        failedCountEstimated: 0,
        skippedExisting: targetAgentIds.length,
        finalStatus: newStatus,
        totalAgents,
        ackCount,
        pendingCount,
        missingForAssigned,
      };
    }

    // Fail-tolerant chunking
    const chunkSize = 450;
    const chunks = [];
    for (let i = 0; i < missingAgentIds.length; i += chunkSize) {
      chunks.push(missingAgentIds.slice(i, i + chunkSize));
    }

    let createdCount = 0;
    let failedChunks = 0;
    const failedChunkDetails = [];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const batch = db.batch();

      for (const agentId of chunk) {
        const receiptId = `${agentId}_${safeDocumentId}`;
        const receiptRef = db.collection("documentReceipts").doc(receiptId);

        batch.set(
          receiptRef,
          {
            documentId: safeDocumentId,
            agentId,
            documentTitle: docData.title,
            documentType: docData.type,
            fileName: docData.fileName,
            requiresAck: docData.requiresAck,
            uploadedAt: docData.uploadedAt,
            status: "PENDING",
            createdAt: docData.uploadedAt || now,
            repairedAt: now,
            viewCount: 0,
          },
          { merge: true }
        );
      }

      try {
        await batch.commit();
        createdCount += chunk.length;
      } catch (error) {
        failedChunks++;
        const errorMsg = String(error.message || error);
        const truncatedMsg = errorMsg.length > 200 ? errorMsg.substring(0, 200) + "..." : errorMsg;

        failedChunkDetails.push({
          chunkIndex: chunkIndex + 1,
          chunkSize: chunk.length,
          error: truncatedMsg,
        });
        console.error(
          `Repair chunk ${chunkIndex + 1}/${chunks.length} failed for document ${safeDocumentId}:`,
          error
        );
      }
    }

    // Recalcul final
    const allReceiptsSnap = await db
      .collection("documentReceipts")
      .where("documentId", "==", safeDocumentId)
      .get();

    let ackCount = 0;
    let receiptsForAssigned = 0;

    for (const r of allReceiptsSnap.docs) {
      const d = r.data();
      const agentId = (d.agentId && typeof d.agentId === "string") ? d.agentId.trim() : null;
      if (!agentId) continue;
      if (!assignedSet.has(agentId)) continue;
      receiptsForAssigned++;
      if (d.status === "ACKED") ackCount++;
    }

    const totalAgents = assignedSet.size;
    const missingForAssigned = totalAgents - receiptsForAssigned;
    const pendingCount = totalAgents - ackCount;
    const newStatus = missingForAssigned === 0 ? "ACTIVE" : "PARTIAL";

    await docRef.update({
      totalAgents,
      ackCount,
      pendingCount,
      status: newStatus,
    });

    const attemptedCreates = missingAgentIds.length;
    const failedCountEstimated = attemptedCreates - createdCount;

    if (failedChunks > 0) {
      await writeAudit({
        action: "REPAIR_DOCUMENT_RECEIPTS_PARTIAL",
        actorUid: request.auth.uid,
        targetUid: null,
        meta: {
          documentId: safeDocumentId,
          createdReceipts: createdCount,
          attemptedCreates,
          failedChunks,
          failedCountEstimated,
          skippedExisting: targetAgentIds.length - missingAgentIds.length,
          finalStatus: newStatus,
          missingForAssigned,
          totalAgents,
          ackCount,
          pendingCount,
          severity: "HIGH",
          failedChunkDetails: failedChunkDetails.slice(0, 3),
        },
      });

      console.warn(
        `Partial repair for document ${safeDocumentId}: created ${createdCount}/${attemptedCreates}, failed chunks: ${failedChunks}, missingForAssigned: ${missingForAssigned}`
      );

      return {
        documentId: safeDocumentId,
        message: `Repair PARTIALLY completed. Created ${createdCount}/${attemptedCreates} receipts, but ${failedChunks} chunk(s) failed. Retry repair or contact dev team.`,
        createdReceipts: createdCount,
        attemptedCreates,
        failedChunks,
        failedCountEstimated,
        skippedExisting: targetAgentIds.length - missingAgentIds.length,
        finalStatus: newStatus,
        totalAgents,
        ackCount,
        pendingCount,
        missingForAssigned,
        partial: true,
      };
    }

    // Succès complet
    await writeAudit({
      action: "REPAIR_DOCUMENT_RECEIPTS",
      actorUid: request.auth.uid,
      targetUid: null,
      meta: {
        documentId: safeDocumentId,
        createdReceipts: createdCount,
        attemptedCreates,
        skippedExisting: targetAgentIds.length - missingAgentIds.length,
        finalStatus: newStatus,
        missingForAssigned,
        totalAgents,
        ackCount,
        pendingCount,
      },
    });

    console.log(
      `Repair completed successfully for document ${safeDocumentId} (created: ${createdCount}/${attemptedCreates}, status: ${newStatus}, missingForAssigned: ${missingForAssigned})`
    );

    return {
      documentId: safeDocumentId,
      message: `Repair completed successfully. Created ${createdCount} receipts.`,
      createdReceipts: createdCount,
      attemptedCreates,
      failedChunks: 0,
      failedCountEstimated: 0,
      skippedExisting: targetAgentIds.length - missingAgentIds.length,
      finalStatus: newStatus,
      totalAgents,
      ackCount,
      pendingCount,
      missingForAssigned,
    };
  } catch (error) {
    console.error("Error repairing document receipts:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Error repairing receipts: ${error.message}`);
  }
});

/**
 * Get Signed URL for document (1 hour expiry)
 * RBAC: Admin/Manager OR agent with valid receipt
 */
exports.getDocumentSignedUrl = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  await rateLimitOrThrow(`getDocumentSignedUrl:${request.auth.uid}`, 100, 60_000);

  const { documentId } = request.data;
  if (!documentId) {
    throw new HttpsError("invalid-argument", "documentId is required");
  }

  const safeDocumentId = validateDocumentId(documentId);

  try {
    const db = admin.firestore();

    const docSnap = await db.collection("documents").doc(safeDocumentId).get();
    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Document not found");
    }

    const docData = docSnap.data();
    const callerRole = await getCallerRole(request.auth.uid);
    const isAdminOrManager = callerRole === "admin" || callerRole === "manager";

    if (!isAdminOrManager) {
      const receiptId = `${request.auth.uid}_${safeDocumentId}`;
      const receiptSnap = await db.collection("documentReceipts").doc(receiptId).get();

      if (!receiptSnap.exists) {
        throw new HttpsError("permission-denied", "You don't have access to this document");
      }

      await db.collection("documentReceipts").doc(receiptId).update({
        lastViewedAt: FieldValue.serverTimestamp(),
        viewCount: FieldValue.increment(1),
      });
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(docData.storagePath);

    const [exists] = await file.exists();
    if (!exists) {
      console.error(`File not found in Storage: ${docData.storagePath}`);
      throw new HttpsError("not-found", `File not found in Storage: ${docData.fileName}. Please contact admin.`);
    }

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    console.log(`Signed URL generated for document ${safeDocumentId} by ${request.auth.uid}`);

    return { url, fileName: docData.fileName };
  } catch (error) {
    console.error("Error generating signed URL:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Error generating signed URL: ${error.message}`);
  }
});

/**
 * Agent acknowledges document (mark receipt as ACKED)
 * RBAC: Agent (self only)
 */
exports.ackAgentDocument = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  // Rate Limiting
  await rateLimitOrThrow(`ackAgentDocument:${request.auth.uid}`, 50, 60_000);

  const { documentId, receiptId, validationProof } = request.data;

  if (!documentId || !receiptId) {
    throw new HttpsError("invalid-argument", "documentId and receiptId are required");
  }

  const safeDocumentId = validateDocumentId(documentId);

  try {
    const db = admin.firestore();
    const result = await db.runTransaction(async (transaction) => {
      const receiptRef = db.collection("documentReceipts").doc(receiptId);
      const receiptSnap = await transaction.get(receiptRef);

      if (!receiptSnap.exists) {
        throw new HttpsError("not-found", "Receipt not found");
      }

      if (receiptSnap.data().status === "ACKED") {
        return { alreadyAcked: true };
      }

      const updateData = {
        status: "ACKED",
        ackedAt: FieldValue.serverTimestamp(),
      };

      if (validationProof) {
        updateData.validationProof = validationProof;
      }

      transaction.update(receiptRef, updateData);

      const docRef = db.collection("documents").doc(safeDocumentId);
      transaction.update(docRef, {
        ackCount: FieldValue.increment(1),
        pendingCount: FieldValue.increment(-1),
      });

      return { alreadyAcked: false };
    });

    if (result.alreadyAcked) {
      return { message: "Document already acknowledged", alreadyAcked: true };
    }

    await writeAudit({
      action: "ACK_DOCUMENT",
      actorUid: request.auth.uid,
      targetUid: null,
      meta: { documentId: safeDocumentId, receiptId },
    });

    console.log(`Document ${safeDocumentId} acknowledged by agent ${request.auth.uid}`);

    return { message: "Document acknowledged successfully" };

  } catch (error) {
    console.error("Error acknowledging document:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Error acknowledging document: ${error.message}`);
  }
});


/**
 * Admin/Manager forces ACK for an agent (without agent interaction)
 * RBAC: Admin/Manager
 */
exports.forceAckDocumentForAgent = onCall({ region: "europe-west1" }, async (request) => {
  await requireAdminOrManager(request);
  await rateLimitOrThrow(`forceAckDocument:${request.auth.uid}`, 30, 60_000);

  const { documentId, agentId } = request.data;
  if (!documentId || !agentId) {
    throw new HttpsError("invalid-argument", "documentId and agentId are required");
  }

  const safeDocumentId = validateDocumentId(documentId);

  try {
    const db = admin.firestore();
    const receiptId = `${agentId}_${safeDocumentId}`;

    const result = await db.runTransaction(async (transaction) => {
      const receiptRef = db.collection("documentReceipts").doc(receiptId);
      const receiptSnap = await transaction.get(receiptRef);

      if (!receiptSnap.exists) {
        throw new HttpsError("not-found", "Receipt not found for this agent/document combination");
      }

      const receiptData = receiptSnap.data();

      if (receiptData.status === "ACKED" && !receiptData.forcedBy) {
        return { alreadyNaturalAck: true };
      }

      transaction.update(receiptRef, {
        status: "ACKED",
        ackedAt: FieldValue.serverTimestamp(),
        forcedBy: request.auth.uid,
      });

      if (receiptData.status === "PENDING") {
        const docRef = db.collection("documents").doc(safeDocumentId);
        transaction.update(docRef, {
          ackCount: FieldValue.increment(1),
          pendingCount: FieldValue.increment(-1),
        });
      }

      return { alreadyNaturalAck: false };
    });

    if (result.alreadyNaturalAck) {
      return { message: "Document already acknowledged by agent naturally" };
    }

    await writeAudit({
      action: "FORCE_ACK_DOCUMENT",
      actorUid: request.auth.uid,
      targetUid: agentId,
      meta: { documentId: safeDocumentId, receiptId, severity: "HIGH" },
    });

    console.log(`Document ${safeDocumentId} force-acknowledged for agent ${agentId} by ${request.auth.uid}`);

    return { message: "Document force-acknowledged successfully" };
  } catch (error) {
    console.error("Error force-acknowledging document:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Error force-acknowledging document: ${error.message}`);
  }
});

// ====================================================================
// DOCUMENTS V1 - MISSING FUNCTIONS RECOVERY
// ====================================================================

/**
 * Generates a signed URL for a document (Admin/Manager ONLY)
 */
// ====================================================================
// SPRINT 1 : OPTIMISATIONS
// ====================================================================

// ====================================================================
// SHARED HELPERS FOR MAINT / REBUILD
// ====================================================================
function minutesToHours(minutes) {
  return Math.round((minutes / 60) * 100) / 100;
}

function statusMapInternal(planningStatus) {
  const s = (planningStatus || "").toLowerCase();
  if (s === "scheduled") return "planned";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "done" || s === "completed") return "done";
  if (s === "ongoing" || s === "in_progress") return "ongoing";
  return "planned";
}

function makeShiftIdInternal({ planningId, agentId, specialty, dayKey, startHHMM, endHHMM }) {
  const a = agentId || "OPEN";
  const sp = (specialty || "UNK").replace(/[^A-Za-z0-9_-]/g, "");
  return `${planningId}_${a}_${dayKey.replace(/-/g, "")}_${startHHMM}_${endHHMM}_${sp}`;
}

function splitByDayInternal(startDT, endDT) {
  const segs = [];
  let cur = startDT;
  while (!cur.hasSame(endDT, "day")) {
    const nextMidnight = cur.plus({ days: 1 }).startOf("day");
    segs.push({ start: cur, end: nextMidnight });
    cur = nextMidnight;
  }
  segs.push({ start: cur, end: endDT });
  return segs;
}

async function requireAdminOrManagerLocal(request) {
  return await requireAdminOrManager(request);
}

// ====================================================================
// 1) adminInitStatsMeta
// ====================================================================
exports.adminInitStatsMeta = onCall({ region: REGION }, async (request) => {
  await requireAdminOrManagerLocal(request);
  const db = admin.firestore();
  const force = request.data?.force === true;

  const metaRef = db.collection("stats_meta").doc("current");
  const metaSnap = await metaRef.get();
  if (metaSnap.exists && !force) {
    const d = metaSnap.data();
    return {
      already: true,
      latestDayKey: d.latestDayKey,
      latestMonthKey: d.latestMonthKey,
      message: "stats_meta/current already exists.",
    };
  }

  let latestDayKey = null;
  const shiftSnap = await db.collection("shifts").orderBy("dayKey", "desc").limit(1).get();
  if (!shiftSnap.empty) {
    latestDayKey = shiftSnap.docs[0].data().dayKey;
  }

  if (!latestDayKey) {
    const planningSnap = await db.collection("planning").get();
    for (const doc of planningSnap.docs) {
      const assignments = Array.isArray(doc.data().agentAssignments) ? doc.data().agentAssignments : [];
      for (const a of assignments) {
        for (const v of (a.vacations || [])) {
          if (v?.date && (!latestDayKey || v.date > latestDayKey)) {
            latestDayKey = v.date;
          }
        }
      }
    }
  }

  if (!latestDayKey) latestDayKey = DateTime.now().setZone(TZ).toFormat("yyyy-MM-dd");

  const latestMonthKey = latestDayKey.slice(0, 7);
  const payload = {
    latestDayKey,
    latestMonthKey,
    updatedAt: FieldValue.serverTimestamp(),
    source: "callable_init",
  };

  await metaRef.set(payload, { merge: true });
  return { latestDayKey, latestMonthKey, created: true };
});

// ====================================================================
// 2) adminRebuildAllShifts (DEPRECATED IN FAVOR OF UNIT REBUILD)
// ====================================================================
exports.adminRebuildShiftsFromPlanning = onCall({ region: REGION }, async (request) => {
  await requireAdminOrManagerLocal(request);
  const db = admin.firestore();
  console.log("[adminRebuildShiftsFromPlanning] Starting...");

  const planningSnap = await db.collection("planning").get();
  let totalUpserted = 0;
  let latestDayFound = null;

  // Process and Clear shifts in small chunks if needed, 
  // but for a full rebuild we often clear the collection or handle per-doc
  // For safety, we clear then rebuild (Heavy).
  const shiftsSnap = await db.collection("shifts").get();
  let batch = db.batch();
  let count = 0;
  for (const s of shiftsSnap.docs) {
    batch.delete(s.ref);
    count++;
    if (count >= 450) { await batch.commit(); batch = db.batch(); count = 0; }
  }
  await batch.commit();

  batch = db.batch();
  count = 0;

  for (const doc of planningSnap.docs) {
    const p = doc.data();
    const planningId = doc.id;
    const siteId = p.siteId || null;
    const clientId = p.clientId || null;
    const status = statusMapInternal(p.status);
    const assignments = Array.isArray(p.agentAssignments) ? p.agentAssignments : [];

    for (const a of assignments) {
      const agentId = a?.agentId || null;
      const specialty = a?.specialty || "UNK";
      for (const v of (a.vacations || [])) {
        if (!v.date || !v.start || !v.end) continue;
        let startDT = DateTime.fromISO(`${v.date}T${v.start}`, { zone: TZ });
        let endDT = DateTime.fromISO(`${v.date}T${v.end}`, { zone: TZ });
        if (endDT <= startDT) endDT = endDT.plus({ days: 1 });

        const segments = splitByDayInternal(startDT, endDT);
        for (const seg of segments) {
          const duration = Math.round(seg.end.diff(seg.start, "minutes").minutes);
          if (duration <= 0) continue;
          const dk = seg.start.toFormat("yyyy-MM-dd");
          if (!latestDayFound || dk > latestDayFound) latestDayFound = dk;

          const shiftId = makeShiftIdInternal({
            planningId, agentId, specialty, dayKey: dk,
            startHHMM: seg.start.toFormat("HHmm"),
            endHHMM: seg.end.toFormat("HHmm")
          });

          batch.set(db.collection("shifts").doc(shiftId), {
            planningId, siteId, clientId, agentId, specialty, status,
            dayKey: dk,
            startTimestamp: seg.start.toJSDate(),
            endTimestamp: seg.end.toJSDate(),
            durationMinutesPlanned: duration,
            durationHoursPlanned: minutesToHours(duration),
            durationMinutesActual: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
          count++;
          totalUpserted++;
          if (count >= 450) { await batch.commit(); batch = db.batch(); count = 0; }
        }
      }
    }
  }
  await batch.commit();

  // Final step: update stats_meta
  if (latestDayFound) {
    await db.collection("stats_meta").doc("current").set({
      latestDayKey: latestDayFound,
      latestMonthKey: latestDayFound.slice(0, 7),
      updatedAt: FieldValue.serverTimestamp(),
      source: "full_rebuild"
    }, { merge: true });
  }

  return { planningCount: planningSnap.size, shiftsUpserted: totalUpserted, latestDayKey: latestDayFound };
});

// ====================================================================
// 3) rebuildPlanningToShifts (THE KEY ONE)
// ====================================================================
exports.rebuildShiftsForPlanning = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
  const { planningId } = request.data;
  if (!planningId) throw new HttpsError("invalid-argument", "planningId requis.");

  const db = admin.firestore();
  console.log(`[RebuildTargeted] Planning: ${planningId}`);

  try {
    const docSnap = await db.collection("planning").doc(planningId).get();
    if (!docSnap.exists) throw new HttpsError("not-found", "Planning inexistant.");
    const p = docSnap.data();

    const siteId = p.siteId || null;
    let clientId = p.clientId || null;

    const existingShiftsSnap = await db.collection("shifts").where("planningId", "==", planningId).get();
    const batchDelete = db.batch();
    existingShiftsSnap.docs.forEach((snap) => batchDelete.delete(snap.ref));
    if (existingShiftsSnap.size > 0) await batchDelete.commit();

    let newShiftsCreated = 0;
    const batchCreate = db.batch();
    const assignments = Array.isArray(p.agentAssignments) ? p.agentAssignments : [];
    const status = statusMapInternal(p.status);

    for (const a of assignments) {
      const agentId = a?.agentId || null;
      const specialty = a?.specialty || "UNK";
      const vacations = Array.isArray(a?.vacations) ? a.vacations : [];

      for (const v of vacations) {
        const { date, start, end } = v || {};
        if (!date || !start || !end) continue;

        let startDT = DateTime.fromISO(`${date}T${start}`, { zone: TZ });
        let endDT = DateTime.fromISO(`${date}T${end}`, { zone: TZ });
        if (endDT <= startDT) endDT = endDT.plus({ days: 1 });

        const segments = splitByDayInternal(startDT, endDT);
        for (const seg of segments) {
          const durationMinutes = Math.round(seg.end.diff(seg.start, "minutes").minutes);
          if (durationMinutes <= 0) continue;

          const segDayKey = seg.start.toFormat("yyyy-MM-dd");
          const segStartHH = seg.start.toFormat("HHmm");
          const segEndHH = seg.end.toFormat("HHmm");

          const shiftId = makeShiftIdInternal({
            planningId, agentId, specialty, dayKey: segDayKey, startHHMM: segStartHH, endHHMM: segEndHH
          });

          const shiftData = {
            planningId, siteId, clientId, agentId, specialty, status,
            dayKey: segDayKey,
            startTimestamp: seg.start.toJSDate(),
            endTimestamp: seg.end.toJSDate(),
            durationMinutesPlanned: durationMinutes,
            durationHoursPlanned: minutesToHours(durationMinutes),
            durationMinutesActual: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          batchCreate.set(db.collection("shifts").doc(shiftId), shiftData);
          newShiftsCreated++;
        }
      }
    }

    if (newShiftsCreated > 0) await batchCreate.commit();
    return { success: true, count: newShiftsCreated };
  } catch (error) {
    console.error(`[RebuildTargeted] Error ${planningId}:`, error);
    throw new HttpsError("internal", error.message);
  }
});

// ====================================================================
// SPRINT 1 : OPTIMISATIONS (VULNERABLE MODULES WRAPPED)
// ====================================================================
try {
  exports.scheduledFirestoreBackup = require("./src/backup").scheduledFirestoreBackup;
  exports.generateDocumentThumbnail = require("./src/thumbnails").generateDocumentThumbnail;
  const { dailyComplianceAlert, sendReminderEmail } = require("./src/complianceAlerts");
  exports.dailyComplianceAlert = dailyComplianceAlert;
  exports.sendReminderEmail = sendReminderEmail;
} catch (e) {
  console.error("Sprint 1 module loading error (likely missing GCP context/buckets):", e.message);
}

exports.aggregateShiftRollups = require("./shiftsRollup").aggregateShiftRollups;

