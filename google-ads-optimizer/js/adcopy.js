// ============================================
// ADCOPY - Générateur d'annonces optimisées
// ============================================

// Générer des annonces complètes
function generateAds() {
    return {
        headlines: adTemplates.headlines,
        descriptions: adTemplates.descriptions,
        sitelinks: adTemplates.sitelinks,
        callouts: adTemplates.callouts,
        snippets: adTemplates.snippets,
    };
}

// Afficher les annonces générées
function displayGeneratedAds() {
    const container = document.getElementById('ad-generator');

    if (!container) return;

    const ads = generateAds();

    let html = `
    <div class="card fade-in">
      <div class="card-header">
        <div class="card-icon primary">
          📝
        </div>
        <div>
          <h3 class="card-title">Annonces Optimisées Générées</h3>
          <p style="margin: 0; color: var(--color-gray-600);">Prêtes à copier dans Google Ads</p>
        </div>
      </div>
      
      <div class="card-body">
        <!-- Titres -->
        <div style="margin-bottom: var(--spacing-2xl);">
          <h4>📌 Titres (${ads.headlines.length})</h4>
          <div class="alert alert-info">
            <div class="alert-content">
              <p style="margin: 0;"><strong>Conseil:</strong> Google Ads affiche jusqu'à 3 titres. Fournissez-en au moins 10 pour que l'IA puisse tester différentes combinaisons.</p>
            </div>
          </div>
          <div style="display: grid; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
            ${ads.headlines.map((headline, i) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md); background: var(--color-gray-50); border-radius: var(--radius-md); border-left: 3px solid var(--color-primary);">
                <div>
                  <span style="color: var(--color-gray-500); font-size: var(--font-size-sm); margin-right: var(--spacing-sm);">${i + 1}.</span>
                  <strong>${headline}</strong>
                  <span style="margin-left: var(--spacing-sm); color: var(--color-gray-500); font-size: var(--font-size-sm);">(${headline.length} car.)</span>
                </div>
                <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${headline.replace(/'/g, "\\'")}')">📋</button>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-success mt-md" onclick="copyAllHeadlines()">
            📋 Copier Tous les Titres
          </button>
        </div>
        
        <!-- Descriptions -->
        <div style="margin-bottom: var(--spacing-2xl);">
          <h4>📄 Descriptions (${ads.descriptions.length})</h4>
          <div class="alert alert-info">
            <div class="alert-content">
              <p style="margin: 0;"><strong>Conseil:</strong> Google Ads affiche jusqu'à 2 descriptions. Fournissez-en au moins 4 pour maximiser les tests.</p>
            </div>
          </div>
          <div style="display: grid; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
            ${ads.descriptions.map((desc, i) => `
              <div style="padding: var(--spacing-md); background: var(--color-gray-50); border-radius: var(--radius-md); border-left: 3px solid var(--color-success);">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--spacing-xs);">
                  <span style="color: var(--color-gray-500); font-size: var(--font-size-sm);">${i + 1}. (${desc.length} car.)</span>
                  <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${desc.replace(/'/g, "\\'")}')">📋</button>
                </div>
                <p style="margin: 0;">${desc}</p>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-success mt-md" onclick="copyAllDescriptions()">
            📋 Copier Toutes les Descriptions
          </button>
        </div>
        
        <!-- Liens annexes -->
        <div style="margin-bottom: var(--spacing-2xl);">
          <h4>🔗 Liens Annexes (${ads.sitelinks.length})</h4>
          <div class="alert alert-info">
            <div class="alert-content">
              <p style="margin: 0;"><strong>Conseil:</strong> Les liens annexes augmentent la visibilité de votre annonce. Ajoutez-en au moins 4.</p>
            </div>
          </div>
          <div class="grid grid-2" style="margin-top: var(--spacing-md);">
            ${ads.sitelinks.map(link => `
              <div class="card">
                <h5 style="margin-bottom: var(--spacing-xs); color: var(--color-primary);">${link.title}</h5>
                <p style="margin: 0; font-size: var(--font-size-sm); color: var(--color-gray-600);">${link.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Accroches -->
        <div style="margin-bottom: var(--spacing-2xl);">
          <h4>💬 Accroches (${ads.callouts.length})</h4>
          <div class="alert alert-info">
            <div class="alert-content">
              <p style="margin: 0;"><strong>Conseil:</strong> Les accroches mettent en avant vos avantages clés. Maximum 25 caractères chacune.</p>
            </div>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
            ${ads.callouts.map(callout => `
              <span class="badge badge-primary" style="font-size: var(--font-size-base); padding: var(--spacing-sm) var(--spacing-md); cursor: pointer;" onclick="copyToClipboard('${callout}')">
                ${callout}
              </span>
            `).join('')}
          </div>
          <button class="btn btn-success mt-md" onclick="copyAllCallouts()">
            📋 Copier Toutes les Accroches
          </button>
        </div>
        
        <!-- Extraits structurés -->
        <div>
          <h4>📋 Extraits Structurés (${ads.snippets.length})</h4>
          <div class="alert alert-info">
            <div class="alert-content">
              <p style="margin: 0;"><strong>Conseil:</strong> Les extraits structurés décrivent vos services ou caractéristiques.</p>
            </div>
          </div>
          <div style="display: grid; gap: var(--spacing-sm); margin-top: var(--spacing-md);">
            ${ads.snippets.map((snippet, i) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md); background: var(--color-gray-50); border-radius: var(--radius-md);">
                <div>
                  <span style="color: var(--color-gray-500); font-size: var(--font-size-sm); margin-right: var(--spacing-sm);">${i + 1}.</span>
                  ${snippet}
                </div>
                <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${snippet.replace(/'/g, "\\'")}')">📋</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

    container.innerHTML = html;
}

// Copier tous les titres
function copyAllHeadlines() {
    const headlines = adTemplates.headlines.join('\n');
    copyToClipboard(headlines);
}

// Copier toutes les descriptions
function copyAllDescriptions() {
    const descriptions = adTemplates.descriptions.join('\n');
    copyToClipboard(descriptions);
}

// Copier toutes les accroches
function copyAllCallouts() {
    const callouts = adTemplates.callouts.join('\n');
    copyToClipboard(callouts);
}

// Lancer le générateur d'annonces
function runAdGenerator() {
    displayGeneratedAds();
    setTimeout(() => scrollToElement('ad-generator'), 300);
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateAds,
        displayGeneratedAds,
        runAdGenerator,
    };
}
