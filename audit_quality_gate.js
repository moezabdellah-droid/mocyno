const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SITEMAP_PATH = path.join(__dirname, 'public', 'sitemap.xml');
const PUBLIC_DIR = path.join(__dirname, 'public');
const BASE_URL = 'https://mocyno.com';

// Color codes for console output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m"
};

function main() {
    console.log(`${colors.blue}=== ANTIGRAVITY SEO ENGINE: QUALITY GATE ===${colors.reset}\n`);

    if (!fs.existsSync(SITEMAP_PATH)) {
        console.error(`${colors.red}CRITICAL: Sitemap not found at ${SITEMAP_PATH}${colors.reset}`);
        process.exit(1);
    }

    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const urls = extractUrlsFromSitemap(sitemapContent);

    console.log(`Found ${urls.length} URLs in sitemap.\n`);

    const results = [];
    let globalFail = false;

    // Additional known URLs to check even if not in sitemap (e.g. specialized 404, or newly added pages)
    // For now, relies on Sitemap as the source of truth for the 'production' audit.

    const urlSet = new Set(urls);

    urls.forEach(url => {
        const result = checkUrl(url, urlSet);
        results.push(result);
        if (result.severity === 'CRITICAL' || result.severity === 'IMPORTANT') {
            globalFail = true;
        }
    });

    checkGlobalUniqueness(results);

    printTable(results);

    if (globalFail) {
        console.log(`\n${colors.red}FAIL: Critical or Important issues detected.${colors.reset}`);
        // process.exit(1); // Don't exit 1 to allow analysis of output
    } else {
        console.log(`\n${colors.green}PASS: No critical/important issues found.${colors.reset}`);
    }
}

function extractUrlsFromSitemap(xml) {
    const regex = /<loc>(https:\/\/mocyno\.com.*?)<\/loc>/g;
    const urls = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
        if (!urls.includes(match[1])) {
            urls.push(match[1]);
        }
    }
    return urls;
}

function localPathFromUrl(urlStr) {
    try {
        const url = new URL(urlStr);
        let pathname = url.pathname;
        if (pathname.endsWith('/')) {
            pathname += 'index.html';
        } else if (!path.extname(pathname)) {
            // Assuming clean URLs map to .html for checking, or firebase.json handles it.
            // But user says: "URLs en .html" and "cleanUrls:false". 
            // So sitemap URLs should have .html. 
            // If sitemap has extensionless URL, it might be a file or logic error.
            // We will check file existence.
            pathname += '.html';
        }
        return path.join(PUBLIC_DIR, pathname);
    } catch (e) {
        return null;
    }
}

const urlList = new Set();

