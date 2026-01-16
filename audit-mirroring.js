const fs = require('fs');
const path = require('path');

const MAPPINGS = [
    // General
    { fr: 'public/index.html', en: 'public/en/index.html' },
    { fr: 'public/a-propos.html', en: 'public/en/about.html' },
    { fr: 'public/contact.html', en: 'public/en/contact.html' },
    { fr: 'public/cookies.html', en: 'public/en/cookies.html' },
    { fr: 'public/mentions-legales.html', en: 'public/en/legal.html' },
    { fr: 'public/politique-confidentialite.html', en: 'public/en/privacy.html' },
    // Zones
    { fr: 'public/zones/saint-tropez.html', en: 'public/en/zones/saint-tropez.html' },
    { fr: 'public/zones/ramatuelle.html', en: 'public/en/zones/ramatuelle.html' },
    { fr: 'public/zones/cannes.html', en: 'public/en/zones/cannes.html' },
    { fr: 'public/zones/nice.html', en: 'public/en/zones/nice.html' },
    { fr: 'public/zones/toulon.html', en: 'public/en/zones/toulon.html' },
    { fr: 'public/zones/frejus.html', en: 'public/en/zones/frejus.html' },
    { fr: 'public/zones/sainte-maxime.html', en: 'public/en/zones/sainte-maxime.html' },
    // Services HTML
    { fr: 'public/services/index.html', en: 'public/en/services/index.html' },
    { fr: 'public/services/securite-cynophile.html', en: 'public/en/services/securite-cynophile.html' },
    { fr: 'public/services/protection-luxe.html', en: 'public/en/services/protection-luxe.html' },
    { fr: 'public/services/securite-evenementielle.html', en: 'public/en/services/securite-evenementielle.html' },
    { fr: 'public/services/securite-incendie-ssiap.html', en: 'public/en/services/securite-incendie-ssiap.html' },
    { fr: 'public/services/surveillance-humaine.html', en: 'public/en/services/surveillance-humaine.html' },
    // Services Index (Directories)
    { fr: 'public/services/chantiers/index.html', en: 'public/en/services/construction-sites/index.html' },
    { fr: 'public/services/evenementiel-premium/index.html', en: 'public/en/services/premium-events/index.html' },
    { fr: 'public/services/hotellerie/index.html', en: 'public/en/services/hospitality/index.html' },
    { fr: 'public/services/luxe-boutiques/index.html', en: 'public/en/services/luxury-boutiques/index.html' },
    { fr: 'public/services/marinas-ports/index.html', en: 'public/en/services/marinas-ports/index.html' },
    { fr: 'public/services/residentiel/index.html', en: 'public/en/services/residential/index.html' }
];

function analyzeFile(filePath, lang) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');

    const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
    const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    const hreflangs = [...content.matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["']/gi)];
    const jsonLdCount = (content.match(/application\/ld\+json/g) || []).length;
    const h1Count = (content.match(/<h1/gi) || []).length;
    const sectionCount = (content.match(/<section/gi) || []).length;

    return {
        exists: true,
        title: titleMatch ? titleMatch[1] : null,
        canonical: canonicalMatch ? canonicalMatch[1] : null,
        hreflangs: hreflangs.map(m => ({ lang: m[1], url: m[2] })),
        jsonLdCount,
        h1Count,
        sectionCount,
        contentLength: content.length
    };
}

console.log('--- STARTING AUDIT ---');

MAPPINGS.forEach(pair => {
    console.log(`\nChecking: ${pair.fr} <-> ${pair.en}`);

    const frData = analyzeFile(pair.fr, 'fr');
    const enData = analyzeFile(pair.en, 'en');

    if (!frData) {
        console.error(`❌ FR File missing: ${pair.fr}`);
        return;
    }
    if (!enData) {
        console.error(`❌ EN File missing: ${pair.en}`);
        return;
    }

    // Check 1: Structure Parity (Sections/H1)
    if (frData.h1Count !== enData.h1Count) {
        console.warn(`⚠️ H1 Mismatch: FR(${frData.h1Count}) vs EN(${enData.h1Count})`);
    }

    // Allow some variance in section count but warn if large
    if (Math.abs(frData.sectionCount - enData.sectionCount) > 1) {
        console.warn(`⚠️ Section Count Mismatch: FR(${frData.sectionCount}) vs EN(${enData.sectionCount})`);
    }

    // Check 2: Canonical
    if (!enData.canonical || !enData.canonical.includes('/en/')) {
        console.error(`❌ Invalid EN Canonical: ${enData.canonical}`);
    }

    // Check 3: Hreflang
    const enHreflangFr = enData.hreflangs.find(h => h.lang === 'fr');
    const enHreflangEn = enData.hreflangs.find(h => h.lang === 'en');

    if (!enHreflangFr) console.error(`❌ EN page missing 'fr' hreflang`);
    if (!enHreflangEn) console.error(`❌ EN page missing 'en' hreflang`);

    // Check 4: JSON-LD
    if (frData.jsonLdCount !== enData.jsonLdCount) {
        console.warn(`⚠️ JSON-LD Count Mismatch: FR(${frData.jsonLdCount}) vs EN(${enData.jsonLdCount})`);
    }
});

console.log('\n--- AUDIT COMPLETE ---');
