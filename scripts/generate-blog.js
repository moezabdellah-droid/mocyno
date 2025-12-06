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

    // 2. Simulation de l'appel IA (A REMPLACER PAR APPEL REEL)
    // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    // const result = await model.generateContent(`Rédige un article de blog HTML... sur ${topic}`);
    // const content = result.response.text();

    // Contenu Simulée pour le test
    const content = `<!DOCTYPE html>
<html lang="fr">
<head><title>${topic}</title><meta charset="utf-8"></head>
<body>
  <h1>${topic}</h1>
  <p>Article généré automatiquement le ${new Date().toLocaleDateString()}.</p>
  <p>Contenu à venir grâce à l'IA...</p>
</body></html>`;

    // 3. Ecriture du fichier
    fs.writeFileSync(filePath, content);
    console.log(`Article généré : ${slug}`);

    // 4. Mise à jour de l'index
    let indexHtml = fs.readFileSync(INDEX_FILE, 'utf8');

    // Template de la card
    const cardHtml = `
      <!-- Article Auto -->
      <article class="card" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">
        <div style="height:200px; background:#ddd; display:flex; align-items:center; justify-content:center;">
           Automated Image
        </div>
        <div style="padding:24px; flex:1; display:flex; flex-direction:column;">
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
