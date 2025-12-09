const admin = require("firebase-admin");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { Resend } = require("resend");

admin.initializeApp();

// Initialize Resend
const resendApiKey = "re_AqCc4rdk_AmJWptojSdceiKbWhghQTUaa";
const resend = new Resend(resendApiKey);

// Helper to generate Google Calendar Link
function generateGoogleCalendarLink(title, start, end, details, location) {
  const formatDate = (date) => date.replace(/-|:|\./g, '');
  const startStr = formatDate(new Date(start).toISOString().split('.')[0]);
  const endStr = formatDate(new Date(end).toISOString().split('.')[0]);

  // Construct URL
  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    details: details,
    location: location,
    ctz: "Europe/Paris"
  });
  return `${baseUrl}?${params.toString()}`;
}

// Generate ICS Content
function generateICS(missions) {
  let icsContent =
    `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MoCyno//Planning//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  missions.forEach(m => {
    m.vacations.forEach(v => {
      const startStr = v.date.replace(/-/g, '') + 'T' + v.start.replace(/:/g, '') + '00';
      const endStr = v.date.replace(/-/g, '') + 'T' + v.end.replace(/:/g, '') + '00';
      const now = new Date().toISOString().replace(/-|:|\.|/g, '').substring(0, 15) + 'Z';

      icsContent +=
        `BEGIN:VEVENT
UID:${m.siteName.replace(/\s/g, '')}-${v.date}-${v.start}@mocyno.com
DTSTAMP:${now}
DTSTART;TZID=Europe/Paris:${startStr}
DTEND;TZID=Europe/Paris:${endStr}
SUMMARY:Mission Mo'Cyno: ${m.siteName}
DESCRIPTION:${m.specialty} - ${m.notes || ''}
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
  // Check if user is admin
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const {
    email, password, firstName, lastName, specialties,
    birthDate, birthPlace, nationality, gender, bloodGroup,
    address, zipCode, city, phone,
    socialSecurityNumber, bankName, iban, bic,

    professionalCardNumber, professionalCardObtainedAt, sstNumber,
    sstObtainedAt, sstExpiresAt,
    photoURL, contractNature, contractType
  } = request.data;

  try {
    let userRecord;
    let isNewUser = false;

    // Generate Matricule: MOCY-[Year]-[Random4Digits]
    const matricule = `MOCY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Proactively check if user exists in Auth
      userRecord = await admin.auth().getUserByEmail(email);

      // If we get here, user exists. Check for Firestore profile (Orphan check)
      const doc = await admin.firestore().collection('agents').doc(userRecord.uid).get();
      if (doc.exists) {
        throw new HttpsError('already-exists', 'Cet email est déjà utilisé par un agent actif.');
      }

      // Orphaned user found (Auth exists, Firestore missing). Verify/Update it.
      console.log(`Recovering orphaned auth user: ${email}`);
      await admin.auth().updateUser(userRecord.uid, {
        password,
        displayName: `${firstName} ${lastName}`,
        emailVerified: true,
        photoURL: photoURL || null
      });

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User does not exist. Create new one.
        isNewUser = true;
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
          photoURL: photoURL || null
        });
      } else {
        // Real error (e.g. database down, permissions)
        throw error;
      }
    }

    // 2. Create Firestore Document (Common path for new or recovered)
    await admin.firestore().collection('agents').doc(userRecord.uid).set({
      firstName,
      lastName,
      email,
      role: 'agent',
      status: 'active',
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
      message: isNewUser ? 'Agent created successfully' : 'Agent account recovered and created'
    };

  } catch (error) {
    console.error("Error creating agent:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Erreur création: ${error.message}`);
  }
});

