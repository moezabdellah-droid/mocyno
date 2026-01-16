// ============================================
// UTILS - Fonctions utilitaires
// ============================================

// Formatage de devises
function formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

// Formatage de nombres
function formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(number);
}

// Formatage de pourcentages
function formatPercent(value, decimals = 1) {
    return `${formatNumber(value, decimals)} %`;
}

// Calcul du score de santé (0-100)
function calculateHealthScore(issues) {
    const weights = {
        critical: 30,
        important: 15,
        optional: 5,
    };

    let totalDeductions = 0;
    issues.forEach(issue => {
        totalDeductions += weights[issue.severity] || 0;
    });

    const score = Math.max(0, 100 - totalDeductions);
    return Math.round(score);
}

// Obtenir la classe CSS selon le score
function getScoreClass(score) {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
}

// Obtenir le label selon le score
function getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Bon';
    if (score >= 60) return 'Moyen';
    if (score >= 40) return 'Faible';
    return 'Critique';
}

// Calcul du CPC estimé selon plusieurs facteurs
function estimateCPC(keyword, location = 'var', competition = 'moyenne') {
    const baseKeyword = keywordsDatabase.primary.find(k => k.keyword === keyword) ||
        keywordsDatabase.services.find(k => k.keyword === keyword) ||
        keywordsDatabase.geo.find(k => k.keyword === keyword) ||
        keywordsDatabase.longTail.find(k => k.keyword === keyword);

    if (!baseKeyword) return 2.50; // CPC par défaut

    let cpc = baseKeyword.cpc;

    // Ajustement selon la localisation
    if (location.toLowerCase().includes('var') || location.toLowerCase().includes('saint-tropez')) {
        cpc *= 1.15; // +15% pour zones premium
    }

    // Ajustement selon la concurrence
    const competitionMultipliers = {
        'faible': 0.85,
        'moyenne': 1.0,
        'élevée': 1.25,
    };
    cpc *= competitionMultipliers[competition.toLowerCase()] || 1.0;

    return parseFloat(cpc.toFixed(2));
}

// Calcul du budget optimal
function calculateOptimalBudget(keywords, targetClicks = 10) {
    const avgCPC = keywords.reduce((sum, kw) => {
        const keyword = typeof kw === 'string' ? kw : kw.keyword;
        return sum + estimateCPC(keyword);
    }, 0) / keywords.length;

    const dailyBudget = avgCPC * targetClicks * 1.2; // +20% marge
    return Math.round(dailyBudget);
}

// Simulation de performance
function simulatePerformance(budget, avgCPC, estimatedCTR = 3.5) {
    const maxClicks = Math.floor(budget / avgCPC);
    const impressions = Math.round(maxClicks / (estimatedCTR / 100));
    const clicks = Math.round(impressions * (estimatedCTR / 100));
    const leads = Math.round(clicks * 0.085); // 8.5% taux de conversion moyen
    const costPerLead = leads > 0 ? budget / leads : 0;

    return {
        impressions,
        clicks,
        ctr: estimatedCTR,
        leads,
        costPerLead: parseFloat(costPerLead.toFixed(2)),
        spent: clicks * avgCPC,
    };
}

// Recommandation de stratégie d'enchères
function recommendBiddingStrategy(conversionHistory = 0) {
    if (conversionHistory === 0) {
        return {
            strategy: 'CPC manuel',
            reason: 'Aucun historique de conversion. Commencez par le CPC manuel pour collecter des données.',
            maxCPC: 3.50,
        };
    } else if (conversionHistory < 30) {
        return {
            strategy: 'Maximiser les clics',
            reason: 'Historique insuffisant. Maximisez les clics pour accélérer l\'apprentissage.',
            targetBudget: 30,
        };
    } else {
        return {
            strategy: 'Maximiser les conversions',
            reason: 'Historique suffisant. Google peut optimiser pour les conversions.',
            targetCPA: 45,
        };
    }
}

// Copier dans le presse-papiers
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Copié dans le presse-papiers !', 'success');
        return true;
    } catch (err) {
        console.error('Erreur de copie:', err);
        showNotification('Erreur lors de la copie', 'danger');
        return false;
    }
}

// Afficher une notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
    notification.innerHTML = `
    <div class="alert-content">
      <div class="alert-title">${message}</div>
    </div>
  `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Ajouter les animations pour les notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Export PDF (simple version - génère un rapport texte)
function exportToPDF(content, filename = 'rapport-google-ads.txt') {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Rapport téléchargé !', 'success');
}

