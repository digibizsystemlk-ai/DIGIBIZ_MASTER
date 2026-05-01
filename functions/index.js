/**
 * Nightly interest accrual for all active interest loans (Asia/Colombo calendar).
 * Deploy: cd functions && npm install && firebase deploy --only functions
 */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

admin.initializeApp({
    databaseURL: "https://digibiz-sys-default-rtdb.firebaseio.com/",
});
const db = admin.firestore();
const REG_NOTIFY_TO = "digibizsystemlk@gmail.com";
const SUPER_ADMIN_UIDS = (process.env.SUPER_ADMIN_UIDS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

let rtdb = null;
try {
    rtdb = admin.database();
} catch (e) {
    logger.warn("Realtime Database not available for SMS gateway mirror", e && e.message);
}

/** When false: never queue investor portfolio accrual SMS (Firestore investorPhone is ignored). Set true and redeploy to re-enable. */
const INVESTOR_OUTBOUND_SMS_ENABLED = false;

function registrationNotifierTransport() {
    const host = String(
        process.env.DIGIBIZ_NOTIFY_SMTP_HOST ||
        process.env.DIGIBIZ_NOTIFY_SMTP_HOST_RUNTIME ||
        ""
    ).trim();
    const port = Number(process.env.DIGIBIZ_NOTIFY_SMTP_PORT || 587);
    const user = String(process.env.DIGIBIZ_NOTIFY_EMAIL_USER || "").trim();
    const pass = String(process.env.DIGIBIZ_NOTIFY_EMAIL_PASS || "").trim();
    const secureRaw = String(process.env.DIGIBIZ_NOTIFY_SMTP_SECURE || "false").trim().toLowerCase();
    const secure = secureRaw === "true";
    logger.info("SMTP Config loaded", {
        host: host || "(missing)",
        port,
        user: user || "(missing)",
        secure,
        passSet: !!pass,
    });
    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    });
}

exports.sendNewUserNotification = onCall(
    {
        timeoutSeconds: 60,
        memory: "256MiB",
    },
    async (request) => {
        const data = request.data || {};
        const userEmail = String(data.userEmail || "").trim().toLowerCase();
        const userId = String(data.userId || "").trim();
        const timestampRaw = data.timestamp;
        const assignedBusiness = String(data.assignedBusiness || "Demo Business (DEFAULT_TEST_BUSINESS)");
        if (!userEmail || !userId) {
            throw new HttpsError("invalid-argument", "userEmail and userId are required.");
        }

        const transporter = registrationNotifierTransport();
        if (!transporter) {
            logger.warn("sendNewUserNotification skipped: SMTP env not configured");
            return { success: false, skipped: true, reason: "SMTP not configured" };
        }

        const ts = timestampRaw ? new Date(timestampRaw) : new Date();
        const timestampText = Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString();
        const subject = "New User Registration - DIGIBIZ";
        const text = [
            "New user registered on DIGIBIZ system.",
            "",
            "Registration Details:",
            `- Email: ${userEmail}`,
            `- Registration Time: ${timestampText}`,
            `- Assigned Business: ${assignedBusiness}`,
            `- User ID: ${userId}`,
            "",
            "Please log in to Super Dashboard to review and assign appropriate business if needed.",
            "",
            "DIGIBIZ System",
        ].join("\n");

        await transporter.sendMail({
            from: String(process.env.DIGIBIZ_NOTIFY_EMAIL_FROM || process.env.DIGIBIZ_NOTIFY_EMAIL_USER || "").trim(),
            to: REG_NOTIFY_TO,
            subject,
            text,
        });
        logger.info("sendNewUserNotification sent", { userEmail, userId, to: REG_NOTIFY_TO });
        return { success: true };
    }
);

function colomboDateKey(d) {
    const x = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(x);
}

