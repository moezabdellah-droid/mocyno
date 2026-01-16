// ============================================
// DATA - Base de données statique
// ============================================

// Mots-clés secteur sécurité cynophile avec estimations
const keywordsDatabase = {
  // Mots-clés principaux - Haute intention commerciale
  primary: [
    { keyword: 'agent cynophile', volume: 480, cpc: 3.20, competition: 'Élevée', intent: 'Commercial' },
    { keyword: 'maître chien sécurité', volume: 390, cpc: 3.50, competition: 'Élevée', intent: 'Commercial' },
    { keyword: 'société sécurité cynophile', volume: 320, cpc: 4.10, competition: 'Élevée', intent: 'Commercial' },
    { keyword: 'gardiennage cynophile', volume: 260, cpc: 3.80, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'sécurité cynophile', volume: 590, cpc: 2.90, competition: 'Élevée', intent: 'Informationnel' },
  ],
  
  // Mots-clés spécifiques services
  services: [
    { keyword: 'gardiennage chantier', volume: 720, cpc: 2.50, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'surveillance chantier', volume: 880, cpc: 2.30, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'protection chantier', volume: 410, cpc: 2.80, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'sécurité entrepôt', volume: 320, cpc: 3.10, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'gardiennage entrepôt', volume: 210, cpc: 3.40, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'surveillance villa', volume: 180, cpc: 3.90, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'protection propriété', volume: 290, cpc: 3.20, competition: 'Moyenne', intent: 'Commercial' },
  ],
  
  // Mots-clés géolocalisés
  geo: [
    { keyword: 'agent cynophile var', volume: 90, cpc: 4.20, competition: 'Faible', intent: 'Commercial' },
    { keyword: 'sécurité cynophile saint tropez', volume: 40, cpc: 5.10, competition: 'Faible', intent: 'Commercial' },
    { keyword: 'maître chien var', volume: 70, cpc: 3.80, competition: 'Faible', intent: 'Commercial' },
    { keyword: 'gardiennage var', volume: 110, cpc: 3.50, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'sécurité privée var', volume: 140, cpc: 3.20, competition: 'Moyenne', intent: 'Commercial' },
  ],
  
  // Mots-clés longue traîne
  longTail: [
    { keyword: 'devis gardiennage cynophile', volume: 50, cpc: 4.50, competition: 'Faible', intent: 'Transactionnel' },
    { keyword: 'tarif agent cynophile', volume: 60, cpc: 3.90, competition: 'Faible', intent: 'Transactionnel' },
    { keyword: 'prix gardiennage chantier', volume: 90, cpc: 2.80, competition: 'Faible', intent: 'Transactionnel' },
    { keyword: 'entreprise sécurité cynophile', volume: 110, cpc: 3.60, competition: 'Moyenne', intent: 'Commercial' },
    { keyword: 'service gardiennage professionnel', volume: 80, cpc: 3.10, competition: 'Faible', intent: 'Commercial' },
  ],
};

// Mots-clés négatifs recommandés
const negativeKeywords = [
  'emploi', 'recrutement', 'formation', 'stage', 'cours',
  'gratuit', 'prix', 'salaire', 'offre emploi', 'cdi', 'cdd',
  'école', 'diplôme', 'certification', 'examen',
  'chien à vendre', 'adoption', 'élevage', 'chiot',
  'jeux', 'jouet', 'nourriture', 'vétérinaire',
  'dressage personnel', 'éducation canine', 'comportementaliste',
];