// Export JSON
function exportToJSON(data, filename = 'campagne-optimisee.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Configuration exportée !', 'success');
}

// Générer un rapport texte complet
function generateTextReport(auditResults) {
    let report = '='.repeat(60) + '\n';
    report += 'RAPPORT D\'AUDIT GOOGLE ADS - MO\'CYNO\n';
    report += '='.repeat(60) + '\n\n';

    report += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`;
    report += `Campagne: ${auditResults.campaignName || 'GARDIENNAGE CYNOPHILE CHANTIER'}\n\n`;

    report += '-'.repeat(60) + '\n';
    report += 'SCORE DE SANTÉ\n';
    report += '-'.repeat(60) + '\n';
    report += `Score: ${auditResults.healthScore}/100 - ${getScoreLabel(auditResults.healthScore)}\n\n`;

    report += '-'.repeat(60) + '\n';
    report += 'PROBLÈMES DÉTECTÉS\n';
    report += '-'.repeat(60) + '\n\n';

    const criticalIssues = auditResults.issues.filter(i => i.severity === 'critical');
    const importantIssues = auditResults.issues.filter(i => i.severity === 'important');
    const optionalIssues = auditResults.issues.filter(i => i.severity === 'optional');

    if (criticalIssues.length > 0) {
        report += '🔴 CRITIQUE (' + criticalIssues.length + ')\n\n';
        criticalIssues.forEach((issue, i) => {
            report += `${i + 1}. ${issue.title}\n`;
            report += `   ${issue.description}\n`;
            report += `   Impact: ${issue.impact}\n`;
            report += `   Solution: ${issue.solution}\n\n`;
        });
    }

    if (importantIssues.length > 0) {
        report += '🟠 IMPORTANT (' + importantIssues.length + ')\n\n';
        importantIssues.forEach((issue, i) => {
            report += `${i + 1}. ${issue.title}\n`;
            report += `   ${issue.description}\n`;
            report += `   Solution: ${issue.solution}\n\n`;
        });
    }

    if (optionalIssues.length > 0) {
        report += '🔵 OPTIONNEL (' + optionalIssues.length + ')\n\n';
        optionalIssues.forEach((issue, i) => {
            report += `${i + 1}. ${issue.title}\n`;
            report += `   Solution: ${issue.solution}\n\n`;
        });
    }

    report += '-'.repeat(60) + '\n';
    report += 'RECOMMANDATIONS BUDGÉTAIRES\n';
    report += '-'.repeat(60) + '\n';
    report += `Budget quotidien recommandé: ${formatCurrency(auditResults.recommendedBudget || 30)}\n`;
    report += `CPC maximum suggéré: ${formatCurrency(auditResults.recommendedMaxCPC || 3.50)}\n`;
    report += `Stratégie d'enchères: ${auditResults.recommendedBiddingStrategy || 'CPC manuel'}\n\n`;

    report += '='.repeat(60) + '\n';
    report += 'Généré par Google Ads Optimizer - MO\'CYNO\n';
    report += '='.repeat(60) + '\n';

    return report;
}

// Validation de données
function validateCampaignData(data) {
    const errors = [];

    if (!data.campaignName || data.campaignName.trim() === '') {
        errors.push('Le nom de campagne est requis');
    }

    if (!data.budget || data.budget <= 0) {
        errors.push('Le budget doit être supérieur à 0');
    }

    if (!data.keywords || data.keywords.length === 0) {
        errors.push('Au moins un mot-clé est requis');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

// Débounce pour optimiser les performances
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Smooth scroll vers un élément
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Obtenir l'icône selon la sévérité
function getSeverityIcon(severity) {
    const icons = {
        critical: '🔴',
        important: '🟠',
        optional: '🔵',
    };
    return icons[severity] || '⚪';
}

// Obtenir la couleur selon la sévérité
function getSeverityColor(severity) {
    const colors = {
        critical: 'danger',
        important: 'warning',
        optional: 'info',
    };
    return colors[severity] || 'primary';
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        formatNumber,
        formatPercent,
        calculateHealthScore,
        getScoreClass,
        getScoreLabel,
        estimateCPC,
        calculateOptimalBudget,
        simulatePerformance,
        recommendBiddingStrategy,
        copyToClipboard,
        showNotification,
        exportToPDF,
        exportToJSON,
        generateTextReport,
        validateCampaignData,
        debounce,
        scrollToElement,
        getSeverityIcon,
        getSeverityColor,
    };
}
