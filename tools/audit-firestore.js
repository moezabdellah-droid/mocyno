const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const isStrict = process.argv.includes('--strict');
const contractPath = path.join(__dirname, 'contract.config.json');
let contract = null;
if (fs.existsSync(contractPath)) {
    contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
} else {
    console.warn("WARNING: contract.config.json not found.");
}

const expectedProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    contract?.projectInfo?.projectId ||
    'mocyno';

let serviceAccountConfig = null;

if (isStrict) {
    if (!process.env.FIREBASE_PROJECT_ID) {
        console.error("ERROR: In --strict mode, FIREBASE_PROJECT_ID must be set.");
        process.exit(4);
    }

    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credsPath || !fs.existsSync(credsPath)) {
        console.error("ERROR: In --strict mode, GOOGLE_APPLICATION_CREDENTIALS must point to a valid JSON file.");
        process.exit(4);
    }

    try {
        serviceAccountConfig = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    } catch (e) {
        console.error("ERROR: Could not parse GOOGLE_APPLICATION_CREDENTIALS JSON.", e);
        process.exit(4);
    }

    if (serviceAccountConfig.project_id && serviceAccountConfig.project_id !== expectedProjectId) {
        console.error(`ERROR: Service account projectId '${serviceAccountConfig.project_id}' does not match expected '${expectedProjectId}'`);
        process.exit(4);
    }
}

if (!admin.apps.length) {
    if (isStrict && serviceAccountConfig) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountConfig),
            projectId: expectedProjectId,
        });
        console.log(`[AUTH] SA: ${serviceAccountConfig.client_email} | expectedProjectId=${expectedProjectId}`);
    } else {
        console.warn('[WARN] NON-STRICT mode: no explicit credentials loaded; results may be unreliable.');
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: expectedProjectId,
        });
    }

    const usedProject = admin.app().options.projectId;
    console.log(`[AUTH] admin.app().options.projectId=${usedProject}`);
    if (isStrict && usedProject !== expectedProjectId) {
        console.error(`ERROR: Runtime projectId mismatch: used='${usedProject}' expected='${expectedProjectId}'`);
        process.exit(4);
    }
}

const db = admin.firestore();