// Templates d'annonces optimisés
const adTemplates = {
  headlines: [
    'Agents Cynophiles K9 Certifiés',
    'Sécurité Cynophile Var & PACA',
    'Maîtres-Chiens Professionnels',
    'Gardiennage 24/7 avec Chiens',
    'Protection Chantiers & Sites',
    'Intervention Rapide Var',
    'Sécurité Privée Saint-Tropez',
    'Surveillance Cynophile Pro',
    'Devis Gratuit Sous 24h',
    'Agents Agréés & Assurés',
    'Sécurité Renforcée K9',
    'Protection Sites Sensibles',
    'Gardiennage Cynophile Expert',
    'Intervention 24h/24 - 7j/7',
    'MO\'CYNO - Sécurité Cynophile',
  ],
  
  descriptions: [
    'Agents cynophiles K9 et sécurité privée pour chantiers, villas et sites sensibles. Interventions rapides 24/7. Maîtres-chiens professionnels certifiés. Devis immédiat.',
    'Protection professionnelle avec maîtres-chiens agréés. Surveillance 24h/24 dans le Var et PACA. Intervention rapide, discrétion garantie. Contactez-nous.',
    'Gardiennage cynophile pour entreprises et particuliers. Équipes K9 certifiées, disponibles 7j/7. Devis personnalisé gratuit. Plus de 10 ans d\'expérience.',
    'Sécurité renforcée avec agents cynophiles professionnels. Protection chantiers, entrepôts, villas. Intervention rapide Var. Devis sous 24h.',
  ],
  
  sitelinks: [
    { title: 'Sécurité Cynophile K9', description: 'Agents et maîtres-chiens certifiés' },
    { title: 'Services', description: 'Gardiennage, surveillance, protection' },
    { title: 'Contact & Devis', description: 'Réponse rapide garantie' },
    { title: 'Surveillance Humaine', description: 'Agents de sécurité professionnels' },
  ],
  
  callouts: [
    'Intervention rapide Var',
    'Sécurité 24h/24 – 7j/7',
    'Agents cynophiles agréés',
    'Devis gratuit sous 24h',
    'Plus de 10 ans d\'expérience',
    'Équipes K9 certifiées',
  ],
  
  snippets: [
    'Agents cynophiles K9 certifiés pour protection maximale',
    'Intervention rapide dans tout le Var et PACA',
    'Surveillance professionnelle 24h/24 et 7j/7',
    'Devis personnalisé gratuit sous 24 heures',
  ],
};

// Benchmarks industrie sécurité
const industryBenchmarks = {
  avgCTR: 3.5, // % moyen CTR secteur sécurité
  avgCPC: 3.20, // € moyen CPC secteur sécurité
  avgConversionRate: 8.5, // % moyen taux de conversion
  avgCostPerLead: 45, // € moyen coût par lead
  recommendedBudget: {
    min: 20, // € minimum par jour
    optimal: 35, // € optimal par jour
    max: 100, // € maximum recommandé
  },
};

