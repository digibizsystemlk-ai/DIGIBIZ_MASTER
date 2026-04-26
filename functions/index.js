/**
 * Nightly interest accrual for all active interest loans (Asia/Colombo calendar).
 * Deploy: cd functions && npm install && firebase deploy --only functions
 */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp({
    databaseURL: "https://digibiz-sys-default-rtdb.firebaseio.com/",
});
const db = admin.firestore();

let rtdb = null;
try {
    rtdb = admin.database();
} catch (e) {
    logger.warn("Realtime Database not available for SMS gateway mirror", e && e.message);
}

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
    const id = `loan_cf_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const payload = {
        businessId,
        mobile,
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

const DEFAULT_INVESTOR_PHONE = "0773125715";

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
                const phone = String(cfg.investorPhone || DEFAULT_INVESTOR_PHONE).replace(/\s/g, "");
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

                const msg = `Investor ledger: daily interest on capital Rs.${interestAdd.toFixed(
                    2
                )} (${diffDays} day(s) at ${ratePct}%/day). Interest balance Rs.${nextIntBal.toFixed(
                    2
                )}. Capital balance Rs.${capBal.toFixed(2)}.`;
                await queueSms(businessId, phone, msg, "cloudfunctions.dailyInvestorPortfolioAccrualColombo");
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
