// ============================================
// AUDIT - Moteur d'audit de campagne
// ============================================

// Analyser une campagne complète
function analyzeCampaign(campaignData) {
    const issues = [];

    // Vérifier la stratégie d'enchères
    if (campaignData.biddingStrategy === 'Maximiser les conversions' &&
        (!campaignData.conversionHistory || campaignData.conversionHistory < 30)) {
        issues.push(commonIssues.find(i => i.id === 'bidding_strategy'));
    }

    // Vérifier les réseaux
    if (campaignData.networks && campaignData.networks.includes('Display')) {
        issues.push(commonIssues.find(i => i.id === 'network_settings'));
    }

    // Vérifier le ciblage géographique
    if (campaignData.locations && campaignData.locations.length === 1 &&
        campaignData.locations[0].toLowerCase().includes('var')) {
        issues.push(commonIssues.find(i => i.id === 'geo_targeting'));
    }

    // Vérifier les annonces dynamiques
    if (campaignData.dynamicSearchAds === true) {
        issues.push(commonIssues.find(i => i.id === 'dynamic_search_ads'));
    }

    // Vérifier le suivi de conversion
    if (campaignData.objective === 'Leads' && !campaignData.conversionTracking) {
        issues.push(commonIssues.find(i => i.id === 'conversion_tracking'));
    }

    // Vérifier les types de correspondance
    if (campaignData.keywords) {
        const hasOnlyBroadMatch = campaignData.keywords.every(kw =>
            !kw.includes('"') && !kw.includes('[')
        );
        if (hasOnlyBroadMatch && campaignData.keywords.length > 5) {
            issues.push(commonIssues.find(i => i.id === 'keyword_match_types'));
        }
    }

    // Vérifier les mots-clés à faible volume
    if (campaignData.keywords) {
        const lowVolumeKeywords = campaignData.keywords.filter(kw => {
            const cleanKw = kw.replace(/["\[\]]/g, '').toLowerCase();
            return cleanKw.includes('k9') && !cleanKw.includes('var');
        });

        if (lowVolumeKeywords.length > 0) {
            issues.push(commonIssues.find(i => i.id === 'low_volume_keywords'));
        }
    }

    // Vérifier les extensions d'annonces
    if (!campaignData.adExtensions || Object.keys(campaignData.adExtensions).length === 0) {
        issues.push(commonIssues.find(i => i.id === 'ad_extensions'));
    }

    // Filtrer les undefined
    const validIssues = issues.filter(i => i !== undefined);

    // Calculer le score de santé
    const healthScore = calculateHealthScore(validIssues);

    // Générer les recommandations
    const recommendations = generateRecommendations(validIssues, campaignData);

    // Calculer le budget optimal
    const keywords = campaignData.keywords || [];
    const recommendedBudget = calculateOptimalBudget(keywords, 10);

    // Recommander la stratégie d'enchères
    const biddingRec = recommendBiddingStrategy(campaignData.conversionHistory || 0);

    return {
        campaignName: campaignData.campaignName || 'GARDIENNAGE CYNOPHILE CHANTIER',
        healthScore,
        scoreLabel: getScoreLabel(healthScore),
        scoreClass: getScoreClass(healthScore),
        issues: validIssues,
        recommendations,
        recommendedBudget,
        recommendedMaxCPC: 3.50,
        recommendedBiddingStrategy: biddingRec.strategy,
        biddingStrategyReason: biddingRec.reason,
        summary: generateSummary(validIssues, healthScore),
    };
}

// Générer des recommandations actionnables
function generateRecommendations(issues, campaignData) {
    const recommendations = [];

    // Recommandations basées sur les problèmes détectés
    issues.forEach(issue => {
        recommendations.push({
            id: issue.id,
            category: issue.category,
            severity: issue.severity,
            title: issue.title,
            description: issue.description,
            impact: issue.impact,
            solution: issue.solution,
            steps: issue.steps,
            priority: issue.severity === 'critical' ? 1 : issue.severity === 'important' ? 2 : 3,
        });
    });

    // Recommandations supplémentaires générales
    if (!issues.find(i => i.id === 'ad_extensions')) {
        recommendations.push({
            id: 'add_extensions',
            category: 'Annonces',
            severity: 'optional',
            title: 'Ajouter des extensions d\'annonces',
            description: 'Les extensions augmentent la visibilité et le CTR de vos annonces.',
            solution: 'Ajouter liens annexes, accroches et extraits structurés',
            steps: [
                'Ajouter 4 liens annexes minimum',
                'Ajouter 4 accroches minimum',
                'Ajouter des extraits structurés (services, certifications)',
                'Ajouter l\'extension d\'appel avec votre numéro',
            ],
            priority: 3,
        });
    }

    // Recommandation budget si trop faible
    if (campaignData.budget && campaignData.budget < 20) {
        recommendations.push({
            id: 'increase_budget',
            category: 'Budget',
            severity: 'important',
            title: 'Budget quotidien insuffisant',
            description: `Votre budget de ${formatCurrency(campaignData.budget)}/jour est trop faible pour générer des résultats.`,
            solution: `Augmenter à minimum ${formatCurrency(20)}/jour, idéalement ${formatCurrency(30)}/jour`,
            steps: [
                'Aller dans Paramètres de la campagne',
                'Section "Budget"',
                `Définir ${formatCurrency(30)}/jour`,
            ],
            priority: 2,
        });
    }

    // Trier par priorité
    recommendations.sort((a, b) => a.priority - b.priority);

    return recommendations;
}

// Générer un résumé de l'audit
function generateSummary(issues, healthScore) {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const important = issues.filter(i => i.severity === 'important').length;
    const optional = issues.filter(i => i.severity === 'optional').length;

    let summary = '';

    if (healthScore >= 80) {
        summary = `Votre campagne est en bonne santé générale (${healthScore}/100). `;
    } else if (healthScore >= 60) {
        summary = `Votre campagne nécessite quelques optimisations (${healthScore}/100). `;
    } else if (healthScore >= 40) {
        summary = `Votre campagne présente des problèmes importants (${healthScore}/100). `;
    } else {
        summary = `Votre campagne a des problèmes critiques qui l'empêchent de fonctionner (${healthScore}/100). `;
    }

    if (critical > 0) {
        summary += `${critical} problème${critical > 1 ? 's' : ''} critique${critical > 1 ? 's' : ''} détecté${critical > 1 ? 's' : ''} qui empêche${critical === 1 ? '' : 'nt'} la diffusion. `;
    }

    if (important > 0) {
        summary += `${important} problème${important > 1 ? 's' : ''} important${important > 1 ? 's' : ''} à corriger. `;
    }

    if (optional > 0) {
        summary += `${optional} optimisation${optional > 1 ? 's' : ''} recommandée${optional > 1 ? 's' : ''} pour améliorer les performances.`;
    }

    return summary;
}

// Afficher les résultats de l'audit
function displayAuditResults(results) {
    const auditSection = document.getElementById('audit-results');
    if (!auditSection) return;

    auditSection.innerHTML = `
    <div class="card fade-in">
      <div class="card-header">
        <div class="card-icon ${results.scoreClass}">
          📊
        </div>
        <div>
          <h3 class="card-title">Résultats de l'Audit</h3>
          <p style="margin: 0; color: var(--color-gray-600);">${results.campaignName}</p>
        </div>
      </div>
      
      <div class="card-body">
        <!-- Score de santé -->
        <div class="health-score">
          <div class="score-circle">
            <svg width="200" height="200" style="transform: rotate(-90deg);">
              <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-gray-200)" stroke-width="12"/>
              <circle cx="100" cy="100" r="90" fill="none" 
                      stroke="var(--color-${results.scoreClass})" 
                      stroke-width="12" 
                      stroke-dasharray="${2 * Math.PI * 90}" 
                      stroke-dashoffset="${2 * Math.PI * 90 * (1 - results.healthScore / 100)}"
                      stroke-linecap="round"
                      style="transition: stroke-dashoffset 1s ease-out;"/>
            </svg>
            <div class="score-value" style="color: var(--color-${results.scoreClass});">
              ${results.healthScore}
            </div>
          </div>
          <div class="score-label">${results.scoreLabel}</div>
        </div>
        
        <!-- Résumé -->
        <div class="alert alert-${results.scoreClass}">
          <div class="alert-content">
            <div class="alert-title">Résumé de l'audit</div>
            <p style="margin: 0;">${results.summary}</p>
          </div>
        </div>
        
        <!-- Statistiques -->
        <div class="grid grid-3" style="margin-top: var(--spacing-xl);">
          <div class="card" style="text-align: center; background: var(--color-danger-light);">
            <div style="font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-danger);">
              ${results.issues.filter(i => i.severity === 'critical').length}
            </div>
            <div style="color: var(--color-gray-700); font-weight: 600;">Problèmes Critiques</div>
          </div>
          
          <div class="card" style="text-align: center; background: var(--color-warning-light);">
            <div style="font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-warning);">
              ${results.issues.filter(i => i.severity === 'important').length}
            </div>
            <div style="color: var(--color-gray-700); font-weight: 600;">Problèmes Importants</div>
          </div>
          
          <div class="card" style="text-align: center; background: var(--color-info-light);">
            <div style="font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-info);">
              ${results.issues.filter(i => i.severity === 'optional').length}
            </div>
            <div style="color: var(--color-gray-700); font-weight: 600;">Optimisations</div>
          </div>
        </div>
        
        <!-- Recommandations budgétaires -->
        <div class="card" style="margin-top: var(--spacing-xl); background: var(--color-success-light);">
          <h4 style="margin-bottom: var(--spacing-md);">💰 Recommandations Budgétaires</h4>
          <div class="grid grid-2">
            <div>
              <strong>Budget quotidien:</strong><br>
              <span style="font-size: var(--font-size-xl); color: var(--color-success);">
                ${formatCurrency(results.recommendedBudget)}
              </span>
            </div>
            <div>
              <strong>CPC maximum:</strong><br>
              <span style="font-size: var(--font-size-xl); color: var(--color-success);">
                ${formatCurrency(results.recommendedMaxCPC)}
              </span>
            </div>
          </div>
          <div style="margin-top: var(--spacing-md);">
            <strong>Stratégie d'enchères:</strong> ${results.recommendedBiddingStrategy}<br>
            <small style="color: var(--color-gray-700);">${results.biddingStrategyReason}</small>
          </div>
        </div>
        
        <!-- Actions -->
        <div style="margin-top: var(--spacing-xl); display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="scrollToElement('recommendations')">
            📋 Voir les Recommandations
          </button>
          <button class="btn btn-success" onclick="exportAuditReport()">
            📥 Télécharger le Rapport
          </button>
          <button class="btn btn-outline" onclick="exportOptimizedConfig()">
            ⚙️ Exporter la Configuration
          </button>
        </div>
      </div>
    </div>
  `;

    // Afficher les recommandations
    displayRecommendations(results.recommendations);
}

// Afficher les recommandations
function displayRecommendations(recommendations) {
    const recSection = document.getElementById('recommendations-list');
    if (!recSection) return;

    let html = '<ul class="recommendations-list">';

    recommendations.forEach((rec, index) => {
        html += `
      <li class="recommendation-item ${rec.severity} fade-in" style="animation-delay: ${index * 0.1}s;">
        <div class="recommendation-header">
          <div>
            <span class="badge badge-${getSeverityColor(rec.severity)}">
              ${getSeverityIcon(rec.severity)} ${rec.severity.toUpperCase()}
            </span>
            <span class="badge badge-primary">${rec.category}</span>
          </div>
        </div>
        
        <h4 class="recommendation-title">${rec.title}</h4>
        <p class="recommendation-description">${rec.description}</p>
        
        ${rec.impact ? `
          <div style="margin-bottom: var(--spacing-md);">
            <strong>Impact:</strong> ${rec.impact}
          </div>
        ` : ''}
        
        <div style="margin-bottom: var(--spacing-md);">
          <strong>Solution:</strong> ${rec.solution}
        </div>
        
        ${rec.steps && rec.steps.length > 0 ? `
          <details style="margin-top: var(--spacing-md);">
            <summary style="cursor: pointer; font-weight: 600; color: var(--color-primary);">
              📝 Étapes détaillées
            </summary>
            <ol style="margin-top: var(--spacing-sm); padding-left: var(--spacing-xl);">
              ${rec.steps.map(step => `<li style="margin-bottom: var(--spacing-xs);">${step}</li>`).join('')}
            </ol>
          </details>
        ` : ''}
      </li>
    `;
    });

    html += '</ul>';
    recSection.innerHTML = html;
}

// Exporter le rapport d'audit
function exportAuditReport() {
    if (!window.currentAuditResults) {
        showNotification('Aucun audit à exporter', 'warning');
        return;
    }

    const report = generateTextReport(window.currentAuditResults);
    exportToPDF(report, 'audit-google-ads-mocyno.txt');
}

// Exporter la configuration optimisée
function exportOptimizedConfig() {
    const config = {
        ...optimalCampaignConfig,
        generatedAt: new Date().toISOString(),
        recommendations: window.currentAuditResults?.recommendations || [],
    };

    exportToJSON(config, 'campagne-optimisee-mocyno.json');
}

// Lancer l'audit avec les données de la campagne actuelle
function runAudit() {
    // Données de la campagne MO'CYNO (basées sur les informations fournies)
    const campaignData = {
        campaignName: 'GARDIENNAGE CYNOPHILE CHANTIER',
        objective: 'Leads',
        biddingStrategy: 'Maximiser les conversions',
        conversionHistory: 0,
        networks: ['Recherche', 'Display'],
        budget: 55.26,
        locations: ['Var, France'],
        dynamicSearchAds: true,
        conversionTracking: false,
        keywords: [
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
        ],
        adExtensions: {},
    };

    // Analyser la campagne
    const results = analyzeCampaign(campaignData);

    // Stocker les résultats globalement pour l'export
    window.currentAuditResults = results;

    // Afficher les résultats
    displayAuditResults(results);

    // Scroll vers les résultats
    setTimeout(() => scrollToElement('audit-results'), 300);
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeCampaign,
        generateRecommendations,
        generateSummary,
        displayAuditResults,
        displayRecommendations,
        runAudit,
    };
}