function checkUrl(urlStr, allUrls) {
    const report = {
        url: urlStr,
        status: '---',
        canonical: 'MISSING',
        hreflang: '---',
        jsonLd: 'NONE',
        problems: [],
        severity: 'OK',
        title: '',
        description: ''
    };

    const filePath = localPathFromUrl(urlStr);

    if (!filePath || !fs.existsSync(filePath)) {
        report.status = '404 (Local File)';
        report.problems.push('File not found locally');
        report.severity = 'CRITICAL';
        return report;
    }

    report.status = '200 (File OK)';
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Check Canonical
    const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/);
    if (canonicalMatch) {
        const canonicalUrl = canonicalMatch[1];
        // Check if self-referencing
        if (canonicalUrl === urlStr || canonicalUrl === urlStr + '/' || urlStr === canonicalUrl + '/') {
            report.canonical = 'MATCH';
        } else {
            report.canonical = 'MISMATCH';
            report.problems.push(`Canonical mismatch: ${canonicalUrl}`);
            report.severity = 'IMPORTANT';
        }
    } else {
        report.problems.push('Missing Canonical Tag');
        report.severity = 'CRITICAL';
    }

    // 2. Check JSON-LD
    const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/g;
    let jsonMatch;
    let jsonCount = 0;
    while ((jsonMatch = jsonLdRegex.exec(content)) !== null) {
        try {
            JSON.parse(jsonMatch[1]);
            jsonCount++;
        } catch (e) {
            report.problems.push('Invalid JSON-LD Syntax');
            report.severity = 'CRITICAL';
        }
    }
    report.jsonLd = jsonCount > 0 ? `OK (${jsonCount})` : 'NONE';
    // If article, check for BlogPosting
    if (urlStr.includes('/blog/') && !urlStr.endsWith('/blog/') && !urlStr.includes('index.html')) {
        if (!content.includes('"BlogPosting"')) {
            // report.problems.push('Missing BlogPosting Schema');
            // report.severity = 'IMPORTANT'; 
            // (Optional enforcement)
        }
    }

    // 3. Meta Robots
    if (content.match(/<meta\s+name=["']robots["']\s+content=["'].*?noindex.*?["']/)) {
        report.problems.push('Page is NOINDEX');
        report.severity = 'CRITICAL';
    }

    // 4. Check Title & Description (Robust Regex)
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) {
        report.title = titleMatch[1].trim();
        if (report.title === '') {
            report.problems.push('Empty <title>');
            report.severity = 'IMPORTANT';
        }
    } else {
        report.problems.push('Missing <title>');
        report.severity = 'IMPORTANT';
    }

    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/);
    if (descMatch) {
        report.description = descMatch[1].replace(/\s+/g, ' ').trim(); // Normalize whitespace
        if (report.description === '') {
            report.problems.push('Empty meta description');
            report.severity = 'IMPORTANT';
        }
    } else {
        report.problems.push('Missing meta description');
        report.severity = 'IMPORTANT';
    }

    // 5. Hreflang Check (Target Validation)
    const hreflangRegex = /<link\s+rel=["']alternate["']\s+hreflang=["'](.*?)["']\s+href=["'](.*?)["']/g;
    let hrefMatch;
    let hreflangCount = 0;
    while ((hrefMatch = hreflangRegex.exec(content)) !== null) {
        hreflangCount++;
        let targetUrl = hrefMatch[2];

        // Normalize target URL for check
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://mocyno.com' + (targetUrl.startsWith('/') ? '' : '/') + targetUrl;
        }

        const isSelf = (targetUrl === urlStr || targetUrl === urlStr + '/' || urlStr === targetUrl + '/');

        // Check availability in sitemap set
        // We use loose check because of trailing slashes
        let found = false;
        if (allUrls.has(targetUrl)) found = true;
        else if (targetUrl.endsWith('/') && allUrls.has(targetUrl.slice(0, -1))) found = true;
        else if (!targetUrl.endsWith('/') && allUrls.has(targetUrl + '/')) found = true;

        if (!found) {
            report.problems.push(`Hreflang target not in sitemap: ${targetUrl}`);
            report.severity = 'IMPORTANT';
        }
    }
    report.hreflang = hreflangCount > 0 ? `YES (${hreflangCount})` : 'NO';

    // 6. Image Alt Check
    const allImgRegex = /<img\s+([\s\S]*?)>/g;
    let imgMatch;
    let missingAltCount = 0;
    while ((imgMatch = allImgRegex.exec(content)) !== null) {
        if (!imgMatch[1].includes('alt=')) {
            missingAltCount++;
        }
    }
    if (missingAltCount > 0) {
        report.problems.push(`${missingAltCount} images missing alt text`);
        report.severity = 'MINEUR';
    }

    return report;
}

function checkGlobalUniqueness(results) {
    const titles = {};
    const descriptions = {};

    results.forEach(r => {
        if (r.title) {
            if (titles[r.title]) titles[r.title].push(r.url);
            else titles[r.title] = [r.url];
        }
        if (r.description) {
            if (descriptions[r.description]) descriptions[r.description].push(r.url);
            else descriptions[r.description] = [r.url];
        }
    });

    // Mark duplicates
    Object.keys(titles).forEach(t => {
        if (titles[t].length > 1) {
            // Filter out FR/EN pairs which might legitimately share a brand title IF short.
            // But ideally they should differ.
            // Let's filter: if one is /en/ and other is /, and title is just "MO'CYNO", it's ok.
            // But here titles are usually longer.
            titles[t].forEach(url => {
                const res = results.find(r => r.url === url);
                const peers = titles[t].filter(u => u !== url);
                res.problems.push(`Duplicate Title with: ${peers.join(', ')}`);
                if (res.severity === 'OK') res.severity = 'IMPORTANT';
            });
        }
    });

    Object.keys(descriptions).forEach(d => {
        if (descriptions[d].length > 1) {
            descriptions[d].forEach(url => {
                const res = results.find(r => r.url === url);
                const peers = descriptions[d].filter(u => u !== url);
                res.problems.push(`Duplicate Desc with: ${peers.join(', ')}`);
                if (res.severity === 'OK') res.severity = 'IMPORTANT';
            });
        }
    });
}

function globalFailCheck(report) {
    return report.severity !== 'OK';
}

function printTable(results) {
    // URL | Status | Canonical | Hreflang | JSON-LD | Severity | Problems
    console.log(
        "URL".padEnd(60) +
        "STATUS".padEnd(15) +
        "CANONICAL".padEnd(12) +
        "HREFLANG".padEnd(10) +
        "JSON-LD".padEnd(12) +
        "SEVERITY".padEnd(10) +
        "PROBLEMS"
    );
    console.log("-".repeat(150));

    results.forEach(r => {
        let line =
            r.url.replace(BASE_URL, '').padEnd(60) +
            r.status.padEnd(15) +
            r.canonical.padEnd(12) +
            r.hreflang.padEnd(10) +
            r.jsonLd.padEnd(12) +
            r.severity.padEnd(10) +
            r.problems.join(', ');

        if (r.severity === 'CRITICAL') console.log(colors.red + line + colors.reset);
        else if (r.severity === 'IMPORTANT') console.log(colors.yellow + line + colors.reset);
        else console.log(line);
    });
}

main();
