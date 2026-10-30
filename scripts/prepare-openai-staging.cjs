'use strict';
// Produces a separate, staging-only Functions artifact. Never edits source files.
const fs = require('node:fs');
const path = require('node:path');
function prepare(source) {
  const replacements = [
    ['exports.contactForm = onRequest({ region: "europe-west1" }, async (req, res) => {',
      'exports.contactForm = onRequest({ region: "europe-west1" }, async (req, res) => {\n  if (process.env.GCLOUD_PROJECT !== "mocyno-staging") {\n    res.status(503).send("Staging recipe only.");\n    return;\n  }'],
    ['to: ["contact@mocyno.com", "abdellahmoez@gmail.com", "moezabdellah@mocyno.com"],',
      'to: ["moezabdellah@mocyno.com"],'],
    ['to: [emailStr],', 'to: ["moezabdellah@mocyno.com"],'],
    ['subject: `Nouveau Contact Site :', 'subject: `[TEST STAGING — SANS SUITE COMMERCIALE] Nouveau Contact Site :'],
    ['subject: "Confirmation de réception - MO\'CYNO",',
      'subject: "[TEST STAGING — SANS SUITE COMMERCIALE] Confirmation de réception - MO\'CYNO",']
  ];
  for (const [before, after] of replacements) {
    if (source.split(before).length !== 2) throw new Error('Unexpected source; staging artifact refused.');
    source = source.replace(before, after);
  }
  return source;
}
module.exports = { prepare };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const output = process.argv[2] && path.resolve(process.argv[2]);
  if (!output || fs.existsSync(output)) throw new Error('Provide a new, separate output directory.');
  const source = prepare(fs.readFileSync(path.join(root, 'functions/index.js'), 'utf8'));
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(output, 'index.js'), source);
  for (const name of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(root, 'functions', name), path.join(output, name));
  }
  console.log('Staging-only artifact prepared; no deployment.');
}