// Problèmes courants et solutions
const commonIssues = [
  {
    id: 'bidding_strategy',
    category: 'Enchères',
    severity: 'critical',
    title: 'Stratégie d\'enchères inadaptée',
    description: 'Vous utilisez "Maximiser les conversions" sans historique de conversion. Google ne peut pas optimiser sans données.',
    impact: 'Aucune impression - La campagne ne se diffuse pas',
    solution: 'Passer à "CPC manuel" ou "Maximiser les clics" pour démarrer',
    steps: [
      'Aller dans Paramètres de la campagne',
      'Section "Enchères"',
      'Sélectionner "CPC manuel" ou "Maximiser les clics"',
      'Définir un CPC max de 2-4€',
    ],
  },
  {
    id: 'network_settings',
    category: 'Réseaux',
    severity: 'important',
    title: 'Réseau Display activé inutilement',
    description: 'Le Réseau Display dilue votre budget et réduit la pertinence pour une campagne de recherche.',
    impact: 'Budget gaspillé sur des impressions non qualifiées',
    solution: 'Désactiver le Réseau Display, garder uniquement Recherche',
    steps: [
      'Aller dans Paramètres de la campagne',
      'Section "Réseaux"',
      'Décocher "Réseau Display de Google"',
      'Garder uniquement "Réseau de Recherche"',
    ],
  },
  {
    id: 'geo_targeting',
    category: 'Ciblage',
    severity: 'important',
    title: 'Zone géographique trop restreinte',
    description: 'Ciblage uniquement sur le Var limite drastiquement le volume de recherche.',
    impact: 'Très peu d\'impressions potentielles',
    solution: 'Élargir à PACA ou Côte d\'Azur selon votre zone d\'intervention',
    steps: [
      'Aller dans Paramètres de la campagne',
      'Section "Zones géographiques"',
      'Ajouter "Provence-Alpes-Côte d\'Azur" ou départements limitrophes',
      'Ajuster les enchères par zone si nécessaire',
    ],
  },
  {
    id: 'dynamic_search_ads',
    category: 'Paramètres',
    severity: 'important',
    title: 'Annonces dynamiques activées',
    description: 'Les annonces dynamiques peuvent créer des conflits avec vos mots-clés et annonces manuelles.',
    impact: 'Diffusion imprévisible et moins de contrôle',
    solution: 'Désactiver les annonces dynamiques pour cette campagne',
    steps: [
      'Aller dans Paramètres de la campagne',
      'Section "Paramètres des annonces dynamiques"',
      'Désactiver "Ciblage automatique"',
    ],
  },
  {
    id: 'conversion_tracking',
    category: 'Conversion',
    severity: 'critical',
    title: 'Suivi de conversion non configuré',
    description: 'Objectif "Leads" sans suivi de conversion configuré empêche l\'optimisation.',
    impact: 'Impossible de mesurer le ROI et optimiser',
    solution: 'Configurer le suivi de conversion (formulaires, appels)',
    steps: [
      'Aller dans Outils > Conversions',
      'Créer une action de conversion "Envoi de formulaire"',
      'Installer le code de suivi sur votre site',
      'Créer une action "Appels téléphoniques"',
    ],
  },
  {
    id: 'keyword_match_types',
    category: 'Mots-clés',
    severity: 'optional',
    title: 'Types de correspondance non optimisés',
    description: 'Mélange de requête large, expression et exacte sans stratégie claire.',
    impact: 'Diffusion non optimale et budget gaspillé',
    solution: 'Privilégier l\'expression exacte et exacte pour démarrer',
    steps: [
      'Aller dans l\'onglet Mots-clés',
      'Modifier les types de correspondance',
      'Utiliser "expression exacte" pour mots-clés principaux',
      'Utiliser [exacte] pour mots-clés haute intention',
    ],
  },
  {
    id: 'low_volume_keywords',
    category: 'Mots-clés',
    severity: 'optional',
    title: 'Mots-clés à faible volume',
    description: 'Certains mots-clés comme "k9 gardiennage" ont un volume de recherche quasi nul en France.',
    impact: 'Aucune impression sur ces termes',
    solution: 'Supprimer les mots-clés à volume nul, ajouter des variantes',
    steps: [
      'Analyser le volume de chaque mot-clé',
      'Supprimer ceux avec 0 recherche',
      'Ajouter des variantes plus recherchées',
    ],
  },
  {
    id: 'ad_extensions',
    category: 'Annonces',
    severity: 'optional',
    title: 'Extensions d\'annonces manquantes',
    description: 'Aucune extension visible (liens annexes, accroches, extraits).',
    impact: 'Annonces moins visibles et CTR réduit',
    solution: 'Ajouter toutes les extensions pertinentes',
    steps: [
      'Aller dans Annonces et extensions',
      'Ajouter des liens annexes (4 minimum)',
      'Ajouter des accroches (4 minimum)',
      'Ajouter des extraits structurés',
    ],
  },
];

// Configuration de campagne optimale recommandée
const optimalCampaignConfig = {
  campaignName: 'GARDIENNAGE CYNOPHILE - Recherche Optimisée',
  objective: 'Leads',
  networks: ['Réseau de Recherche Google'],
  budget: {
    daily: 30, // €
    type: 'Standard',
  },
  bidding: {
    strategy: 'CPC manuel',
    maxCPC: 3.50, // €
    note: 'Passer à "Maximiser les conversions" après 30 conversions',
  },
  locations: [
    'Var, France',
    'Alpes-Maritimes, France',
    'Bouches-du-Rhône, France',
  ],
  languages: ['Français'],
  adRotation: 'Optimiser',
  dynamicSearchAds: false,
  broadMatchKeywords: false,
  adSchedule: '24/7',
  deviceBidAdjustments: {
    mobile: 0, // %
    desktop: 0, // %
    tablet: 0, // %
  },
};

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    keywordsDatabase,
    negativeKeywords,
    adTemplates,
    industryBenchmarks,
    commonIssues,
    optimalCampaignConfig,
  };
}
