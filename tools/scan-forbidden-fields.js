const fs = require('fs');
const path = require('path');

const contractPath = path.join(__dirname, 'contract.config.json');
if (!fs.existsSync(contractPath)) {
    console.error("ERROR: contract.config.json not found.");
    process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const forbiddenFields = contract.forbiddenFields || [];

if (forbiddenFields.length === 0) {
    console.log("No forbidden fields to scan for.");
    process.exit(0);
}

const ignoreDirs = ['node_modules', 'dist', 'build', '.git', '.firebase', '.terraform', 'infrastructure', 'scripts'];
const ignoreExts = ['.json', '.md', '.svg', '.png', '.jpg', '.exe', '.zip', '.tar', '.gz']; // Focus on code

function scanDirectory(dir) {
    let violations = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(file)) {
                violations = violations.concat(scanDirectory(fullPath));
            }
        } else {
            const ext = path.extname(fullPath);
            if (!ignoreExts.includes(ext)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    for (const field of forbiddenFields) {
                        // Very simple text scan. Could be refined with regex, but this catches string literals and property accesses.
                        if (line.includes(field) && !fullPath.includes('contract.config.json') && !fullPath.includes('audit-firestore.js') && !fullPath.includes('scan-forbidden-fields.js')) {
                            violations.push({
                                file: fullPath,
                                line: i + 1,
                                field: field,
                                content: line.trim()
                            });
                        }
                    }
                }
            }
        }
    }

    return violations;
}

const rootDir = path.resolve(__dirname, '..');
console.log(`Scanning for forbidden fields: ${forbiddenFields.join(', ')} ...`);
const allViolations = scanDirectory(rootDir);

if (allViolations.length > 0) {
    console.error(`ERROR: Found ${allViolations.length} occurrences of forbidden fields in the codebase!`);
    allViolations.forEach(v => {
        console.error(`- ${v.file}:${v.line} -> Found '${v.field}'`);
    });
    console.error("Please remove these fields to respect the Data Contract.");
    process.exit(1);
} else {
    console.log("SUCCESS: No forbidden fields found in the codebase.");
    process.exit(0);
}
