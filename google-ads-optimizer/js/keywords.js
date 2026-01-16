// ============================================
// KEYWORDS - Optimiseur de mots-clés
// ============================================

// Analyser les mots-clés actuels
function analyzeCurrentKeywords(keywords) {
    const analysis = [];

    keywords.forEach(keyword => {
        const cleanKeyword = keyword.replace(/["\[\]]/g, '').toLowerCase();
        const matchType = getMatchType(keyword);

        // Trouver les données du mot-clé
        let keywordData = findKeywordData(cleanKeyword);

        if (!keywordData) {
            // Estimation par défaut si non trouvé
            keywordData = {
                keyword: cleanKeyword,
                volume: 50,
                cpc: 2.50,
                competition: 'Moyenne',
                intent: 'Commercial',
            };
        }

        analysis.push({
            original: keyword,
            keyword: cleanKeyword,
            matchType,
            volume: keywordData.volume,
            cpc: keywordData.cpc,
            competition: keywordData.competition,
            intent: keywordData.intent,
            score: calculateKeywordScore(keywordData),
            recommendation: getKeywordRecommendation(keywordData, matchType),
        });
    });

    return analysis;
}

// Trouver les données d'un mot-clé dans la base
function findKeywordData(keyword) {
    const allKeywords = [
        ...keywordsDatabase.primary,
        ...keywordsDatabase.services,
        ...keywordsDatabase.geo,
        ...keywordsDatabase.longTail,
    ];

    return allKeywords.find(kw => kw.keyword.toLowerCase() === keyword.toLowerCase());
}

// Déterminer le type de correspondance
function getMatchType(keyword) {
    if (keyword.startsWith('[') && keyword.endsWith(']')) return 'Exacte';
    if (keyword.startsWith('"') && keyword.endsWith('"')) return 'Expression';
    return 'Large';
}

// Calculer un score de qualité pour un mot-clé (0-100)
function calculateKeywordScore(keywordData) {
    let score = 50; // Base

    // Volume de recherche
    if (keywordData.volume > 500) score += 20;
    else if (keywordData.volume > 200) score += 15;
    else if (keywordData.volume > 100) score += 10;
    else if (keywordData.volume > 50) score += 5;
    else score -= 10;

    // Intention
    if (keywordData.intent === 'Transactionnel') score += 20;
    else if (keywordData.intent === 'Commercial') score += 15;
    else if (keywordData.intent === 'Informationnel') score += 5;

    // Concurrence
    if (keywordData.competition === 'Faible') score += 15;
    else if (keywordData.competition === 'Moyenne') score += 10;
    else score += 5;

    // CPC (inversement proportionnel)
    if (keywordData.cpc < 2) score += 10;
    else if (keywordData.cpc < 3) score += 5;
    else if (keywordData.cpc > 5) score -= 5;

    return Math.min(100, Math.max(0, score));
}

// Obtenir une recommandation pour un mot-clé
function getKeywordRecommendation(keywordData, matchType) {
    if (keywordData.volume < 20) {
        return 'Supprimer - Volume trop faible';
    }

    if (keywordData.intent === 'Transactionnel' && matchType !== 'Exacte') {
        return 'Passer en correspondance exacte';
    }

    if (keywordData.intent === 'Commercial' && matchType === 'Large') {
        return 'Passer en expression exacte';
    }

    if (keywordData.volume > 500 && matchType === 'Exacte') {
        return 'Tester aussi en expression exacte';
    }

    return 'OK - Conserver';
}

// Générer des suggestions de mots-clés
function generateKeywordSuggestions(currentKeywords = []) {
    const suggestions = [];
    const currentClean = currentKeywords.map(kw => kw.replace(/["\[\]]/g, '').toLowerCase());

    // Ajouter tous les mots-clés de la base qui ne sont pas déjà présents
    const allKeywords = [
        ...keywordsDatabase.primary,
        ...keywordsDatabase.services,
        ...keywordsDatabase.geo,
        ...keywordsDatabase.longTail,
    ];

    allKeywords.forEach(kw => {
        if (!currentClean.includes(kw.keyword.toLowerCase())) {
            const score = calculateKeywordScore(kw);
            const suggestedMatchType = getSuggestedMatchType(kw);

            suggestions.push({
                keyword: kw.keyword,
                formatted: formatKeyword(kw.keyword, suggestedMatchType),
                volume: kw.volume,
                cpc: kw.cpc,
                competition: kw.competition,
                intent: kw.intent,
                score,
                matchType: suggestedMatchType,
                reason: getAdditionReason(kw),
            });
        }
    });

    // Trier par score décroissant
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, 30); // Top 30 suggestions
}

// Obtenir le type de correspondance suggéré
function getSuggestedMatchType(keywordData) {
    if (keywordData.intent === 'Transactionnel') return 'Exacte';
    if (keywordData.intent === 'Commercial' && keywordData.volume < 200) return 'Expression';
    if (keywordData.volume > 500) return 'Expression';
    return 'Expression';
}

// Formater un mot-clé selon son type de correspondance
function formatKeyword(keyword, matchType) {
    if (matchType === 'Exacte') return `[${keyword}]`;
    if (matchType === 'Expression') return `"${keyword}"`;
    return keyword;
}

// Obtenir la raison d'ajout d'un mot-clé
function getAdditionReason(keywordData) {
    if (keywordData.intent === 'Transactionnel') {
        return 'Haute intention d\'achat';
    }
    if (keywordData.volume > 500) {
        return 'Volume de recherche élevé';
    }
    if (keywordData.competition === 'Faible') {
        return 'Faible concurrence';
    }
    if (keywordData.cpc < 2.5) {
        return 'CPC avantageux';
    }
    return 'Pertinent pour votre activité';
}

// Afficher l'analyse des mots-clés
function displayKeywordAnalysis(keywords) {
    const analysis = analyzeCurrentKeywords(keywords);
    const container = document.getElementById('keyword-analysis');

    if (!container) return;

    let html = `
    <div class="card fade-in">
      <div class="card-header">
        <div class="card-icon primary">
          🔑
        </div>
        <div>
          <h3 class="card-title">Analyse de vos Mots-Clés</h3>
          <p style="margin: 0; color: var(--color-gray-600);">${keywords.length} mots-clés analysés</p>
        </div>
      </div>
      
      <div class="card-body">
        <div style="overflow-x: auto;">
          <table class="keyword-table">
            <thead>
              <tr>
                <th>Mot-clé</th>
                <th>Type</th>
                <th>Volume</th>
                <th>CPC</th>
                <th>Concurrence</th>
                <th>Score</th>
                <th>Recommandation</th>
              </tr>
            </thead>
            <tbody>
  `;

    analysis.forEach(kw => {
        const scoreClass = kw.score >= 70 ? 'success' : kw.score >= 50 ? 'warning' : 'danger';

        html += `
      <tr>
        <td><strong>${kw.original}</strong></td>
        <td><span class="badge badge-primary">${kw.matchType}</span></td>
        <td>${formatNumber(kw.volume)}</td>
        <td>${formatCurrency(kw.cpc)}</td>
        <td><span class="badge badge-${kw.competition === 'Faible' ? 'success' : kw.competition === 'Moyenne' ? 'warning' : 'danger'}">${kw.competition}</span></td>
        <td><span class="badge badge-${scoreClass}">${kw.score}/100</span></td>
        <td>${kw.recommendation}</td>
      </tr>
    `;
    });

    html += `
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: var(--spacing-xl);">
          <h4>📊 Statistiques</h4>
          <div class="grid grid-3">
            <div class="card" style="text-align: center;">
              <div style="font-size: var(--font-size-2xl); font-weight: 800; color: var(--color-primary);">
                ${formatNumber(analysis.reduce((sum, kw) => sum + kw.volume, 0))}
              </div>
              <div style="color: var(--color-gray-700);">Volume Total</div>
            </div>
            
            <div class="card" style="text-align: center;">
              <div style="font-size: var(--font-size-2xl); font-weight: 800; color: var(--color-success);">
                ${formatCurrency(analysis.reduce((sum, kw) => sum + kw.cpc, 0) / analysis.length)}
              </div>
              <div style="color: var(--color-gray-700);">CPC Moyen</div>
            </div>
            
            <div class="card" style="text-align: center;">
              <div style="font-size: var(--font-size-2xl); font-weight: 800; color: var(--color-warning);">
                ${Math.round(analysis.reduce((sum, kw) => sum + kw.score, 0) / analysis.length)}
              </div>
              <div style="color: var(--color-gray-700);">Score Moyen</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

    container.innerHTML = html;
}

// Afficher les suggestions de mots-clés
function displayKeywordSuggestions(currentKeywords) {
    const suggestions = generateKeywordSuggestions(currentKeywords);
    const container = document.getElementById('keyword-suggestions');

    if (!container) return;

    let html = `
    <div class="card fade-in">
      <div class="card-header">
        <div class="card-icon success">
          ✨
        </div>
        <div>
          <h3 class="card-title">Suggestions de Mots-Clés</h3>
          <p style="margin: 0; color: var(--color-gray-600);">Top ${suggestions.length} mots-clés recommandés</p>
        </div>
      </div>
      
      <div class="card-body">
        <div style="overflow-x: auto;">
          <table class="keyword-table">
            <thead>
              <tr>
                <th>Mot-clé Formaté</th>
                <th>Volume</th>
                <th>CPC</th>
                <th>Concurrence</th>
                <th>Score</th>
                <th>Raison</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
  `;

    suggestions.forEach(kw => {
        const scoreClass = kw.score >= 70 ? 'success' : kw.score >= 50 ? 'warning' : 'danger';

        html += `
      <tr>
        <td><strong>${kw.formatted}</strong></td>
        <td>${formatNumber(kw.volume)}</td>
        <td>${formatCurrency(kw.cpc)}</td>
        <td><span class="badge badge-${kw.competition === 'Faible' ? 'success' : kw.competition === 'Moyenne' ? 'warning' : 'danger'}">${kw.competition}</span></td>
        <td><span class="badge badge-${scoreClass}">${kw.score}/100</span></td>
        <td>${kw.reason}</td>
        <td><button class="btn btn-sm btn-primary" onclick="copyToClipboard('${kw.formatted}')">📋 Copier</button></td>
      </tr>
    `;
    });

    html += `
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: var(--spacing-xl);">
          <button class="btn btn-success" onclick="copyAllKeywords()">
            📋 Copier Tous les Mots-Clés Suggérés
          </button>
          <button class="btn btn-outline" onclick="exportKeywords()">
            📥 Exporter en CSV
          </button>
        </div>
      </div>
    </div>
  `;

    container.innerHTML = html;
}

// Afficher les mots-clés négatifs
function displayNegativeKeywords() {
    const container = document.getElementById('negative-keywords');

    if (!container) return;

    let html = `
    <div class="card fade-in">
      <div class="card-header">
        <div class="card-icon danger">
          🚫
        </div>
        <div>
          <h3 class="card-title">Mots-Clés Négatifs Recommandés</h3>
          <p style="margin: 0; color: var(--color-gray-600);">${negativeKeywords.length} exclusions suggérées</p>
        </div>
      </div>
      
      <div class="card-body">
        <div class="alert alert-info">
          <div class="alert-content">
            <div class="alert-title">Pourquoi des mots-clés négatifs ?</div>
            <p style="margin: 0;">Les mots-clés négatifs empêchent vos annonces de s'afficher pour des recherches non pertinentes, économisant ainsi votre budget et améliorant votre taux de conversion.</p>
          </div>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-sm); margin-top: var(--spacing-lg);">
          ${negativeKeywords.map(kw => `
            <span class="badge badge-danger" style="font-size: var(--font-size-base); padding: var(--spacing-sm) var(--spacing-md);">
              ${kw}
            </span>
          `).join('')}
        </div>
        
        <div style="margin-top: var(--spacing-xl);">
          <button class="btn btn-danger" onclick="copyNegativeKeywords()">
            📋 Copier Tous les Mots-Clés Négatifs
          </button>
        </div>
      </div>
    </div>
  `;

    container.innerHTML = html;
}

// Copier tous les mots-clés suggérés
function copyAllKeywords() {
    const suggestions = generateKeywordSuggestions(window.currentCampaignKeywords || []);
    const keywordsList = suggestions.map(kw => kw.formatted).join('\n');
    copyToClipboard(keywordsList);
}

// Copier tous les mots-clés négatifs
function copyNegativeKeywords() {
    const keywordsList = negativeKeywords.join('\n');
    copyToClipboard(keywordsList);
}

// Exporter les mots-clés en CSV
function exportKeywords() {
    const suggestions = generateKeywordSuggestions(window.currentCampaignKeywords || []);

    let csv = 'Mot-clé,Type de correspondance,Volume,CPC,Concurrence,Score,Raison\n';

    suggestions.forEach(kw => {
        csv += `"${kw.keyword}","${kw.matchType}",${kw.volume},${kw.cpc},"${kw.competition}",${kw.score},"${kw.reason}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mots-cles-suggeres-mocyno.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Mots-clés exportés en CSV !', 'success');
}

// Lancer l'analyse des mots-clés
function runKeywordAnalysis() {
    const keywords = [
        'agent cynophile',
        'agent de sécurité cynophile',
        'agence de sécurité cynophile',
        'protection chantier',
        'devis gardiennage',
        'gardiennage chantier',
        'maitre chien gardiennage',
        '"agent de sécurité cynophile"',
        'service de gardiennage',
        'sécurité entrepôt',
        'gardiennage professionnel',
        'gardiennage entrepôt',
        'surveillance entrepôt',
        '"gardiennage entrepôt"',
        'gardiennage cynophile',
        'société sécurité cynophile',
        '[k9 gardiennage]',
        'agent cynophile k9',
        'gardiennage chantier cynophile',
        'societe gardiennage cynophile',
        'entreprise sécurité cynophile',
    ];

    // Stocker globalement pour les exports
    window.currentCampaignKeywords = keywords;

    // Afficher les analyses
    displayKeywordAnalysis(keywords);
    displayKeywordSuggestions(keywords);
    displayNegativeKeywords();

    // Scroll vers les résultats
    setTimeout(() => scrollToElement('keyword-analysis'), 300);
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeCurrentKeywords,
        generateKeywordSuggestions,
        displayKeywordAnalysis,
        displayKeywordSuggestions,
        displayNegativeKeywords,
        runKeywordAnalysis,
    };
}
