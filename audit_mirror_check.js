const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Configuration
const PUBLIC_DIR = path.join(__dirname, 'public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');
const BASE_URL = 'https://mocyno.com';

// Colors
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

function main() {
    console.log(`${colors.blue}=== ANTIGRAVITY MIRROR AUDIT ===${colors.reset}\n`);

    if (!fs.existsSync(SITEMAP_PATH)) {
        console.error(`${colors.red}CRITICAL: Sitemap not found.${colors.reset}`);
        process.exit(1);
    }

    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const urls = extractUrlsFromSitemap(sitemapContent);

    // 1. Identify Pairs
    const pairs = identifyPairs(urls);
    console.log(`Identified ${pairs.length} URL Pairs (FR/EN).\n`);

    const parityTable = [];
    let criticalIssues = 0;

    // 2. Analyze Pairs
    pairs.forEach(pair => {
        const frData = analyzeFile(pair.fr);
        const enData = analyzeFile(pair.en);

        const analysis = comparePages(frData, enData);
        parityTable.push({
            pair: pair,
            frData: frData,
            enData: enData,
            analysis: analysis
        });

        if (analysis.status !== 'PERFECT') {
            criticalIssues++;
        }
    });

    // 3. Output Report
    printReport(parityTable);

    const reportOutput = {
        timestamp: new Date().toISOString(),
        total_pairs: pairs.length,
        critical_issues: criticalIssues,
        details: parityTable.map(p => ({
            pair: p.pair,
            status: p.analysis.status,
            issues: p.analysis.issues
        }))
    };

    fs.writeFileSync('mirror_report.json', JSON.stringify(reportOutput, null, 2));
    console.log(`\n${colors.cyan}Report saved to: mirror_report.json${colors.reset}`);

    if (criticalIssues > 0) {
        console.log(`\n${colors.yellow}AUDIT COMPLETE: ${criticalIssues} pairs have divergences.${colors.reset}`);
    } else {
        console.log(`\n${colors.green}AUDIT COMPLETE: All pairs are PERFECTLY MIRRORED.${colors.reset}`);
    }
}

function extractUrlsFromSitemap(xml) {
    const regex = /<loc>(https:\/\/mocyno\.com.*?)<\/loc>/g;
    const urls = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
        if (!urls.includes(match[1])) urls.push(match[1]);
    }
    return urls;
}

// Logic to identify pairs based on structure
// Assumes /en/ mirroring structure
function identifyPairs(urls) {
    const pairs = [];
    const processed = new Set();

    urls.forEach(url => {
        if (processed.has(url)) return;

        let frUrl, enUrl;

        if (url.includes('/en/')) {
            enUrl = url;
            frUrl = url.replace('/en/', '/');
            if (frUrl === 'https://mocyno.com/') frUrl = 'https://mocyno.com/'; // Handle root
            // Special case cleanups if necessary (e.g. if root replace leaves double slash - addressed above)
        } else {
            frUrl = url;
            enUrl = url.replace('https://mocyno.com/', 'https://mocyno.com/en/');
            if (frUrl === 'https://mocyno.com/') enUrl = 'https://mocyno.com/en/';
        }

        // Verify if counterpart exists in sitemap (or at least calculate it)
        // We only care about sitemap URLs
        if (urls.includes(frUrl) && urls.includes(enUrl)) {
            pairs.push({ fr: frUrl, en: enUrl });
            processed.add(frUrl);
            processed.add(enUrl);
        } else {
            // Unpaired URL?
            // Could be a blog post that is not translated?
            // Or a structure mismatch.
            // console.log(`Unpaired URL found: ${url}`);
        }
    });
    return pairs;
}

function localPathFromUrl(urlStr) {
    try {
        const url = new URL(urlStr);
        let pathname = url.pathname;
        if (pathname.endsWith('/')) pathname += 'index.html';
        else if (!path.extname(pathname)) pathname += '.html';
        return path.join(PUBLIC_DIR, pathname);
    } catch (e) { return null; }
}

function analyzeFile(urlStr) {
    const filePath = localPathFromUrl(urlStr);
    const result = {
        url: urlStr,
        exists: false,
        title: null,
        desc: null,
        canonical: null,
        hreflang: [],
        jsonLdTypes: [],
        ogTags: []
    };

    if (filePath && fs.existsSync(filePath)) {
        result.exists = true;
        const content = fs.readFileSync(filePath, 'utf8');

        const titleMatch = content.match(/<title>(.*?)<\/title>/);
        if (titleMatch) result.title = titleMatch[1];

        const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/);
        if (descMatch) result.desc = descMatch[1];

        const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/);
        if (canonicalMatch) result.canonical = canonicalMatch[1];

        const hreflangRegex = /<link\s+rel=["']alternate["']\s+hreflang=["'](.*?)["']\s+href=["'](.*?)["']/g;
        let hMatch;
        while ((hMatch = hreflangRegex.exec(content)) !== null) {
            result.hreflang.push({ lang: hMatch[1], url: hMatch[2] });
        }

        const jsonRegex = /<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/g;
        let jMatch;
        while ((jMatch = jsonRegex.exec(content)) !== null) {
            try {
                const json = JSON.parse(jMatch[1]);
                const type = json['@type'];
                if (type) result.jsonLdTypes.push(type);
            } catch (e) { }
        }

        // Simple OG Check
        if (content.includes('property="og:title"')) result.ogTags.push('title');
        if (content.includes('property="og:description"')) result.ogTags.push('desc');
        if (content.includes('property="og:image"')) result.ogTags.push('image');
    }
    return result;
}

function comparePages(fr, en) {
    const issues = [];

    if (!fr.exists) issues.push("FR File Missing");
    if (!en.exists) issues.push("EN File Missing");

    if (fr.exists && en.exists) {
        // Hreflang
        const frLinksToEn = fr.hreflang.find(h => h.lang === 'en' && h.url === en.url);
        const enLinksToFr = en.hreflang.find(h => h.lang === 'fr' && h.url === fr.url);

        if (!frLinksToEn) issues.push("FR missing Hreflang to EN");
        if (!enLinksToFr) issues.push("EN missing Hreflang to FR");

        // JSON-LD Parity
        // Sort and compare types
        const frTypes = fr.jsonLdTypes.sort().join(',');
        const enTypes = en.jsonLdTypes.sort().join(',');
        if (frTypes !== enTypes) issues.push(`JSON-LD Mismatch (FR: [${frTypes}] vs EN: [${enTypes}])`);

        // OG Parity
        if (fr.ogTags.length !== en.ogTags.length) issues.push("OG Tag Count Mismatch");
    }

    return {
        status: issues.length === 0 ? 'PERFECT' : 'DIVERGENT',
        issues: issues
    };
}

function printReport(table) {
    // Format: FR URL | Parity | Issues
    console.log("FR URL".padEnd(50) + "STATUS".padEnd(15) + "ISSUES");
    console.log("-".repeat(120));

    table.forEach(row => {
        const shortUrl = row.pair.fr.replace(BASE_URL, '') || '/';
        const color = row.analysis.status === 'PERFECT' ? colors.green : colors.yellow;
        console.log(
            shortUrl.padEnd(50) +
            color + row.analysis.status.padEnd(15) + colors.reset +
            row.analysis.issues.join(', ')
        );
    });
}

main();