function colomboCalendarDaysBetween(lastIso, now) {
    const lastKey = colomboDateKey(new Date(lastIso));
    const todayKey = colomboDateKey(now);
    const [y1, m1, d1] = lastKey.split("-").map(Number);
    const [y2, m2, d2] = todayKey.split("-").map(Number);
    const t1 = Date.UTC(y1, m1 - 1, d1);
    const t2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((t2 - t1) / 86400000);
}

async function queueSms(businessId, mobile, message, createdBy = "cloudfunctions.dailyInterestLoanAccrualColombo") {
    const normalized = String(mobile || "").replace(/\s/g, "");
    if (!normalized) {
        return;
    }
    const id = `loan_cf_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const payload = {
        businessId,
        mobile: normalized,
        message,
        status: "pending",
        createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("pending_sms").doc(id).set({
        ...payload,
    });
    if (rtdb) {
        await rtdb.ref(`sms_gateway/${businessId}/pending_sms/${id}`).set({
            ...payload,
            createdAt: Date.now(),
        });
    }
}

exports.dailyInterestLoanAccrualColombo = onSchedule(
    {
        schedule: "25 0 * * *",
        timeZone: "Asia/Colombo",
        memory: "512MiB",
        timeoutSeconds: 540,
    },
    async () => {
        const now = new Date();
        const todayKey = colomboDateKey(now);
        const snap = await db.collection("loan_interest_entries").where("active", "==", true).get();
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const doc of snap.docs) {
            try {
                const row = doc.data() || {};
                if (String(row.interestDailyColomboKey || "") === todayKey) {
                    skipped += 1;
                    continue;
                }
                const principal = Number(row.principalOutstanding || 0);
                if (principal <= 0.0001) continue;

                const lastRaw =
                    row.lastInterestCalcAt ||
                    (row.createdAt && typeof row.createdAt.toDate === "function"
                        ? row.createdAt.toDate().toISOString()
                        : new Date().toISOString());

                const diffDays = colomboCalendarDaysBetween(lastRaw, now);
                if (diffDays < 1) continue;

                const rate = Number(row.rateMonthly) || 10;
                const dailyRate = rate / 30 / 100;
                const addInterest = principal * dailyRate * diffDays;
                if (addInterest <= 0.00001) continue;

                const prevInt = Number(row.interestOutstanding || 0);
                const nextInt = prevInt + addInterest;
                const businessId = String(row.businessId || "");
                if (!businessId) continue;

                const nowIso = now.toISOString();
                await doc.ref.set(
                    {
                        interestOutstanding: nextInt,
                        lastInterestCalcAt: nowIso,
                        interestDailyColomboKey: todayKey,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );

                const name = row.customerName || "customer";
                const mobile = String(
                    row.customerMobile || row.mobile || row.phone || row.phoneNumber || ""
                ).trim();
                const msg = `Dear ${name}, daily interest added Rs.${addInterest.toFixed(2)} (${diffDays} day(s) at ${rate}%/mo). Total interest Rs.${nextInt.toFixed(2)}. Total due Rs.${(principal + nextInt).toFixed(2)}.`;
                if (mobile) {
                    await queueSms(businessId, mobile, msg);
                }
                updated += 1;
            } catch (e) {
                errors += 1;
                logger.error("dailyInterestLoanAccrualColombo doc failed", doc.id, e);
            }
        }

        logger.info(
            `dailyInterestLoanAccrualColombo: scanned=${snap.docs.length} updated=${updated} skippedAlreadyToday=${skipped} errors=${errors}`
        );
    }
);

exports.dailyInvestorPortfolioAccrualColombo = onSchedule(
    {
        schedule: "35 0 * * *",
        timeZone: "Asia/Colombo",
        memory: "512MiB",
        timeoutSeconds: 300,
    },
    async () => {
        const now = new Date();
        const todayKey = colomboDateKey(now);
        const cfgSnap = await db.collection("investor_portfolio_config").get();
        let appended = 0;
        let skipped = 0;
        let errors = 0;

        for (const cfgDoc of cfgSnap.docs) {
            try {
                const businessId = cfgDoc.id;
                const cfg = cfgDoc.data() || {};
                const phone = String(cfg.investorPhone || "").replace(/\s/g, "");
                const ratePct = Number(cfg.dailyCapitalRatePercent || 8);
                const dailyDecimal = ratePct / 100;

                const ledSnap = await db
                    .collection("investor_capital_ledger")
                    .where("businessId", "==", businessId)
                    .orderBy("createdAt", "desc")
                    .limit(1)
                    .get();
                if (ledSnap.empty) {
                    skipped += 1;
                    continue;
                }
                const lastRow = ledSnap.docs[0].data() || {};
                const capBal = Number(lastRow.capitalBalance || 0);
                if (capBal <= 0.0001) {
                    skipped += 1;
                    continue;
                }

                const lastAccrualRaw =
                    cfg.lastPortfolioAccrualAt ||
                    (lastRow.createdAt && typeof lastRow.createdAt.toDate === "function"
                        ? lastRow.createdAt.toDate().toISOString()
                        : new Date().toISOString());
                const diffDays = colomboCalendarDaysBetween(lastAccrualRaw, now);
                if (diffDays < 1) {
                    skipped += 1;
                    continue;
                }

                const interestAdd = capBal * dailyDecimal * diffDays;
                if (interestAdd <= 0.00001) {
                    skipped += 1;
                    continue;
                }

                const prevInt = Number(lastRow.interestBalance || 0);
                const nextIntBal = prevInt + interestAdd;

                await db.collection("investor_capital_ledger").add({
                    businessId,
                    entryDate: todayKey,
                    description: `Daily interest on capital (${ratePct}%/day × ${diffDays} day(s))`,
                    capitalChange: 0,
                    interestChange: interestAdd,
                    capitalBalance: capBal,
                    interestBalance: nextIntBal,
                    notes: "",
                    source: "DAILY_ACCRUAL_CF",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                await cfgDoc.ref.set(
                    {
                        lastPortfolioAccrualAt: now.toISOString(),
                        lastPortfolioAccrualColomboKey: todayKey,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );

                if (INVESTOR_OUTBOUND_SMS_ENABLED && phone) {
                    const msg = `Investor ledger: daily interest on capital Rs.${interestAdd.toFixed(
                        2
                    )} (${diffDays} day(s) at ${ratePct}%/day). Interest balance Rs.${nextIntBal.toFixed(
                        2
                    )}. Capital balance Rs.${capBal.toFixed(2)}.`;
                    await queueSms(businessId, phone, msg, "cloudfunctions.dailyInvestorPortfolioAccrualColombo");
                }
                appended += 1;
            } catch (e) {
                errors += 1;
                logger.error("dailyInvestorPortfolioAccrualColombo doc failed", cfgDoc.id, e);
            }
        }

        logger.info(
            `dailyInvestorPortfolioAccrualColombo: configs=${cfgSnap.docs.length} appended=${appended} skipped=${skipped} errors=${errors}`
        );
    }
);

exports.adminResetPassword = onCall(async (request) => {
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const callerUid = String(request.auth.uid || "");
    if (!SUPER_ADMIN_UIDS.includes(callerUid)) {
        throw new HttpsError("permission-denied", "Only Super Admin can reset passwords.");
    }
    const email = String((request.data && request.data.email) || "").trim().toLowerCase();
    const newPassword = String((request.data && request.data.newPassword) || "");
    if (!email) {
        throw new HttpsError("invalid-argument", "Email is required.");
    }
    if (newPassword.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }
    const targetUser = await admin.auth().getUserByEmail(email).catch((e) => {
        logger.error("adminResetPassword getUserByEmail failed", { email, error: e && e.message });
        throw new HttpsError("not-found", "Target user not found.");
    });
    await admin.auth().updateUser(targetUser.uid, { password: newPassword }).catch((e) => {
        logger.error("adminResetPassword updateUser failed", { uid: targetUser.uid, error: e && e.message });
        throw new HttpsError("internal", "Password reset failed.");
    });
    return { success: true, message: "Password reset successful" };
});

function testLabelToGrepToken(label) {
    const x = String(label || "").trim().toLowerCase();
    const map = {
        "grn": "GRN flow",
        "grn-flow": "GRN flow",
        "grnflow": "GRN flow",
        "stock-transfer": "stock transfer",
        "stocktransfer": "stock transfer",
        "order-with-lorry": "order with lorry",
        "orderwithlorry": "order with lorry",
        "cheque-management": "cheque management",
        "chequemanagement": "cheque management",
        "accounting-dashboard": "accounting dashboard",
        "accountingdashboard": "accounting dashboard",
        "grnflow_ui": "GRN flow",
        "stocktransfer_ui": "stock transfer",
        "orderwithlorry_ui": "order with lorry",
        "chequemanagement_ui": "cheque management",
        "accountingdashboard_ui": "accounting dashboard",
        "grnflow": "GRN flow",
        "stocktransfer": "stock transfer",
        "orderwithlorry": "order with lorry",
        "chequemanagement": "cheque management",
        "accountingdashboard": "accounting dashboard",
        "grn flow": "GRN flow",
        "stock transfer": "stock transfer",
        "order with lorry": "order with lorry",
        "cheque management": "cheque management",
        "accounting dashboard": "accounting dashboard",
    };
    // Handle UI keys from super-dashboard panel.
    if (x === "grnflow") return "GRN flow";
    if (x === "stocktransfer") return "stock transfer";
    if (x === "orderwithlorry") return "order with lorry";
    if (x === "chequemanagement") return "cheque management";
    if (x === "accountingdashboard") return "accounting dashboard";
    return map[x] || "";
}

async function assertSuperAdmin(request) {
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const callerUid = String(request.auth.uid || "");
    if (SUPER_ADMIN_UIDS.includes(callerUid)) return callerUid;
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const role = String((callerDoc.exists ? (callerDoc.data().role || "") : "")).toUpperCase();
    if (role !== "SUPER_ADMIN") {
        throw new HttpsError("permission-denied", "Only SUPER_ADMIN users can run E2E tests.");
    }
    return callerUid;
}

async function getMetadataAccessToken() {
    const r = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
        headers: { "Metadata-Flavor": "Google" },
    });
    if (!r.ok) {
        throw new Error(`metadata token request failed: ${r.status}`);
    }
    const data = await r.json();
    return String(data.access_token || "");
}

async function triggerCloudRunJobRun({
    projectId,
    region,
    jobName,
    runId,
    selectedTests,
    targetEmail,
    targetBusinessId,
    resultsBucket,
}) {
    const token = await getMetadataAccessToken();
    const url = `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/jobs/${jobName}:run`;
    const env = [
        { name: "RUN_ID", value: runId },
        { name: "E2E_SELECTED_TESTS", value: selectedTests.join(",") },
        { name: "E2E_TARGET_EMAIL", value: targetEmail || "" },
        { name: "E2E_TARGET_BUSINESS_ID", value: targetBusinessId || "" },
        { name: "E2E_BDK_EMAIL", value: targetEmail || "" },
        { name: "E2E_BDK_BUSINESS_ID", value: targetBusinessId || "" },
        { name: "E2E_RESULTS_BUCKET", value: resultsBucket },
    ];

    const body = {
        overrides: {
            containerOverrides: [
                {
                    env,
                },
            ],
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Cloud Run job trigger failed: ${res.status} ${msg}`);
    }
    return res.json();
}

