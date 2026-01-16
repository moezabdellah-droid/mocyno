const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Simple regex to extract JSON-LD. Note: This is a rough extraction, proper HTML parsing is better but this works for standard formatted blocks.
const extractJsonLd = (html) => {
    const matches = [];
    const regex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        matches.push(match[1]);
    }
    return matches;
};

// Recursive file search
const getAllHtmlFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllHtmlFiles(file));
        } else {
            if (file.endsWith('.html')) {
                results.push(file);
            }
        }
    });
    return results;
};

const validate = () => {
    const root = path.join(__dirname, 'public');
    const files = getAllHtmlFiles(root);
    let errorCount = 0;

    console.log(`Scanning ${files.length} HTML files for JSON-LD...`);

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const jsonBlocks = extractJsonLd(content);

        if (jsonBlocks.length > 0) {
            jsonBlocks.forEach((block, index) => {
                try {
                    // Try to strict parse
                    JSON.parse(block);
                    // console.log(`✅ ${path.basename(file)} [Block ${index + 1}] Valid`);
                } catch (e) {
                    console.error(`❌ INVALID JSON-LD in ${path.relative(root, file)} [Block ${index + 1}]`);
                    console.error(`   Error: ${e.message}`);
                    // Print context around the error if possible (simple split)
                    const lines = block.split('\n');
                    // Try to guess line? JSON.parse error usually gives position.
                    // Just print the whole block for debug if it's short, or snippet
                    console.error(`   Content Snippet: ${block.substring(0, 100)}...`);
                    errorCount++;
                }
            });
        }
    });

    if (errorCount === 0) {
        console.log("🎉 ALL JSON-LD BLOCKS ARE VALID!");
    } else {
        console.error(`⚠️ Found ${errorCount} invalid JSON-LD blocks.`);
        process.exit(1);
    }
};

validate();