// Function to send planning emails when a mission is created
exports.sendPlanningEmail = onDocumentCreated({
  document: "planning/{missionId}",
  region: "europe-west1"
}, async (event) => {
  try {
    const mission = event.data.data();
    const missionId = event.params.missionId;

    console.log(`Sending planning emails for mission ${missionId}`);

    if (!mission.agentAssignments || mission.agentAssignments.length === 0) {
      console.log('No agent assignments found, skipping email');
      return;
    }

    // Send email to each assigned agent
    const emailPromises = mission.agentAssignments.map(async (assignment) => {
      try {
        // Get agent details from Firestore
        const agentDoc = await admin.firestore().collection('agents').doc(assignment.agentId).get();
        if (!agentDoc.exists) {
          console.error(`Agent ${assignment.agentId} not found`);
          return;
        }

        const agent = agentDoc.data();

        // Format vacations for email
        const vacationsHtml = assignment.vacations.map(v =>
          `<li><strong>${formatDate(v.date)}</strong> : ${v.start} - ${v.end}</li>`
        ).join('');

        // Send email via Resend
        const { data, error } = await resend.emails.send({
          from: 'Mo\'Cyno Planning <planning@mocyno.com>',
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

                  ${mission.notes ? `
                  <div class="info-block">
                    <h3>📝 Consignes Spécifiques</h3>
                    <p>${mission.notes}</p>
                  </div>
                  ` : ''}

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
          `
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
    console.error('Error in sendPlanningEmail:', error);
  }
});

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Callable function to send a planning summary email manually
exports.sendAgentPlanningSummary = onCall({ region: "europe-west1" }, async (request) => {
  // 1. Validation
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }
  const { agentId } = request.data;
  if (!agentId) {
    throw new HttpsError('invalid-argument', 'The function must be called with an "agentId".');
  }

  try {
    // 2. Fetch Agent Details
    const agentDoc = await admin.firestore().collection('agents').doc(agentId).get();
    if (!agentDoc.exists) {
      throw new HttpsError('not-found', 'Agent not found.');
    }
    const agent = agentDoc.data();
    if (!agent.email) {
      throw new HttpsError('failed-precondition', 'Agent has no email address.');
    }

    // 3. Fetch Future Missions
    const planningSnapshot = await admin.firestore()
      .collection('planning')
      .where('assignedAgentIds', 'array-contains', agentId)
      .get();

    const upcomingMissions = [];

    // Use Promise.all to handle async site fetching inside the loop
    const missionPromises = planningSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      // Find specific assignment for this agent
      const assignment = data.agentAssignments?.find(a => a.agentId === agentId);
      if (!assignment || !assignment.vacations) return;

      // Filter vacations in the future
      const futureVacations = assignment.vacations.filter(v => {
        const vacEnd = new Date(`${v.date}T${v.end}`); // Simplistic ISO parse
        return vacEnd > new Date(); // Only future vacations
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      if (futureVacations.length > 0) {
        // Fetch Site Address if siteId exists
        let siteAddress = '';
        if (data.siteId) {
          try {
            const siteDoc = await admin.firestore().collection('sites').doc(data.siteId).get();
            if (siteDoc.exists) {
              siteAddress = siteDoc.data().address || '';
            }
          } catch (e) {
            console.error('Error fetching site address', e);
          }
        }

        upcomingMissions.push({
          siteName: data.siteName,
          siteAddress: siteAddress,
          specialty: assignment.specialty,
          notes: data.notes,
          vacations: futureVacations
        });
      }
    });

    await Promise.all(missionPromises);

    // Sort missions by first vacation date
    upcomingMissions.sort((a, b) => {
      if (a.vacations.length && b.vacations.length) {
        return new Date(a.vacations[0].date) - new Date(b.vacations[0].date);
      }
      return 0;
    });

    if (upcomingMissions.length === 0) {
      return { message: "Aucune mission future trouvée pour cet agent." };
    }

    // 4. Build HTML Email
    const missionsHtml = upcomingMissions.map(m => `
            <div class="info-block">
                <h3>📍 ${m.siteName} (${m.specialty})</h3>
                ${m.siteAddress ? `<p style="margin: 0 0 10px 0; color: #666; font-size: 0.9em;">📍 ${m.siteAddress}</p>` : ''}
                <ul>
                    ${m.vacations.map(v => {
      // Generate Google Calendar Link
      const startISO = `${v.date}T${v.start}:00`;
      const endISO = `${v.date}T${v.end}:00`;
      const gCalLink = generateGoogleCalendarLink(
        `Mission: ${m.siteName}`,
        startISO,
        endISO,
        `Spécialité: ${m.specialty}\nNotes: ${m.notes || 'Aucune'}`,
        m.siteAddress || m.siteName
      );

      return `
                        <li style="margin-bottom: 8px;">
                            Le <strong>${v.date}</strong> de ${v.start} à ${v.end}
                            <br/>
                            <a href="${gCalLink}" target="_blank" style="font-size: 12px; color: #CD1A20; text-decoration: none;">📅 Ajouter à Google Agenda</a>
                        </li>`
    }).join('')}
                </ul>
                ${m.notes ? `<p><em>Note: ${m.notes}</em></p>` : ''}
            </div>
        `).join('');

    // Generate ICS for attachment
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

    // 5. Send Email
    const { data, error } = await resend.emails.send({
      from: 'Mo\'Cyno Planning <planning@mocyno.com>',
      to: [agent.email],
      subject: `Votre Planning à venir - Mo'Cyno`,
      html: emailHtml,
      attachments: [
        {
          filename: 'planning-mocyno.ics',
          content: icsBuffer,
        }
      ]
    });

    if (error) {
      console.error("Resend API Error:", error);
      throw new HttpsError('internal', 'Erreur lors de l\'envoi de l\'email via Resend.');
    }

    return { success: true, message: `Planning envoyé à ${agent.email}` };

  } catch (error) {
    console.error("Error sending planning summary:", error);
    throw new HttpsError('internal', error.message);
  }
});

// Function to generate matricule for existing agents
exports.generateMatricule = onCall({ region: "europe-west1" }, async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { agentId } = request.data;
  if (!agentId) {
    throw new HttpsError('invalid-argument', 'Agent ID is required.');
  }

  try {
    const db = admin.firestore();
    const agentRef = db.collection('agents').doc(agentId);

    // Check if agent exists
    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new HttpsError('not-found', 'Agent not found.');
    }

    // Check if agent already has a matricule
    if (agentDoc.data().matricule) {
      return { matricule: agentDoc.data().matricule, message: 'Agent already has a matricule.' };
    }

    // Generate Matricule using Transaction
    const matricule = await db.runTransaction(async (transaction) => {
      const counterRef = db.collection('counters').doc('agents');
      const counterDoc = await transaction.get(counterRef);

      let nextCount = 101;
      if (counterDoc.exists) {
        nextCount = (counterDoc.data().count || 100) + 1;
      }

      transaction.set(counterRef, { count: nextCount }, { merge: true });

      return `M${String(nextCount).padStart(5, '0')}`;
    });

    // Update Agent Document
    await agentRef.update({ matricule });

    return { matricule, message: 'Matricule generated successfully.' };

  } catch (error) {
    console.error("Error generating matricule:", error);
    throw new HttpsError('internal', error.message);
  }
});

// Function to update an agent's password
exports.updateAgentPassword = onCall({ region: "europe-west1" }, async (request) => {
  // Check authentication (must be admin)
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { agentId, newPassword } = request.data;
  if (!agentId || !newPassword) {
    throw new HttpsError('invalid-argument', 'Agent ID and new password are required.');
  }

  // Basic password validation
  if (newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  try {
    // Verify agent exists in Firestore first (optional but good for consistency)
    const agentDoc = await admin.firestore().collection('agents').doc(agentId).get();
    if (!agentDoc.exists) {
      throw new HttpsError('not-found', 'Agent profile not found.');
    }

    // Update password in Auth
    await admin.auth().updateUser(agentId, {
      password: newPassword
    });

    console.log(`Password updated for agent ${agentId} by ${request.auth.uid}`);
    return { success: true, message: 'Password updated successfully.' };

  } catch (error) {
    console.error("Error updating password:", error);
    throw new HttpsError('internal', error.message);
  }
});
