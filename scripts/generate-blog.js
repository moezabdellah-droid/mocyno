const fs = require('fs');
const path = require('path');
// const { GoogleGenerativeAI } = require("@google/generative-ai"); // Décommenter après install

// Configuration
const BLOG_DIR = path.join(__dirname, '../public/blog');
const INDEX_FILE = path.join(BLOG_DIR, 'index.html');
const TOPICS = [
  "Sécurité des ports de plaisance en hiver",
  "La protection des vignobles contre le vol",
  "Sécurité événementielle : Gérer une foule en délire",
  "Technologie et rondes : L'apport des drones",
  "SSIAP : Les gestes qui sauvent en entreprise"
];

async function generateArticle() {
  console.log("Démarrage de la génération mensuelle...");

  // 1. Choisir un sujet (Aléatoire ou le prochain)
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html';
  const filePath = path.join(BLOG_DIR, slug);

  if (fs.existsSync(filePath)) {
    console.log("Article déjà existant, on passe.");
    return;
  }

  // 2. Génération du contenu via Google Gemini
  let content = "";
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    console.log("Clé API détectée, génération via Gemini...");
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        Tu es un expert en sécurité privée et rédaction web SEO.
        Rédige un article de blog complet en format HTML (sans balises <html> autour, juste le contenu du <body>) sur le sujet : "${topic}".
        Cible : propriétaires de villas, entreprises et organisateurs d'événements dans le Var (83).
        Structure :
        - Un titre H1 accrocheur
        - Une intro engageante
        - 3 sous-parties avec H2
        - Une conclusion avec appel à l'action pour MO'CYNO.
        - Utilise des mots clés locaux (Saint-Tropez, Toulon, Hyères).
        - Ton : Professionnel, rassurant, expert.
      `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Nettoyage basique si l'IA renvoie du markdown ```html
      const cleanText = text.replace(/```html/g, '').replace(/```/g, '');

      content = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${topic} - Blog MO'CYNO Var</title>
  <meta name="description" content="Article expert MO'CYNO sur ${topic}. Sécurité privée dans le Var et PACA.">
  <link rel="canonical" href="https://mocyno.com/blog/${slug}">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
${cleanText}
</body>
</html>`;
    } catch (error) {
      console.error("Erreur Gemini:", error);
      return;
    }
  } else {
    console.log("Pas de clé API (GEMINI_API_KEY), mode simulation.");
    content = `<!DOCTYPE html>
<html lang="fr">
<head><title>${topic}</title><meta charset="utf-8"></head>
<body>
  <h1>${topic}</h1>
  <p>Article généré automatiquement (Simulation sans clé API) le ${new Date().toLocaleDateString()}.</p>
  <p>Configurez GEMINI_API_KEY pour activer l'IA réelle.</p>
</body></html>`;
  }

  // 3. Ecriture du fichier
  fs.writeFileSync(filePath, content);
  console.log(`Article généré : ${slug}`);

  // 4. Mise à jour de l'index
  let indexHtml = fs.readFileSync(INDEX_FILE, 'utf8');

  // Template de la card
  const cardHtml = `
      <!-- Article Auto -->
      <article class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">
        <div style="height:200px; background:linear-gradient(135deg, #022C51 0%, #0f3552 100%); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.1);">
           <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
        </div>
        <div style="padding:24px; flex:1; display:flex; flex-direction:column;">
          <div style="margin-bottom:12px;">
            <span class="badge">Actualité</span>
          </div>
          <h2 style="font-size:20px; line-height:1.4; margin-bottom:12px;">
            <a href="/blog/${slug}" style="color:var(--navy); text-decoration:none;">${topic}</a>
          </h2>
          <p class="small" style="margin-bottom:20px; flex:1;">Nouvel article expert MO'CYNO.</p>
          <a href="/blog/${slug}" style="font-weight:600; color:var(--red);">Lire l'article →</a>
        </div>
      </article>
    `;

  // Injection avant le placeholder (il faut ajouter <!-- Placeholder --> dans index.html si absent, ou utilser regex)
  // Ici on injecte simplement au début de la grid si on trouve la classe grid
  if (indexHtml.includes('<div class="grid"')) {
    // Insertion juste après l'ouverture de la grid pour que le plus récent soit en premier ? 
    // Ou à la fin. Faisons simple : replace first occurrence of grid content start
    indexHtml = indexHtml.replace(
      '<div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:32px;">',
      '<div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:32px;">' + cardHtml
    );
    fs.writeFileSync(INDEX_FILE, indexHtml);
    console.log("Index mis à jour.");
  }
}

generateArticle();
