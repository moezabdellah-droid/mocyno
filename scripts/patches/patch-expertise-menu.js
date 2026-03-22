const fs = require('fs');
const path = require('path');

// FR replacement
const FR_OLD = '<a href="/fr/services/">Expertise</a>';
const FR_NEW = `<div class="zones-nav">
          <a class="zones-trigger" href="/fr/services/">Expertise</a>
          <div class="zones-menu">
            <ul class="zones-list">
              <li><a href="/fr/services/surveillance-humaine/">Surveillance humaine</a></li>
              <li><a href="/fr/services/securite-cynophile/">Sécurité cynophile</a></li>
              <li><a href="/fr/services/securite-incendie-ssiap/">Sécurité incendie (SSIAP)</a></li>
              <li><a href="/fr/services/securite-evenementielle/">Sûreté événementielle</a></li>
              <li><a href="/fr/services/evenementiel-premium/">Événementiel premium</a></li>
              <li><a href="/fr/services/protection-luxe/">Protection du luxe</a></li>
              <li><a href="/fr/services/luxe-boutiques/">Luxe & Boutiques</a></li>
              <li><a href="/fr/services/residentiel/">Résidentiel & Villas</a></li>
              <li><a href="/fr/services/hotellerie/">Hôtellerie</a></li>
              <li><a href="/fr/services/chantiers/">Chantiers & BTP</a></li>
              <li><a href="/fr/services/marinas-ports/">Marinas & Ports</a></li>
            </ul>
          </div>
        </div>`;

// EN replacement
const EN_OLD = '<a href="/en/services/">Expertise</a>';
const EN_NEW = `<div class="zones-nav">
          <a class="zones-trigger" href="/en/services/">Expertise</a>
          <div class="zones-menu">
            <ul class="zones-list">
              <li><a href="/en/services/manned-guarding/">Manned Guarding</a></li>
              <li><a href="/en/services/securite-cynophile/">K9 Security</a></li>
              <li><a href="/en/services/fire-safety-ssiap/">Fire Safety (SSIAP)</a></li>
              <li><a href="/en/services/premium-events/">Premium Events</a></li>
              <li><a href="/en/services/luxury-protection/">Luxury Protection</a></li>
              <li><a href="/en/services/luxury-boutiques/">Luxury Boutiques</a></li>
              <li><a href="/en/services/residential/">Residential & Villas</a></li>
              <li><a href="/en/services/hospitality/">Hospitality</a></li>
              <li><a href="/en/services/construction-sites/">Construction Sites</a></li>
              <li><a href="/en/services/marinas-ports/">Marinas & Ports</a></li>
            </ul>
          </div>
        </div>`;

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(walk(full));
    else if (f.endsWith('.html')) results.push(full);
  }
  return results;
}

const root = 'c:/Users/abdel/Desktop/Mocyno3/mocyno2/public';
let frCount = 0, enCount = 0;
const frFiles = [], enFiles = [];

// FR
for (const f of walk(path.join(root, 'fr'))) {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes(FR_OLD)) {
    const newContent = content.replace(FR_OLD, FR_NEW);
    fs.writeFileSync(f, newContent, 'utf8');
    frCount++;
    frFiles.push(path.relative(root, f));
  }
}

// EN
for (const f of walk(path.join(root, 'en'))) {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes(EN_OLD)) {
    const newContent = content.replace(EN_OLD, EN_NEW);
    fs.writeFileSync(f, newContent, 'utf8');
    enCount++;
    enFiles.push(path.relative(root, f));
  }
}

console.log('=== PATCH RESULTS ===');
console.log('FR files modified: ' + frCount);
frFiles.forEach(f => console.log('  ' + f));
console.log('EN files modified: ' + enCount);
enFiles.forEach(f => console.log('  ' + f));
console.log('TOTAL: ' + (frCount + enCount));
