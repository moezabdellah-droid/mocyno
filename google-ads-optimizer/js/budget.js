// ============================================
// BUDGET - Calculateur de budget et enchères
// ============================================

// Calculer et afficher les recommandations budgétaires
function displayBudgetCalculator() {
    const container = document.getElementById('budget-calculator');

    if (!container) return;

    let html = `
    <div class="card fade-in">
      <div class="card-header">
        <div class="card-icon success">
          💰
        </div>
        <div>
          <h3 class="card-title">Calculateur de Budget & Enchères</h3>
          <p style="margin: 0; color: var(--color-gray-600);">Optimisez vos investissements publicitaires</p>
        </div>
      </div>
      
      <div class="card-body">
        <!-- Simulateur interactif -->
        <div class="card" style="background: var(--color-primary-light);">
          <h4>🎯 Simulateur de Performance</h4>
          
          <div class="form-group">
            <label class="form-label">Budget Quotidien (€)</label>
            <input type="number" id="budget-input" class="form-input" value="30" min="10" max="500" step="5" onchange="updateBudgetSimulation()">
          </div>
          
          <div class="form-group">
            <label class="form-label">CPC Maximum (€)</label>
            <input type="number" id="cpc-input" class="form-input" value="3.50" min="0.50" max="10" step="0.10" onchange="updateBudgetSimulation()">
          </div>
          
          <div class="form-group">
            <label class="form-label">CTR Estimé (%)</label>
            <input type="number" id="ctr-input" class="form-input" value="3.5" min="1" max="10" step="0.5" onchange="updateBudgetSimulation()">
          </div>
          
          <div id="simulation-results" style="margin-top: var(--spacing-xl);"></div>
        </div>
        
        <!-- Recommandations -->
        <div style="margin-top: var(--spacing-xl);">
          <h4>📊 Recommandations Budgétaires</h4>
          
          <div class="grid grid-3">
            <div class="card" style="text-align: center; background: var(--color-success-light);">
              <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-bottom: var(--spacing-xs);">Minimum</div>
              <div style="font-size: var(--font-size-2xl); font-weight: 800; color: var(--color-success);">
                ${formatCurrency(industryBenchmarks.recommendedBudget.min)}
              </div>
              <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-top: var(--spacing-xs);">par jour</div>
            </div>
            
            <div class="card" style="text-align: center; background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-success-light) 100%); border: 2px solid var(--color-primary);">
              <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-bottom: var(--spacing-xs);">⭐ Optimal</div>
              <div style="font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-primary);">
                ${formatCurrency(industryBenchmarks.recommendedBudget.optimal)}
              </div>
              <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-top: var(--spacing-xs);">par jour</div>
            </div>
            
            <div class="card" style="text-align: center; background: var(--color-warning-light);">
              <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-bottom: var(--spacing-xs);">Maximum</div>
              <div style="font-size: var(--font-size-2xl); font-weight: 800; color: var(--color-warning);">
                ${formatCurrency(industryBenchmarks.recommendedBudget.max)}
              </div>
              <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-top: var(--spacing-xs);">par jour</div>
            </div>
          </div>
        </div>
        
        <!-- Stratégies d'enchères -->
        <div style="margin-top: var(--spacing-xl);">
          <h4>🎲 Stratégies d'Enchères Recommandées</h4>
          
          <div class="grid grid-2">
            <div class="card" style="border-left: 4px solid var(--color-success);">
              <h5 style="color: var(--color-success); margin-bottom: var(--spacing-md);">✅ Pour Démarrer (0 conversions)</h5>
              <p><strong>Stratégie:</strong> CPC Manuel</p>
              <p><strong>CPC Max:</strong> ${formatCurrency(3.50)}</p>
              <p style="font-size: var(--font-size-sm); color: var(--color-gray-600);">
                Vous gardez le contrôle total. Idéal pour collecter des données initiales sans dépenser trop.
              </p>
            </div>
            
            <div class="card" style="border-left: 4px solid var(--color-warning);">
              <h5 style="color: var(--color-warning); margin-bottom: var(--spacing-md);">⚡ Après 1 mois (1-29 conversions)</h5>
              <p><strong>Stratégie:</strong> Maximiser les Clics</p>
              <p><strong>Budget:</strong> ${formatCurrency(30)}/jour</p>
              <p style="font-size: var(--font-size-sm); color: var(--color-gray-600);">
                Google optimise pour obtenir le maximum de clics dans votre budget. Accélère l'apprentissage.
              </p>
            </div>
            
            <div class="card" style="border-left: 4px solid var(--color-primary);">
              <h5 style="color: var(--color-primary); margin-bottom: var(--spacing-md);">🚀 Après 30+ conversions</h5>
              <p><strong>Stratégie:</strong> Maximiser les Conversions</p>
              <p><strong>CPA Cible:</strong> ${formatCurrency(industryBenchmarks.avgCostPerLead)}</p>
              <p style="font-size: var(--font-size-sm); color: var(--color-gray-600);">
                L'IA de Google optimise pour obtenir le maximum de conversions. Nécessite un historique suffisant.
              </p>
            </div>
            
            <div class="card" style="border-left: 4px solid var(--color-info);">
              <h5 style="color: var(--color-info); margin-bottom: var(--spacing-md);">💎 Avancé (50+ conversions)</h5>
              <p><strong>Stratégie:</strong> ROAS Cible</p>
              <p><strong>ROAS:</strong> 300-500%</p>
              <p style="font-size: var(--font-size-sm); color: var(--color-gray-600);">
                Optimise pour la valeur de conversion. Nécessite un suivi de la valeur des leads.
              </p>
            </div>
          </div>
        </div>
        
        <!-- Benchmarks industrie -->
        <div style="margin-top: var(--spacing-xl);">
          <h4>📈 Benchmarks Industrie Sécurité</h4>
          
          <div class="grid grid-2">
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span>CTR Moyen</span>
                <strong style="font-size: var(--font-size-xl); color: var(--color-primary);">${formatPercent(industryBenchmarks.avgCTR)}</strong>
              </div>
              <div class="progress">
                <div class="progress-bar" style="width: ${industryBenchmarks.avgCTR * 10}%;"></div>
              </div>
            </div>
            
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span>CPC Moyen</span>
                <strong style="font-size: var(--font-size-xl); color: var(--color-success);">${formatCurrency(industryBenchmarks.avgCPC)}</strong>
              </div>
              <div class="progress">
                <div class="progress-bar success" style="width: ${(industryBenchmarks.avgCPC / 10) * 100}%;"></div>
              </div>
            </div>
            
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span>Taux de Conversion</span>
                <strong style="font-size: var(--font-size-xl); color: var(--color-warning);">${formatPercent(industryBenchmarks.avgConversionRate)}</strong>
              </div>
              <div class="progress">
                <div class="progress-bar warning" style="width: ${industryBenchmarks.avgConversionRate * 10}%;"></div>
              </div>
            </div>
            
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                <span>Coût par Lead</span>
                <strong style="font-size: var(--font-size-xl); color: var(--color-danger);">${formatCurrency(industryBenchmarks.avgCostPerLead)}</strong>
              </div>
              <div class="progress">
                <div class="progress-bar danger" style="width: ${(industryBenchmarks.avgCostPerLead / 100) * 100}%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

    container.innerHTML = html;

    // Lancer la simulation initiale
    updateBudgetSimulation();
}

// Mettre à jour la simulation de budget
function updateBudgetSimulation() {
    const budget = parseFloat(document.getElementById('budget-input')?.value || 30);
    const cpc = parseFloat(document.getElementById('cpc-input')?.value || 3.50);
    const ctr = parseFloat(document.getElementById('ctr-input')?.value || 3.5);

    const results = simulatePerformance(budget, cpc, ctr);

    const container = document.getElementById('simulation-results');
    if (!container) return;

    container.innerHTML = `
    <div class="alert alert-success">
      <div class="alert-content">
        <div class="alert-title">📊 Résultats Projetés</div>
      </div>
    </div>
    
    <div class="grid grid-2">
      <div class="card" style="text-align: center;">
        <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-bottom: var(--spacing-xs);">Impressions</div>
        <div style="font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-primary);">
          ${formatNumber(results.impressions)}
        </div>
        <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-top: var(--spacing-xs);">par jour</div>
      </div>
      
      <div class="card" style="text-align: center;">
        <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-bottom: var(--spacing-xs);">Clics</div>
        <div style="font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-success);">
          ${formatNumber(results.clicks)}
        </div>
        <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-top: var(--spacing-xs);">par jour</div>
      </div>
      
      <div class="card" style="text-align: center;">
        <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-bottom: var(--spacing-xs);">Leads Estimés</div>
        <div style="font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-warning);">
          ${formatNumber(results.leads)}
        </div>
        <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-top: var(--spacing-xs);">par jour</div>
      </div>
      
      <div class="card" style="text-align: center;">
        <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-bottom: var(--spacing-xs);">Coût par Lead</div>
        <div style="font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-danger);">
          ${results.leads > 0 ? formatCurrency(results.costPerLead) : 'N/A'}
        </div>
        <div style="font-size: var(--font-size-sm); color: var(--color-gray-600); margin-top: var(--spacing-xs);">estimé</div>
      </div>
    </div>
    
    <div class="alert alert-info" style="margin-top: var(--spacing-md);">
      <div class="alert-content">
        <p style="margin: 0;"><strong>Projection mensuelle:</strong> ~${formatNumber(results.leads * 30)} leads pour ${formatCurrency(budget * 30)} de budget</p>
      </div>
    </div>
  `;
}

// Lancer le calculateur de budget
function runBudgetCalculator() {
    displayBudgetCalculator();
    setTimeout(() => scrollToElement('budget-calculator'), 300);
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        displayBudgetCalculator,
        updateBudgetSimulation,
        runBudgetCalculator,
    };
}
