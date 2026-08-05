/**
 * Nightly interest accrual for all active interest loans (Asia/Colombo calendar).
 * Deploy: cd functions && npm install && firebase deploy --only functions
 */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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
const INVESTOR_OUTBOUND_SMS_ENABLED = true;

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

function normalizePhone(phone) {
    let ph = String(phone || "").replace(/[ -]/g, "");
    if (ph.length === 9) ph = `94${ph}`;
    if (ph.length === 10 && ph.startsWith("0")) ph = `94${ph.slice(1)}`;
    return ph;
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

    // Call REST API dynamically if API key is present
    try {
        const [settingsSnap, bizSnap, smsSettingsSnap] = await Promise.all([
            db.collection("settings").doc(businessId).get().catch(() => null),
            db.collection("businesses").doc(businessId).get().catch(() => null),
            db.collection("scrap_sms_settings").doc(businessId).get().catch(() => null)
        ]);

        const smsSettings = smsSettingsSnap && smsSettingsSnap.exists ? (smsSettingsSnap.data() || {}) : {};
        const settingsData = settingsSnap && settingsSnap.exists ? (settingsSnap.data() || {}) : {};
        const bizData = bizSnap && bizSnap.exists ? (bizSnap.data() || {}) : {};

        const customHeader = String(settingsData.smsHeader || "").trim();
        const bizName = String(bizData.name || "").trim();
        const srcHeader = customHeader || bizName || "DIGIBIZ";
        const header = srcHeader.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10) || "DIGIBIZ";
        const finalBrandedText = `[${header}] - ${message}`;

        if (smsSettings.apiKey) {
            const apiFormattedPhone = normalizePhone(normalized);
            let finalPhone = apiFormattedPhone;
            if (finalPhone && !finalPhone.startsWith("+")) {
                finalPhone = "+" + finalPhone;
            }

            const response = await fetch("https://us-central1-digibiz-sms.cloudfunctions.net/sendSMSRest", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": smsSettings.apiKey
                },
                body: JSON.stringify({ phoneNumber: finalPhone, message: finalBrandedText })
            });

            const result = await response.json();
            if (result.success) {
                logger.info(`✅ CF SMS sent successfully via REST API for business ${businessId} to ${mobile}`);
                await db.collection("pending_sms").doc(id).update({
                    status: "sent",
                    apiMessageId: result.messageId,
                    sentAt: admin.firestore.FieldValue.serverTimestamp()
                }).catch(() => null);
                
                await db.collection("sms_logs").doc(result.messageId || db.collection("sms_logs").doc().id).set({
                    businessId,
                    mobile: finalPhone,
                    text: finalBrandedText,
                    status: "sent",
                    costCredits: 1,
                    creditsRemaining: result.creditsRemaining || 0,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                }).catch(() => null);
            } else {
                logger.error(`❌ CF SMS failed via REST API for business ${businessId} to ${mobile}:`, result.error);
                await db.collection("pending_sms").doc(id).update({
                    status: "failed",
                    error: result.error
                }).catch(() => null);
            }
        } else {
            logger.warn(`⚠️ No REST API Key found for business ${businessId}. SMS remains in firebase queue.`);
        }
    } catch (e) {
        logger.error(`🔥 CF SMS REST API call error for business ${businessId} to ${mobile}:`, e);
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
                    const fmtVal = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                    const msg = `INVESTOR UPDATE - ${todayKey}\n\nDaily Interest Accrued: Rs ${fmtVal(interestAdd)}\n\nCapital Balance: Rs ${fmtVal(capBal)}\nInterest Due: Rs ${fmtVal(nextIntBal)}\nNet Payable: Rs ${fmtVal(capBal + nextIntBal)}`;
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

exports.onBusinessCreatedReferral = onDocumentCreated(
    {
        document: "businesses/{businessId}",
        memory: "256MiB",
        timeoutSeconds: 60,
    },
    async (event) => {
        const snap = event.data;
        if (!snap) return;
        const bizData = snap.data() || {};
        const referrerId = bizData.referredBy;
        if (!referrerId) return;
        
        logger.info(`New business ${event.params.businessId} registered with referrer ${referrerId}`);
        const referrerSettingsRef = db.collection("settings").doc(referrerId);
        try {
            await db.runTransaction(async (tx) => {
                const refSnap = await tx.get(referrerSettingsRef);
                if (!refSnap.exists) {
                    logger.warn(`Referrer settings not found for ${referrerId}`);
                    return;
                }
                const refData = refSnap.data() || {};
                const sub = refData.subscription || {};
                const currentExpireStr = sub.expireDate || sub.trialEnd;
                if (currentExpireStr) {
                    const currentExpire = new Date(currentExpireStr);
                    const nextExpire = new Date(currentExpire.getTime() + (3 * 24 * 60 * 60 * 1000));
                    const updatedSub = {
                        ...sub,
                        expireDate: nextExpire.toISOString()
                    };
                    if (sub.trialEnd) {
                        updatedSub.trialEnd = nextExpire.toISOString();
                    }
                    
                    const wallet = refData.smsWallet || {};
                    let updatedWallet = { ...wallet };
                    if (wallet.trialSmsExpiresAt) {
                        const currentTrialSmsExpire = new Date(wallet.trialSmsExpiresAt);
                        const nextTrialSmsExpire = new Date(currentTrialSmsExpire.getTime() + (3 * 24 * 60 * 60 * 1000));
                        updatedWallet.trialSmsExpiresAt = nextTrialSmsExpire.toISOString();
                        updatedWallet.smsBalance = Number(updatedWallet.smsBalance || 0);
                    }
                    
                    tx.set(referrerSettingsRef, {
                        subscription: updatedSub,
                        smsWallet: updatedWallet
                    }, { merge: true });
                    logger.info(`Successfully added 3 days referral reward to ${referrerId}`);
                }
            });
        } catch (e) {
            logger.error(`Referral reward transaction failed for ${referrerId}:`, e);
        }
    }
);

exports.scrapDailyLiabilityExpenseCron = onSchedule(
    {
        schedule: "1 0 * * *",
        timeZone: "Asia/Colombo",
        memory: "256MiB",
        timeoutSeconds: 300,
    },
    async () => {
        const now = new Date();
        const todayKey = colomboDateKey(now);
        const liabilitiesSnap = await db.collection("scrap_liabilities").get();
        let appended = 0;
        let errors = 0;

        const businessTotals = {};

        for (const doc of liabilitiesSnap.docs) {
            try {
                const data = doc.data() || {};
                const businessId = String(data.businessId || "");
                if (!businessId) continue;
                
                // Skip if remainingBalance is zero or less
                if (data.remainingBalance !== undefined && data.remainingBalance !== null && Number(data.remainingBalance) <= 0.0001) {
                    continue;
                }

                if (data.endDate) {
                    const end = new Date(data.endDate);
                    end.setHours(23, 59, 59, 999);
                    if (!Number.isNaN(end.getTime()) && now > end) {
                        continue;
                    }
                }

                const dailyAmount = Number(data.dailyAmount || 0);
                if (dailyAmount > 0) {
                    businessTotals[businessId] = (businessTotals[businessId] || 0) + dailyAmount;
                    
                    // Deduct from remainingBalance in Firestore
                    if (data.remainingBalance !== undefined && data.remainingBalance !== null && data.remainingBalance > 0) {
                        const deduction = Math.min(data.remainingBalance, dailyAmount);
                        const nextBal = Math.max(0, data.remainingBalance - deduction);
                        await doc.ref.update({
                            remainingBalance: nextBal,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }

                if (data.nextInstallmentDate) {
                    const nextDate = new Date(data.nextInstallmentDate);
                    if (!Number.isNaN(nextDate.getTime())) {
                        nextDate.setHours(23, 59, 59, 999);
                        if (now > nextDate) {
                            const newMonthDate = new Date(nextDate);
                            newMonthDate.setMonth(newMonthDate.getMonth() + 1);
                            
                            const newDateStr = newMonthDate.toISOString().split("T")[0];
                            await doc.ref.update({
                                nextInstallmentDate: newDateStr,
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                }
            } catch (e) {
                errors += 1;
                logger.error("scrapDailyLiabilityExpenseCron doc failed", doc.id, e);
            }
        }

        for (const businessId in businessTotals) {
            const totalDaily = businessTotals[businessId];
            if (totalDaily > 0) {
                try {
                    const todayExpenses = await db.collection("scrap_expenses")
                        .where("businessId", "==", businessId)
                        .where("expenseDate", "==", todayKey)
                        .where("category", "==", "Liability (Daily Total)")
                        .get();
                        
                    if (todayExpenses.empty) {
                        await db.collection("scrap_expenses").add({
                            businessId,
                            expenseDate: todayKey,
                            category: "Liability (Daily Total)",
                            amount: totalDaily,
                            note: "Auto-deducted daily liabilities total",
                            createdBy: "system_cron",
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        appended += 1;
                    } else {
                        const existingDoc = todayExpenses.docs[0];
                        if (Number(existingDoc.data().amount) !== totalDaily) {
                            await existingDoc.ref.update({
                                amount: totalDaily,
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                } catch(e) {
                    errors += 1;
                    logger.error(`scrapDailyLiabilityExpenseCron expense add/update failed for ${businessId}`, e);
                }
            }
        }

        logger.info(`scrapDailyLiabilityExpenseCron: scanned=${liabilitiesSnap.size} appended=${appended} errors=${errors}`);
    }
);

async function postJournalEntryAdmin(businessId, payload) {
    if (!businessId) {
        logger.error("[postJournalEntryAdmin] FAILED: businessId is missing.");
        return;
    }
    if (!payload || !Array.isArray(payload.entries)) {
        logger.error("[postJournalEntryAdmin] FAILED: Invalid payload or missing entries.");
        return;
    }

    const lines = payload.entries.map((line) => ({
        accountCode: String(line.accountCode || ""),
        accountName: String(line.accountName || ""),
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0)
    }));
    const totalDebit = lines.reduce((s, r) => s + r.debit, 0);
    const totalCredit = lines.reduce((s, r) => s + r.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        logger.warn("[postJournalEntryAdmin] SKIPPED: unbalanced lines", { payload, totalDebit, totalCredit });
        return;
    }

    try {
        const ledgerBase = db.collection("journal").doc(businessId).collection("account_ledger");
        const entryRef = db.collection("journal").doc(businessId).collection("entries").doc();
        const batch = db.batch();
        const desc = String(payload.description || "Scrap entry").slice(0, 240);
        const refType = String(payload.referenceType || "SCRAP_TXN");

        const entryDate = (function() {
            const d = payload.date;
            if (!d) return admin.firestore.Timestamp.now();
            if (d instanceof admin.firestore.Timestamp) return d;
            if (d.toDate && typeof d.toDate === 'function') return d;
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? admin.firestore.Timestamp.now() : admin.firestore.Timestamp.fromDate(parsed);
        })();

        batch.set(entryRef, {
            businessId,
            date: entryDate,
            description: desc,
            reference: String(payload.reference || ""),
            referenceType: refType,
            entries: lines,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        lines.forEach((line) => {
            const code = String(line.accountCode || "").trim() || "UNKNOWN";
            const docId = code.replace(/\//g, "_");
            const ref = ledgerBase.doc(docId);
            batch.set(
                ref,
                {
                    businessId,
                    accountCode: code,
                    accountName: String(line.accountName || code),
                    totalDebit: admin.firestore.FieldValue.increment(line.debit),
                    totalCredit: admin.firestore.FieldValue.increment(line.credit),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastDescription: desc,
                    lastReferenceType: refType
                },
                { merge: true }
            );
        });

        await batch.commit();
        logger.info("[postJournalEntryAdmin] SUCCESS: Batch committed for entry:", entryRef.id);
    } catch (err) {
        logger.error("[postJournalEntryAdmin] CRITICAL ERROR during batch commit:", err);
        throw err;
    }
}

exports.scrapRiskPoolAllocationCron = onSchedule(
    {
        schedule: "0 23 * * *",
        timeZone: "Asia/Colombo",
        memory: "512MiB",
        timeoutSeconds: 540,
    },
    async () => {
        const now = new Date();
        const todayKey = colomboDateKey(now);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgoStr = colomboDateKey(thirtyDaysAgo);

        logger.info("scrapRiskPoolAllocationCron started", { todayKey });

        const businessesSnap = await db.collection("businesses").get();
        logger.info(`Found ${businessesSnap.size} businesses to scan.`);

        for (const bizDoc of businessesSnap.docs) {
            const businessId = bizDoc.id;
            try {
                // A. 5% Profit Pool Allocation
                const profitPoolRef = db.collection("scrap_profit_pool").doc(businessId);
                const profitPoolSnap = await profitPoolRef.get();
                const currentProfitBal = profitPoolSnap.exists ? Number(profitPoolSnap.data().balance || 0) : 0;

                if (currentProfitBal > 0.01) {
                    const deduction = Math.round((currentProfitBal * 0.05) * 100) / 100;
                    if (deduction > 0.01) {
                        // Deduct from profit pool
                        await profitPoolRef.set({
                            businessId,
                            balance: Math.round((currentProfitBal - deduction) * 100) / 100,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });

                        // Log profit pool movement
                        await db.collection("scrap_profit_pool_logs").add({
                            businessId,
                            delta: -deduction,
                            type: "RISK_ALLOCATION",
                            note: "5% Risk Allocation for Risk Management",
                            balanceAfter: Math.round((currentProfitBal - deduction) * 100) / 100,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });

                        // Record scrap expense
                        await db.collection("scrap_expenses").add({
                            businessId,
                            expenseDate: todayKey,
                            amount: deduction,
                            category: "Risk Management",
                            note: "for risk management",
                            accountCode: "5-5020-01",
                            accountName: "Risk Management Expense",
                            paymentMethod: "CASH",
                            addedBy: "system_cron",
                            addedByEmail: "system@digibiz.lk",
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });

                        // Update Loan Pool
                        const loanPoolRef = db.collection("scrap_loan_pool").doc(businessId);
                        await db.runTransaction(async (tx) => {
                            const poolSnap = await tx.get(loanPoolRef);
                            const currentPoolBal = poolSnap.exists ? Number(poolSnap.data().balance || 0) : 0;
                            tx.set(loanPoolRef, {
                                businessId,
                                balance: Math.round((currentPoolBal + deduction) * 100) / 100,
                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });
                        });

                        // Add transaction log
                        await db.collection("scrap_loan_pool_transactions").add({
                            businessId,
                            type: "ALLOCATION",
                            amount: deduction,
                            customerName: "Profit Pool",
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            note: "5% Allocation from Profit Pool"
                        });

                        // Post Journal Entry
                        await postJournalEntryAdmin(businessId, {
                            description: "5% Risk Allocation from Profit Pool",
                            reference: todayKey,
                            referenceType: "ALLOCATION",
                            date: now,
                            entries: [
                                { accountCode: "5-5020-01", accountName: "Risk Management Expense", debit: deduction, credit: 0 },
                                { accountCode: "2-2020-01", accountName: "Risk Reserve", debit: 0, credit: deduction }
                            ]
                        });

                        logger.info(`Business ${businessId}: Allocated ${deduction} to Risk Loan Pool.`);
                    }
                }

                // B. 30-Day Inactive Scan is now handled manually by the user from the Risk Management dashboard.
                logger.info(`Business ${businessId}: Automatic 30-day scan skipped (handled manually).`);

            } catch (err) {
                logger.error(`Error processing allocation/scan for business ${businessId}`, err);
            }
        }
    }
);

exports.scrapRiskPoolPayoffCron = onSchedule(
    {
        schedule: "0 5 * * *",
        timeZone: "Asia/Colombo",
        memory: "512MiB",
        timeoutSeconds: 540,
    },
    async () => {
        const now = new Date();
        const todayKey = colomboDateKey(now);

        logger.info("scrapRiskPoolPayoffCron started", { todayKey });

        const businessesSnap = await db.collection("businesses").get();
        logger.info(`Found ${businessesSnap.size} businesses to scan for payoffs.`);

        for (const bizDoc of businessesSnap.docs) {
            const businessId = bizDoc.id;
            try {
                const loanPoolRef = db.collection("scrap_loan_pool").doc(businessId);
                const loanPoolSnap = await loanPoolRef.get();
                let availablePoolBal = loanPoolSnap.exists ? Number(loanPoolSnap.data().balance || 0) : 0;

                if (availablePoolBal <= 0.01) {
                    continue;
                }

                const approvedSnap = await db.collection("risk_management_loans")
                    .where("businessId", "==", businessId)
                    .where("status", "==", "APPROVED")
                    .get();

                if (approvedSnap.empty) {
                    continue;
                }

                const approvedLoans = approvedSnap.docs.map(doc => ({
                    id: doc.id,
                    ref: doc.ref,
                    ...doc.data()
                }));

                logger.info(`Business ${businessId}: Found ${approvedLoans.length} APPROVED risky loans. Available pool: ${availablePoolBal}`);

                let poolBalance = availablePoolBal;
                let activeLoans = approvedLoans.map(l => ({
                    ...l,
                    maxPayoffToday: Math.min(Number(l.remainingBalance || 0), 500)
                }));
                const payoffs = {};

                let changed = true;
                while (poolBalance > 0.01 && activeLoans.length > 0 && changed) {
                    changed = false;
                    let share = poolBalance / activeLoans.length;
                    
                    let overpaidIndex = activeLoans.findIndex(l => Number(l.maxPayoffToday || 0) < share);
                    if (overpaidIndex !== -1) {
                        const loan = activeLoans[overpaidIndex];
                        const payAmt = Number(loan.maxPayoffToday || 0);
                        if (payAmt > 0) {
                            payoffs[loan.id] = (payoffs[loan.id] || 0) + payAmt;
                            poolBalance -= payAmt;
                        }
                        loan.maxPayoffToday = 0;
                        activeLoans.splice(overpaidIndex, 1);
                        changed = true;
                    } else {
                        for (const loan of activeLoans) {
                            payoffs[loan.id] = (payoffs[loan.id] || 0) + share;
                            loan.maxPayoffToday = Number(loan.maxPayoffToday || 0) - share;
                        }
                        poolBalance = 0;
                        changed = true;
                    }
                }

                let totalAppliedPayoffs = 0;

                for (const loan of approvedLoans) {
                    const payoffAmount = payoffs[loan.id] || 0;
                    if (payoffAmount <= 0.01) continue;

                    const roundedPayoff = Math.round(payoffAmount * 100) / 100;
                    const nextRemaining = Math.max(0, Number(loan.remainingBalance || 0) - roundedPayoff);
                    const nextStatus = nextRemaining <= 0.01 ? "SETTLED" : "APPROVED";

                    await loan.ref.set({
                        remainingBalance: nextRemaining,
                        status: nextStatus,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    await db.collection("scrap_loan_pool_transactions").add({
                        businessId,
                        type: "PAYOFF",
                        amount: -roundedPayoff,
                        customerName: loan.customerName,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        note: `Payoff applied for borrower: ${loan.customerName}`
                    });

                    const isAdvance = String(loan.originalCollection || "").includes("advance");
                    const assetAccountCode = isAdvance ? "1-1060-01" : "1-1050-01";
                    const assetAccountName = isAdvance ? "Supplier Advances (Scrap)" : "Loans Given";

                    await postJournalEntryAdmin(businessId, {
                        description: `Risk Payoff - ${loan.customerName}`,
                        reference: todayKey,
                        referenceType: "PAYOFF",
                        date: now,
                        entries: [
                            { accountCode: "2-2020-01", accountName: "Risk Reserve", debit: roundedPayoff, credit: 0 },
                            { accountCode: assetAccountCode, accountName: assetAccountName, debit: 0, credit: roundedPayoff }
                        ]
                    });

                    const customerMobile = String(loan.customerMobile || "").trim();
                    if (customerMobile) {
                        const smsMsg = `Oba wisin nogewana lada naya sadaha apa wisin ada dina Rs ${Math.round(roundedPayoff)}ka mudalak yodawana ladi. Thawa higa ${Math.round(nextRemaining)}/=.`;
                        await queueSms(businessId, customerMobile, smsMsg, "cloudfunctions.scrapRiskPoolPayoffCron");
                    }

                    totalAppliedPayoffs += roundedPayoff;
                    logger.info(`Business ${businessId}: Applied payoff of ${roundedPayoff} to loan ${loan.id}. Remaining: ${nextRemaining}`);
                }

                if (totalAppliedPayoffs > 0.01) {
                    const finalPoolBal = Math.max(0, Math.round((availablePoolBal - totalAppliedPayoffs) * 100) / 100);
                    await loanPoolRef.set({
                        balance: finalPoolBal,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    logger.info(`Business ${businessId}: Deducted total payoffs of ${totalAppliedPayoffs} from Loan Pool. Final balance: ${finalPoolBal}`);
                }

            } catch (err) {
                logger.error(`Error processing payoff for business ${businessId}`, err);
            }
        }
    }
);