exports.runE2ETests = onCall(
    {
        timeoutSeconds: 120,
        memory: "512MiB",
    },
    async (request) => {
        const callerUid = await assertSuperAdmin(request);

        const selectedTests = Array.isArray(request.data && request.data.selectedTests)
            ? request.data.selectedTests
            : [];
        const targetEmail = String((request.data && request.data.targetEmail) || "").trim();
        const targetBusinessId = String((request.data && request.data.targetBusinessId) || "").trim();
        if (!selectedTests.length) {
            throw new HttpsError("invalid-argument", "selectedTests must contain at least one item.");
        }
        if (!targetEmail && !targetBusinessId) {
            throw new HttpsError("invalid-argument", "targetEmail or targetBusinessId is required.");
        }

        const grepTokens = selectedTests
            .map((x) => testLabelToGrepToken(x))
            .filter(Boolean);
        if (!grepTokens.length) {
            throw new HttpsError("invalid-argument", "No valid test identifiers found in selectedTests.");
        }
        const projectId = String(process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "").trim();
        const region = String(process.env.E2E_RUN_REGION || "asia-south1").trim();
        const jobName = String(process.env.E2E_RUN_JOB_NAME || "digibiz-e2e-runner").trim();
        const resultsBucket = String(process.env.E2E_RESULTS_BUCKET || "").trim();
        if (!projectId) throw new HttpsError("failed-precondition", "Missing GCLOUD_PROJECT.");
        if (!resultsBucket) throw new HttpsError("failed-precondition", "Missing E2E_RESULTS_BUCKET env.");

        const runId = (crypto.randomUUID ? crypto.randomUUID() : `run_${Date.now()}`).replace(/-/g, "");
        const grepPattern = grepTokens.join("|");

        const op = await triggerCloudRunJobRun({
            projectId,
            region,
            jobName,
            runId,
            selectedTests: grepTokens,
            targetEmail,
            targetBusinessId,
            resultsBucket,
        });

        await db.collection("e2e_test_runs").doc(runId).set({
            runId,
            operationName: String((op && op.name) || ""),
            status: "queued",
            selectedTests: grepTokens,
            grepPattern,
            targetEmail,
            targetBusinessId,
            resultsBucket,
            triggeredBy: callerUid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        logger.info("runE2ETests finished", {
            callerUid,
            targetEmail,
            targetBusinessId,
            selectedTests: grepTokens,
            runId,
            operationName: op && op.name,
        });

        return {
            success: true,
            queued: true,
            runId,
            jobId: runId,
            operationName: op && op.name ? op.name : null,
            pollFunction: "getE2ETestRunResult",
        };
    }
);

exports.getE2ETestRunResult = onCall(
    {
        timeoutSeconds: 60,
        memory: "256MiB",
    },
    async (request) => {
        await assertSuperAdmin(request);
        const runId = String((request.data && request.data.runId) || "").trim();
        if (!runId) {
            throw new HttpsError("invalid-argument", "runId is required.");
        }

        const runRef = db.collection("e2e_test_runs").doc(runId);
        const runSnap = await runRef.get();
        const runData = runSnap.exists ? (runSnap.data() || {}) : {};
        const bucketName = String(runData.resultsBucket || process.env.E2E_RESULTS_BUCKET || "").trim();
        if (!bucketName) {
            throw new HttpsError("failed-precondition", "Missing results bucket.");
        }

        const resultFile = admin.storage().bucket(bucketName).file(`e2e-results/${runId}.json`);
        const logFile = admin.storage().bucket(bucketName).file(`e2e-results/${runId}.log`);
        const [exists] = await resultFile.exists();
        if (!exists) {
            return {
                success: false,
                runId,
                status: String(runData.status || "running"),
                ready: false,
                message: "Result file not available yet. Poll again.",
                operationName: runData.operationName || null,
            };
        }

        const [jsonBuf] = await resultFile.download();
        const [logExists] = await logFile.exists();
        let logs = "";
        if (logExists) {
            const [logBuf] = await logFile.download();
            logs = String(logBuf || "");
        }
        const parsed = JSON.parse(String(jsonBuf || "{}"));
        await runRef.set({
            status: parsed.success ? "passed" : "failed",
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            success: !!parsed.success,
            ready: true,
            runId,
            results: Array.isArray(parsed.results) ? parsed.results : [],
            durationMs: Number(parsed.durationMs || 0),
            logs,
        };
    }
);