function getParisDateString(date) {
    return new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

function diffMinutes(start, end) {
    if (!start || !end) return 0;
    return Math.round((end.getTime() - start.getTime()) / 60000);
}

async function runAudit() {
    const report = {
        meta: {
            generatedAt: new Date().toISOString(),
            timezone: "Europe/Paris",
            projectId: "mocyno",
            environment: "production",
            toolVersion: "audit-firestore@0.1.0",
            buildId: process.env.BUILD_ID || "unknown"
        },
        counts: {
            clients: 0, sites: 0, agents: 0, planning: 0,
            shifts: 0, stats_daily: 0, stats_monthly: 0, stats_meta: 0
        },
        distributions: {
            shifts: {
                dayKey: { min: null, max: null, top: [] },
                monthKey: { top: [] },
                specialty: { top: [] },
                status: { top: [] }
            }
        },
        types: {
            shifts: {
                startTimestamp: { Timestamp: 0, string: 0, missing: 0 },
                endTimestamp: { Timestamp: 0, string: 0, missing: 0 },
                durationMinutesPlanned: { number: 0, string: 0, missing: 0 },
                dayKey: { string: 0, missing: 0 }
            },
            planning: {
                agentAssignments: { array: 0, missing: 0 }
            }
        },
        invariants: [],
        violations: { critical: [], high: [], medium: [], low: [] },
        recommendations: [
            {
                priority: "P0",
                title: "Rebuild shifts from planning (idempotent) and rebuild rollups",
                why: "Shifts are SoT for dashboard; rollups missing/incorrect causes zeros",
                actions: [
                    "Run tools/rebuild-shifts-from-planning.js",
                    "Run tools/rebuild-rollups-from-shifts.js"
                ]
            }
        ],
        samples: { shifts: [], planning: [] }
    };

    console.log("Loading collections...");
    const collectionsToCount = ['clients', 'sites', 'agents', 'planning', 'shifts', 'stats_daily', 'stats_monthly', 'stats_meta'];
    const dataCache = {};
    for (const col of collectionsToCount) {
        const snap = await db.collection(col).get();
        report.counts[col] = snap.size;
        dataCache[col] = {};
        snap.forEach(doc => {
            dataCache[col][doc.id] = doc.data();
        });
        console.log(`- ${col}: ${snap.size} docs`);
    }

    const { clients, sites, agents, planning, shifts } = dataCache;

    const distDayKey = {};
    const distMonthKey = {};
    const distSpecialty = {};
    const distStatus = {};
    let minDayKey = "9999-12-31";
    let maxDayKey = "0000-00-00";

    const invStartBeforeEnd = { checked: 0, passed: 0, failed: 0, examplesFailed: [] };
    const invDurationMatch = { checked: 0, passed: 0, failed: 0, examplesFailed: [] };
    const invDayKeyMatch = { checked: 0, passed: 0, failed: 0, examplesFailed: [] };
    const invClientExists = { checked: 0, passed: 0, failed: 0, examplesFailed: [] };
    const invSiteExists = { checked: 0, passed: 0, failed: 0, examplesFailed: [] };
    const invAgentExistsOrNull = { checked: 0, passed: 0, failed: 0, examplesFailed: [] };

    let shiftsSampleCount = 0;
    for (const [docId, s] of Object.entries(shifts)) {
        if (shiftsSampleCount < 5) {
            report.samples.shifts.push({
                docId,
                dayKey: s.dayKey,
                planningId: s.planningId,
                siteId: s.siteId,
                clientId: s.clientId,
                agentId: s.agentId,
                specialty: s.specialty,
                status: s.status,
                startTimestampType: s.startTimestamp?.constructor?.name || typeof s.startTimestamp,
                endTimestampType: s.endTimestamp?.constructor?.name || typeof s.endTimestamp,
                durationMinutesPlanned: s.durationMinutesPlanned
            });
            shiftsSampleCount++;
        }

        if (s.dayKey) {
            distDayKey[s.dayKey] = (distDayKey[s.dayKey] || 0) + 1;
            if (s.dayKey < minDayKey) minDayKey = s.dayKey;
            if (s.dayKey > maxDayKey) maxDayKey = s.dayKey;

            const mKey = s.dayKey.slice(0, 7);
            distMonthKey[mKey] = (distMonthKey[mKey] || 0) + 1;
        }
        if (s.specialty) distSpecialty[s.specialty] = (distSpecialty[s.specialty] || 0) + 1;
        if (s.status) distStatus[s.status] = (distStatus[s.status] || 0) + 1;

        const stType = s.startTimestamp?.constructor?.name || (s.startTimestamp ? typeof s.startTimestamp : "missing");
        if (!report.types.shifts.startTimestamp[stType]) report.types.shifts.startTimestamp[stType] = 0;
        report.types.shifts.startTimestamp[stType]++;

        const enType = s.endTimestamp?.constructor?.name || (s.endTimestamp ? typeof s.endTimestamp : "missing");
        if (!report.types.shifts.endTimestamp[enType]) report.types.shifts.endTimestamp[enType] = 0;
        report.types.shifts.endTimestamp[enType]++;

        const duType = s.durationMinutesPlanned !== undefined ? typeof s.durationMinutesPlanned : "missing";
        if (!report.types.shifts.durationMinutesPlanned[duType]) report.types.shifts.durationMinutesPlanned[duType] = 0;
        report.types.shifts.durationMinutesPlanned[duType]++;

        const dkType = s.dayKey !== undefined ? typeof s.dayKey : "missing";
        if (!report.types.shifts.dayKey[dkType]) report.types.shifts.dayKey[dkType] = 0;
        report.types.shifts.dayKey[dkType]++;

        invStartBeforeEnd.checked++;
        if (s.startTimestamp && s.endTimestamp && s.startTimestamp.toDate && s.endTimestamp.toDate) {
            if (s.startTimestamp.toDate() < s.endTimestamp.toDate()) {
                invStartBeforeEnd.passed++;
            } else {
                invStartBeforeEnd.failed++;
                if (invStartBeforeEnd.examplesFailed.length < 5) {
                    invStartBeforeEnd.examplesFailed.push({ docId, path: `shifts/${docId}`, reason: "start>=end" });
                }
            }
        } else {
            invStartBeforeEnd.failed++;
            if (invStartBeforeEnd.examplesFailed.length < 5) {
                invStartBeforeEnd.examplesFailed.push({ docId, path: `shifts/${docId}`, reason: "missing start/end Timestamp" });
            }
        }

        invDurationMatch.checked++;
        if (s.startTimestamp && s.endTimestamp && s.startTimestamp.toDate && s.endTimestamp.toDate && typeof s.durationMinutesPlanned === 'number') {
            const diff = diffMinutes(s.startTimestamp.toDate(), s.endTimestamp.toDate());
            if (s.durationMinutesPlanned === diff) {
                invDurationMatch.passed++;
            } else {
                invDurationMatch.failed++;
                if (invDurationMatch.examplesFailed.length < 5) {
                    invDurationMatch.examplesFailed.push({
                        docId, path: `shifts/${docId}`, reason: `expected ${s.durationMinutesPlanned} got ${diff}`,
                        computed: { diffMinutes: diff, durationMinutesPlanned: s.durationMinutesPlanned }
                    });
                }
            }
        } else {
            invDurationMatch.failed++;
            if (invDurationMatch.examplesFailed.length < 5) {
                invDurationMatch.examplesFailed.push({ docId, path: `shifts/${docId}`, reason: "missing field or wrong type" });
            }
        }

        invDayKeyMatch.checked++;
        if (s.dayKey && s.startTimestamp && s.startTimestamp.toDate) {
            const expected = getParisDateString(s.startTimestamp.toDate());
            if (s.dayKey === expected) {
                invDayKeyMatch.passed++;
            } else {
                invDayKeyMatch.failed++;
                if (invDayKeyMatch.examplesFailed.length < 5) {
                    invDayKeyMatch.examplesFailed.push({
                        docId, path: `shifts/${docId}`, reason: "dayKey mismatch",
                        computed: { expectedDayKey: expected, actualDayKey: s.dayKey }
                    });
                }
            }
        } else {
            invDayKeyMatch.failed++;
            if (invDayKeyMatch.examplesFailed.length < 5) {
                invDayKeyMatch.examplesFailed.push({ docId, path: `shifts/${docId}`, reason: "missing dayKey or startTimestamp" });
            }
        }

        invClientExists.checked++;
        if (s.clientId && clients[s.clientId]) {
            invClientExists.passed++;
        } else {
            invClientExists.failed++;
            if (invClientExists.examplesFailed.length < 5) {
                invClientExists.examplesFailed.push({ docId, path: `shifts/${docId}`, reason: "missing clientId or client doc not found", clientId: s.clientId || null });
            }
        }

        // SHIFT_SITE_EXISTS
        invSiteExists.checked++;
        if (s.siteId && sites[s.siteId]) {
            invSiteExists.passed++;
        } else {
            invSiteExists.failed++;
            if (invSiteExists.examplesFailed.length < 5) {
                invSiteExists.examplesFailed.push({ docId, path: `shifts/${docId}`, reason: "missing siteId or site doc not found", siteId: s.siteId || null });
            }
        }

        // SHIFT_AGENT_EXISTS_OR_NULL
        invAgentExistsOrNull.checked++;
        if (!s.agentId || agents[s.agentId]) {
            invAgentExistsOrNull.passed++;
        } else {
            invAgentExistsOrNull.failed++;
            if (invAgentExistsOrNull.examplesFailed.length < 5) {
                invAgentExistsOrNull.examplesFailed.push({ docId, path: `shifts/${docId}`, reason: "agentId set but agent doc not found", agentId: s.agentId });
            }
        }

        if (s.billingClientId) {
            report.violations.critical.push({ collection: "shifts", docId, path: `shifts/${docId}`, code: "FORBIDDEN_FIELD_PRESENT", field: "billingClientId" });
        }

        if (contract && contract.forbiddenFields) {
            for (const field of contract.forbiddenFields) {
                if (s[field] !== undefined) {
                    report.violations.critical.push({ collection: "shifts", docId, path: `shifts/${docId}`, code: "FORBIDDEN_FIELD_PRESENT", field });
                }
            }
        }
    }

    let planningSampleCount = 0;
    for (const [docId, p] of Object.entries(planning)) {
        if (planningSampleCount < 5) {
            report.samples.planning.push({
                docId, siteId: p.siteId, clientId: p.clientId, status: p.status,
                agentAssignmentsCount: p.agentAssignments ? p.agentAssignments.length : 0,
                vacationsCount: p.agentAssignments ? p.agentAssignments.reduce((acc, a) => acc + (a.vacations ? a.vacations.length : 0), 0) : 0
            });
            planningSampleCount++;
        }

        const aaType = Array.isArray(p.agentAssignments) ? "array" : (p.agentAssignments ? typeof p.agentAssignments : "missing");
        if (!report.types.planning.agentAssignments[aaType]) report.types.planning.agentAssignments[aaType] = 0;
        report.types.planning.agentAssignments[aaType]++;

        if (p.billingClientId) {
            report.violations.critical.push({ collection: "planning", docId, path: `planning/${docId}`, code: "FORBIDDEN_FIELD_PRESENT", field: "billingClientId" });
        }

        if (contract && contract.forbiddenFields) {
            for (const field of contract.forbiddenFields) {
                if (p[field] !== undefined) {
                    report.violations.critical.push({ collection: "planning", docId, path: `planning/${docId}`, code: "FORBIDDEN_FIELD_PRESENT", field });
                }
            }
        }
    }

    const invSiteClients = { checked: 0, passed: 0, failed: 0, examplesFailed: [] };
    for (const [docId, st] of Object.entries(sites)) {
        // Sites sans clientIds = non encore assignés, on ne les vérifie pas (skip)
        if (!Array.isArray(st.clientIds)) {
            // Si le site a un primaryClientId mais pas de clientIds => anomalie
            if (st.primaryClientId) {
                invSiteClients.checked++;
                invSiteClients.failed++;
                if (invSiteClients.examplesFailed.length < 5) {
                    invSiteClients.examplesFailed.push({ docId, path: `sites/${docId}`, reason: "primaryClientId set but clientIds missing", clientId: st.primaryClientId });
                }
            }
            // Sinon: site libre sans client = OK, on skip
            continue;
        }

        invSiteClients.checked++;
        let valid = true;
        let reason = "";
        let badId = null;

        for (const cid of st.clientIds) {
            if (!clients[cid]) {
                valid = false;
                reason = "clientIds contains non-existing clientId";
                badId = cid;
                break;
            }
        }
        if (valid && st.primaryClientId && !st.clientIds.includes(st.primaryClientId)) {
            valid = false;
            reason = "clientIds does not include primaryClientId";
            badId = st.primaryClientId;
        }

        if (valid) {
            invSiteClients.passed++;
        } else {
            invSiteClients.failed++;
            if (invSiteClients.examplesFailed.length < 5) {
                invSiteClients.examplesFailed.push({ docId, path: `sites/${docId}`, reason, clientId: badId });
            }
        }
    }

    const toSortMap = (obj) => Object.entries(obj).map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count).slice(0, 10);

    report.distributions.shifts.dayKey.min = minDayKey === "9999-12-31" ? null : minDayKey;
    report.distributions.shifts.dayKey.max = maxDayKey === "0000-00-00" ? null : maxDayKey;
    report.distributions.shifts.dayKey.top = toSortMap(distDayKey);
    report.distributions.shifts.monthKey.top = toSortMap(distMonthKey);
    report.distributions.shifts.specialty.top = toSortMap(distSpecialty);
    report.distributions.shifts.status.top = toSortMap(distStatus);

    const makeInvResult = (id, collection, severity, desc, invData) => ({
        id, collection, severity, description: desc,
        result: {
            checked: invData.checked, passed: invData.passed, failed: invData.failed,
            passRate: invData.checked ? invData.passed / invData.checked : 0
        },
        examplesFailed: invData.examplesFailed
    });

    report.invariants.push(makeInvResult("SHIFT_START_BEFORE_END", "shifts", "critical", "startTimestamp < endTimestamp", invStartBeforeEnd));
    report.invariants.push(makeInvResult("SHIFT_DURATION_MATCH", "shifts", "critical", "durationMinutesPlanned == diffMinutes(end-start)", invDurationMatch));
    report.invariants.push(makeInvResult("SHIFT_DAYKEY_MATCH_PARIS", "shifts", "high", "dayKey equals Paris date(startTimestamp)", invDayKeyMatch));
    report.invariants.push(makeInvResult("SHIFT_CLIENT_EXISTS", "shifts", "critical", "clientId exists in clients", invClientExists));
    report.invariants.push(makeInvResult("SHIFT_SITE_EXISTS", "shifts", "critical", "siteId exists in sites", invSiteExists));
    report.invariants.push(makeInvResult("SHIFT_AGENT_EXISTS_OR_NULL", "shifts", "critical", "agentId is null or exists in agents", invAgentExistsOrNull));
    report.invariants.push(makeInvResult("SITE_CLIENTIDS_VALID", "sites", "critical", "clientIds contains only existing clientIds and includes primaryClientId", invSiteClients));

    fs.writeFileSync('audit_report.json', JSON.stringify(report, null, 2));

    let md = `# Audit Report - ${report.meta.generatedAt}\n\n`;
    md += `## Pass Rates\n`;
    report.invariants.forEach(i => {
        md += `- **${i.id}**: ${(i.result.passRate * 100).toFixed(1)}% (${i.result.passed}/${i.result.checked})\n`;
    });
    md += `\n## Collections Counts\n`;
    Object.entries(report.counts).forEach(([k, v]) => {
        md += `- ${k}: ${v}\n`;
    });
    md += `\n## Violations\n`;
    md += `- Critical: ${report.violations.critical.length}\n`;

    fs.writeFileSync('audit_report.md', md);
    console.log("Audit complete. Reports generated: audit_report.json, audit_report.md");

    if (isStrict) {
        console.log("--- STRICT MODE CHECKS ---");
        let fail = false;

        // 1. Verify project (Already checked during initialization, but double check)
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== expectedProjectId) {
            console.error(`ERROR: Unexpected projectId: ${process.env.FIREBASE_PROJECT_ID}. Expected: ${expectedProjectId}`);
            process.exit(4);
        }

        // 1.5 Firestore read ping (strong)
        try {
            console.log("Pinging Firestore...");
            const metaSnap = await db.collection('stats_meta').doc('current').get();
            if (!metaSnap.exists) {
                console.error("ERROR: stats_meta/current is missing.");
                process.exit(4);
            }
            const meta = metaSnap.data() || {};
            if (!meta.latestDayKey || !meta.latestMonthKey) {
                console.error("ERROR: stats_meta/current missing latestDayKey/latestMonthKey.");
                process.exit(4);
            }
            console.log("Firestore ping OK. meta:", { latestDayKey: meta.latestDayKey, latestMonthKey: meta.latestMonthKey });
        } catch (e) {
            console.error("ERROR: Firestore ping failed.", e);
            process.exit(4);
        }

        // 2. Critical violations (forbidden fields)
        if (report.violations.critical.length > (contract?.thresholds?.forbiddenFieldsAllowed || 0)) {
            console.error(`ERROR: Found ${report.violations.critical.length} critical violations (forbidden fields).`);
            console.error(JSON.stringify(report.violations.critical.slice(0, 5), null, 2));
            process.exit(3);
        }

        // Shifts array empty check
        if (report.counts?.shifts <= 0) {
            console.error("ERROR: No shifts found in database. Cannot meaningfully validate.");
            process.exit(2);
        }

        // 3. Invariants critical rate + coverage + non-empty
        if (contract?.invariantsCritical) {
            const requiredRate = contract.thresholds?.shiftsCriticalPassRate ?? 1.0;

            const required = new Set();
            for (const arr of Object.values(contract.invariantsCritical)) {
                if (Array.isArray(arr)) arr.forEach(x => required.add(x));
            }
            const present = new Set((report.invariants || []).map(i => i.id));

            // 3a. Coverage check
            for (const id of required) {
                if (!present.has(id)) {
                    console.error(`ERROR: Missing required invariant in report: ${id}`);
                    fail = true;
                }
            }

            // 3b. Rate + checked>0
            for (const inv of (report.invariants || [])) {
                if (!required.has(inv.id)) continue;

                const checked = Number(inv.result?.checked ?? 0);
                const passRate = Number(inv.result?.passRate ?? 0);

                if (!Number.isFinite(checked) || checked <= 0) {
                    console.error(`ERROR: Invariant ${inv.id} has checked=0 (no data evaluated).`);
                    fail = true;
                    continue;
                }
                if (!Number.isFinite(passRate) || passRate < requiredRate) {
                    console.error(`ERROR: Invariant ${inv.id} pass rate is ${passRate}, required is ${requiredRate}`);
                    fail = true;
                }
            }
        }

        if (fail) process.exit(2);
        console.log("SUCCESS: All strict mode checks passed.");
    }
}

runAudit().catch(console.error);
