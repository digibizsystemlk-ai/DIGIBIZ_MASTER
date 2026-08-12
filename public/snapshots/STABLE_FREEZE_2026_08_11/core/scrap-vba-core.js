// Scrap VBA core translation helpers (phase 1).
try {
    console.log("ðŸš€ Scrap VBA Core Starting v71...");
(function () {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const INVESTOR_MONTHLY_RATE = 8;
    function num(v) {
        return Number(v) || 0;
    }

    function formatWeight(v) {
        const n = num(v);
        if (n === 0) return '0';
        if (Number.isInteger(n)) return n.toString();
        // Show 3 decimal places for fractions to clearly represent grams (e.g., 1.250, 0.200)
        return n.toFixed(3);
    }

    function ensureSmsDebugEl() {
        try {
            if (typeof document === 'undefined') return null;
            let el = document.getElementById('digibizSmsDebug');
            if (el) return el;
            el = document.createElement('div');
            el.id = 'digibizSmsDebug';
            el.style.position = 'fixed';
            el.style.right = '12px';
            el.style.bottom = '12px';
            el.style.zIndex = '99999';
            el.style.maxWidth = '360px';
            el.style.padding = '10px 12px';
            el.style.borderRadius = '10px';
            el.style.fontFamily = 'Inter, system-ui, sans-serif';
            el.style.fontSize = '12px';
            el.style.boxShadow = '0 10px 24px rgba(15,23,42,.18)';
            el.style.display = 'none';
            document.body.appendChild(el);
            return el;
        } catch (e) {
            return null;
        }
    }

    function smsDebug(message, ok) {
        const el = ensureSmsDebugEl();
        if (!el) return;
        el.style.display = 'block';
        el.style.whiteSpace = 'pre-wrap';
        el.style.maxWidth = 'min(420px, 92vw)';
        el.style.background = ok ? '#dcfce7' : '#fee2e2';
        el.style.border = ok ? '1px solid #86efac' : '1px solid #fca5a5';
        el.style.color = ok ? '#14532d' : '#7f1d1d';
        el.textContent = String(message || '');
        clearTimeout(el.__t);
        el.__t = setTimeout(() => {
            el.style.display = 'none';
        }, ok ? 5000 : 16000);
    }

    function normalizePhone(phone) {
        let ph = String(phone || "").replace(/[ -]/g, "");
        if (ph.length === 9) ph = `94${ph}`;
        if (ph.length === 10 && ph.startsWith("0")) ph = `94${ph.slice(1)}`;
        return ph;
    }

    function isFirestoreQuotaError(code, errMsg) {
        const c = String(code || "");
        const m = String(errMsg || "").toLowerCase();
        return c === "resource-exhausted" || m.includes("quota exceeded") || m.includes("resource exhausted");
    }

    let digibizRtdbLoadPromise = null;
    async function ensureFirebaseDatabaseLoaded() {
        if (typeof firebase !== "undefined" && typeof firebase.database === "function") return;
        if (!digibizRtdbLoadPromise) {
            digibizRtdbLoadPromise = new Promise((resolve) => {
                const existing = document.querySelector("script[data-digibiz-rtdb-compat]");
                if (existing) {
                    resolve();
                    return;
                }
                const s = document.createElement("script");
                s.src = "https://www.gstatic.com/firebasejs/12.11.0/firebase-database-compat.js";
                s.async = true;
                s.setAttribute("data-digibiz-rtdb-compat", "1");
                s.onload = () => resolve();
                s.onerror = () => resolve();
                document.head.appendChild(s);
            });
        }
        await digibizRtdbLoadPromise;
    }

    /** Same balance rules as inside the Firestore transaction (uses last settings read). */
    function smsBalanceFromSettingsData(liveData) {
        const d = liveData && typeof liveData === "object" ? liveData : {};
        const liveWallet = d.smsWallet || {};
        if (window.SmsWalletCore && typeof window.SmsWalletCore.normalizeWallet === "function") {
            const normalized = window.SmsWalletCore.normalizeWallet(liveWallet, d.smsBalance);
            return Number(normalized.smsBalance || 0);
        }
        const w = liveWallet && typeof liveWallet === "object" ? liveWallet : {};
        const nestedSum = Math.max(0, Number(w.trialSmsBalance || 0) + Number(w.paidSmsBalance || 0));
        const flat = Number(w.smsBalance != null ? w.smsBalance : NaN);
        const rootB = Math.max(0, Number(d.smsBalance || 0));
        const currentBal = Number.isFinite(flat) && flat > 0 ? Math.max(0, flat) : nestedSum > 0 ? nestedSum : rootB;
        return currentBal;
    }

    /**
     * Flutter gateway listens on RTDB `sms_gateway/{businessId}/pending_sms/{id}`.
     * Optional `extraFields` merged into the payload (e.g. viaFirestoreQuotaFallback).
     */
    async function mirrorPendingSmsToRtdb(businessId, firestoreDocId, mobile, message, extraFields, options) {
        const opt = options && typeof options === "object" ? options : {};
        const strict = Boolean(opt.rethrow);
        try {
            await ensureFirebaseDatabaseLoaded();
            if (typeof firebase === "undefined" || typeof firebase.database !== "function") {
                if (strict) throw new Error("Realtime Database SDK not available");
                return false;
            }
            if (!firebase.apps || !firebase.apps.length) {
                if (strict) throw new Error("Firebase not initialized");
                return false;
            }
            const text = String(message || "").trim();
            if (!businessId || !firestoreDocId || !mobile || !text) {
                if (strict) throw new Error("Invalid arguments for SMS RTDB mirror");
                return false;
            }
            const payload = {
                businessId: String(businessId),
                mobile,
                message: text
            };
            if (extraFields && typeof extraFields === "object") {
                Object.keys(extraFields).forEach((k) => {
                    payload[k] = extraFields[k];
                });
            }
            await firebase.database().ref(`sms_gateway/${businessId}/pending_sms`).child(firestoreDocId).set(payload);
            return true;
        } catch (e) {
            const m = e && (e.message || String(e));
            console.warn("mirrorPendingSmsToRtdb:", m);
            smsDebug("RTDB mirror failed (Android gateway): " + m, false);
            if (strict) throw e;
            return false;
        }
    }

    /**
     * Prefer users/{uid}.businessId first so pending_sms.businessId passes isBusinessMember(bid) in Firestore rules.
     * Then localStorage business, then current user UID as fallback.
     */
    async function getEffectiveSmsWalletBusinessId() {
        await ensureSmsWalletCoreLoaded();
        const candidates = [];
        try {
            const u = firebase.auth && firebase.auth().currentUser;
            if (u && window.db) {
                const us = await window.db.collection("users").doc(u.uid).get().catch(() => null);
                const bid = us && us.exists ? String((us.data() || {}).businessId || "").trim() : "";
                if (bid) candidates.push(bid);
                candidates.push(u.uid); // User UID is often the business owner ID
            }
        } catch (e2) { /* ignore */ }
        try {
            const ls = localStorage.getItem("currentBusinessId") || sessionStorage.getItem("currentBusinessId");
            if (ls) candidates.push(String(ls).trim());
        } catch (e) { /* ignore */ }
        
        const uniq = [...new Set(candidates.filter(Boolean))];

        async function walletTotalFor(bid) {
            const snap = await window.db.collection("settings").doc(bid).get().catch(() => null);
            if (!snap || !snap.exists) return 0;
            const data = snap.data() || {};
            if (window.SmsWalletCore && typeof window.SmsWalletCore.normalizeWallet === "function") {
                const w = window.SmsWalletCore.normalizeWallet(data.smsWallet || {}, data.smsBalance);
                return Number(w.smsBalance || 0);
            }
            const sw = data.smsWallet || {};
            return Math.max(0, Number(data.smsBalance || sw.smsBalance || 0));
        }

        for (let i = 0; i < uniq.length; i++) {
            const t = await walletTotalFor(uniq[i]);
            if (t >= 1) return uniq[i];
        }
        return uniq[0] || (firebase.auth && firebase.auth().currentUser ? firebase.auth().currentUser.uid : "");
    }

    async function enqueuePendingSmsForScrap(phone, message) {
        const bid = await getEffectiveSmsWalletBusinessId();
        return enqueuePendingSms(bid, phone, message);
    }

    async function ensureSmsWalletCoreLoaded() {
        if (typeof window === "undefined" || window.SmsWalletCore) return;
        try {
            if (window.subscriptionManager && typeof window.subscriptionManager.ensureSmsWalletLib === "function") {
                await window.subscriptionManager.ensureSmsWalletLib();
            }
        } catch (e) {
            console.warn("ensureSmsWalletCoreLoaded subscription:", e && (e.message || e));
        }
        if (window.SmsWalletCore) return;
        await new Promise((resolve) => {
            if (document.querySelector('script[data-digibiz-sms-wallet-inline]')) {
                resolve();
                return;
            }
            const s = document.createElement("script");
            s.src = "/core/sms-wallet-core.js?v=4";
            s.async = true;
            s.setAttribute("data-digibiz-sms-wallet-inline", "1");
            s.onload = () => resolve();
            s.onerror = () => resolve();
            document.head.appendChild(s);
        });
        for (let i = 0; i < 50 && !window.SmsWalletCore; i++) {
            await new Promise((r) => setTimeout(r, 30));
        }
    }

    /**
     * Queues SMS via the new REST API instead of the old Android gateway.
     */
    async function enqueuePendingSms(businessId, phone, message) {
        if (typeof window !== "undefined" && typeof window.sendSMSViaAPI !== "function") {
            await new Promise((resolve) => {
                if (document.querySelector('script[src*="sms-api-client.js"]')) return resolve();
                const s = document.createElement("script");
                s.src = "/core/sms-api-client.js";
                s.async = true;
                s.onload = () => resolve();
                s.onerror = () => resolve();
                document.head.appendChild(s);
            });
        }
        await ensureSmsWalletCoreLoaded();
        const bizIdStr = String(businessId);
        const mobile = normalizePhone(phone);
        const text = String(message || "").trim();
        if (!mobile || !text || !bizIdStr) return { ok: false, skipped: "invalid_input" };
        
        const [settingsSnapForHeader, bizSnapForHeader, smsSettingsSnap] = await Promise.all([
            window.db ? window.db.collection('settings').doc(bizIdStr).get().catch(() => null) : Promise.resolve(null),
            window.db ? window.db.collection('businesses').doc(bizIdStr).get().catch(() => null) : Promise.resolve(null),
            window.db ? window.db.collection('scrap_sms_settings').doc(bizIdStr).get().catch(() => null) : Promise.resolve(null)
        ]);
        
        const smsSettingsData = smsSettingsSnap && smsSettingsSnap.exists ? (smsSettingsSnap.data() || {}) : {};
        if (smsSettingsData.apiKey && window.SMS_API_CONFIG) {
            window.SMS_API_CONFIG.apiKey = smsSettingsData.apiKey;
        }

        const settingsDataForHeader = settingsSnapForHeader && settingsSnapForHeader.exists ? (settingsSnapForHeader.data() || {}) : {};
        const bizDataForHeader = bizSnapForHeader && bizSnapForHeader.exists ? (bizSnapForHeader.data() || {}) : {};
        const customHeader = String(settingsDataForHeader.smsHeader || '').trim();
        const bizName = String(bizDataForHeader.name || '').trim();
        const srcHeader = customHeader || bizName || 'DIGIBIZ';
        const header = srcHeader.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'DIGIBIZ';
        const finalBrandedText = `[${header}] - ${text}`;

        try {
            if (typeof window.sendSMSViaAPI !== 'function') {
                smsDebug(`SMS queue failed → ${mobile}\nAPI client missing`, false);
                return { ok: false, skipped: "api_client_missing", error: "sendSMSViaAPI function not found" };
            }
            
            const res = await window.sendSMSViaAPI(mobile, finalBrandedText);
            
            if (res.success) {
                if (window.db) {
                    await window.db.collection("sms_logs").doc(res.messageId || window.db.collection("sms_logs").doc().id).set({
                        businessId: bizIdStr,
                        mobile: mobile,
                        message: finalBrandedText,
                        status: "sent",
                        gateway: "rest_api",
                        messageId: res.messageId,
                        creditCharged: 1,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }).catch(e => console.warn("sms log write failed", e));
                }
                smsDebug(`SMS sent via API → ${mobile}`, true);
                return { ok: true, via: "rest_api", id: res.messageId, postBalance: res.creditsRemaining };
            } else {
                if (window.db) {
                    await window.db.collection("sms_logs").add({
                        businessId: bizIdStr,
                        mobile: mobile,
                        message: finalBrandedText,
                        status: "failed",
                        gateway: "rest_api",
                        error: res.error || "Unknown error",
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(e => console.warn("sms log write failed", e));
                }
                smsDebug(`SMS API failed → ${mobile}: ${res.error}`, false);
                return { ok: false, skipped: "api_error", error: res.error };
            }
        } catch (err) {
            console.error("enqueuePendingSms error:", err);
            return { ok: false, skipped: "unexpected_error", error: String(err) };
        }
    }

    async function logEvent(businessId, action, detail, personName, amount = 0) {
        if (!window.db || !businessId) return;
        await window.db.collection("scrap_event_log").add({
            businessId,
            action: String(action || ""),
            detail: String(detail || ""),
            personName: String(personName || "System"),
            amount: Number(amount) || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    function aggregateEntryDocsToAccountMap(docs) {
        const byCode = {};
        docs.forEach((doc) => {
            const row = doc.data() || {};
            (row.entries || []).forEach((line) => {
                const c = String(line.accountCode || "").trim() || "UNKNOWN";
                if (!byCode[c]) {
                    byCode[c] = { accountCode: c, accountName: String(line.accountName || c), debit: 0, credit: 0 };
                }
                byCode[c].debit += num(line.debit);
                byCode[c].credit += num(line.credit);
            });
        });
        return byCode;
    }

    function aggregateLedgerDocsToAccountMap(docs) {
        const byCode = {};
        docs.forEach((doc) => {
            const r = doc.data() || {};
            const c = String(r.accountCode || doc.id || "").trim() || "UNKNOWN";
            byCode[c] = {
                accountCode: c,
                accountName: String(r.accountName || c),
                debit: num(r.totalDebit),
                credit: num(r.totalCredit)
            };
        });
        return byCode;
    }

    function mergeAccountMaps(a, b) {
        const out = { ...a };
        Object.keys(b).forEach((k) => {
            if (!out[k]) {
                out[k] = { ...b[k] };
            } else {
                out[k] = {
                    accountCode: k,
                    accountName: b[k].accountName || out[k].accountName,
                    debit: num(out[k].debit) + num(b[k].debit),
                    credit: num(out[k].credit) + num(b[k].credit)
                };
            }
        });
        return out;
    }

    function aggregateOpeningDocToMap(data) {
        const byCode = {};
        const lines = data && Array.isArray(data.lines) ? data.lines : [];
        lines.forEach((line) => {
            const c = String(line.accountCode || "").trim();
            if (!c) return;
            if (!byCode[c]) {
                byCode[c] = { accountCode: c, accountName: String(line.accountName || c), debit: 0, credit: 0 };
            }
            byCode[c].debit += num(line.debit);
            byCode[c].credit += num(line.credit);
        });
        return byCode;
    }

    /**
     * Manual opening baseline for scrap GL (stock / advances / cash before consolidated posting).
     * Saved at journal/{businessId}/ledger_opening/current
     */
    async function saveScrapLedgerOpening(businessId, lines, note) {
        if (!window.db || !businessId) return;
        const clean = (lines || [])
            .map((r) => ({
                accountCode: String(r.accountCode || "").trim(),
                accountName: String(r.accountName || "").trim(),
                debit: num(r.debit),
                credit: num(r.credit)
            }))
            .filter((r) => r.accountCode);
        await window.db
            .collection("journal")
            .doc(businessId)
            .collection("ledger_opening")
            .doc("current")
            .set(
                {
                    businessId,
                    lines: clean,
                    note: String(note || "").slice(0, 4000),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                { merge: true }
            );
    }

    /**
     * One running row per GL account: updates journal/{bid}/account_ledger/{code} (increment).
     * Legacy journal/{bid}/entries is no longer appended for scrap flows â€” avoids endless rows.
     */
    async function postJournalEntry(businessId, payload) {
        console.log("[postJournalEntry] Triggered for BID:", businessId, "Payload:", payload);
        const _db = window.db || (typeof db !== 'undefined' ? db : null);
        if (!_db) {
            console.error("[postJournalEntry] FAILED: Firestore instance (db) not found.");
            return;
        }
        if (!businessId) {
            console.error("[postJournalEntry] FAILED: businessId is missing.");
            return;
        }
        if (!payload || !Array.isArray(payload.entries)) {
            console.error("[postJournalEntry] FAILED: Invalid payload or missing entries.");
            return;
        }

        const lines = payload.entries.map((line) => ({
            accountCode: String(line.accountCode || ""),
            accountName: String(line.accountName || ""),
            debit: num(line.debit),
            credit: num(line.credit)
        }));
        const totalDebit = lines.reduce((s, r) => s + num(r.debit), 0);
        const totalCredit = lines.reduce((s, r) => s + num(r.credit), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            console.warn("[postJournalEntry] SKIPPED: unbalanced lines", payload, "Debit:", totalDebit, "Credit:", totalCredit);
            return;
        }
        
        try {
            const ledgerBase = _db.collection("journal").doc(businessId).collection("account_ledger");
            const entryRef = _db.collection("journal").doc(businessId).collection("entries").doc();
            const batch = _db.batch();
            const desc = String(payload.description || "Scrap entry").slice(0, 240);
            const refType = String(payload.referenceType || "SCRAP_TXN");
            
            // 1. Log the full journal entry for history/dashboard visibility
            batch.set(entryRef, {
                businessId,
                date: (function() {
                    const d = payload.date;
                    if (!d) return firebase.firestore.Timestamp.now();
                    if (d instanceof firebase.firestore.Timestamp) return d;
                    if (d.toDate && typeof d.toDate === 'function') return d; // also a timestamp-like
                    const parsed = new Date(d);
                    return isNaN(parsed.getTime()) ? firebase.firestore.Timestamp.now() : firebase.firestore.Timestamp.fromDate(parsed);
                })(),
                description: desc,
                reference: String(payload.reference || ""),
                referenceType: refType,
                entries: lines,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Increment the account-level ledger for optimized reporting
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
                        totalDebit: firebase.firestore.FieldValue.increment(num(line.debit)),
                        totalCredit: firebase.firestore.FieldValue.increment(num(line.credit)),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastDescription: desc,
                        lastReferenceType: refType
                    },
                    { merge: true }
                );
            });
            await batch.commit();
            console.log("[postJournalEntry] SUCCESS: Batch committed for entry:", entryRef.id);
            return entryRef.id;
        } catch (err) {
            console.error("[postJournalEntry] CRITICAL ERROR during batch commit:", err);
            throw err;
        }
    }

    /** Scrap GL: opening baseline + account_ledger (no legacy entries â€” avoids double-counting stock). */
    async function getFlattenedJournalLines(businessId) {
        if (!window.db || !businessId) return [];
        const j = window.db.collection("journal").doc(businessId);
        const [openingSnap, lSnap] = await Promise.all([
            j.collection("ledger_opening").doc("current").get().catch(() => null),
            j.collection("account_ledger").get().catch(() => ({ docs: [] }))
        ]);
        const openingData = openingSnap && openingSnap.exists ? openingSnap.data() : {};
        const map = mergeAccountMaps(aggregateOpeningDocToMap(openingData), aggregateLedgerDocsToAccountMap(lSnap.docs));
        return Object.values(map);
    }

    async function getInventoryAssetBalance(businessId) {
        const lines = await getFlattenedJournalLines(businessId);
        return lines.reduce((balance, line) => {
            const code = String(line.accountCode || "");
            const name = String(line.accountName || "").toLowerCase();
            if (code === "1-1030-01" || name.includes("inventory")) {
                return balance + num(line.debit) - num(line.credit);
            }
            return balance;
        }, 0);
    }

    async function syncInventoryAssetWithStock(businessId) {
        if (!window.db || !businessId) return { adjusted: 0 };
        const snap = await window.db.collection("scrap_items").where("businessId", "==", businessId).get();
        let stockValue = 0;
        snap.forEach((doc) => {
            const row = doc.data();
            const stock = num(row.currentStock);
            const costFromItem = Number(row.costPrice);
            const cost = Number.isFinite(costFromItem) && costFromItem > 0 ? costFromItem : 0;
            stockValue += stock * cost;
        });
        const glBalance = await getInventoryAssetBalance(businessId);
        const diff = stockValue - glBalance;
        if (Math.abs(diff) <= 0.01) return { adjusted: 0, stockValue, glBalance };
        if (diff > 0) {
            await postJournalEntry(businessId, {
                description: "Inventory asset sync adjustment",
                referenceType: "SCRAP_STOCK_SYNC",
                entries: [
                    { accountCode: "1-1030-01", accountName: "Scrap Inventory", debit: diff, credit: 0 },
                    { accountCode: "3-3090-01", accountName: "Inventory Revaluation Reserve", debit: 0, credit: diff }
                ]
            });
        } else {
            const abs = Math.abs(diff);
            await postJournalEntry(businessId, {
                description: "Inventory asset sync adjustment",
                referenceType: "SCRAP_STOCK_SYNC",
                entries: [
                    { accountCode: "3-3090-01", accountName: "Inventory Revaluation Reserve", debit: abs, credit: 0 },
                    { accountCode: "1-1030-01", accountName: "Scrap Inventory", debit: 0, credit: abs }
                ]
            });
        }
        return { adjusted: diff, stockValue, glBalance };
    }

    // VBA: Mod_ADVLN_Investor.Calculate_All_Daily_Interest
    async function calculateAllDailyInterest(businessId) {
        if (!window.db || !businessId) return { updated: 0 };
        const snap = await window.db.collection("scrap_loans")
            .where("businessId", "==", businessId)
            .where("active", "==", true)
            .get();
        let updated = 0;
        let interestAccrued = 0;
        const now = Date.now();
        for (const doc of snap.docs) {
            const row = doc.data();
            const type = String(row.loanType || "").toUpperCase();
            const monthlyRate = type === "INVESTOR_8" ? INVESTOR_MONTHLY_RATE : num(row.monthlyRate);
            if (type === "ADV_LN" || monthlyRate <= 0) continue;
            const dailyRate = monthlyRate / 30 / 100;
            const lastAt = row.lastInterestAppliedAt ? new Date(row.lastInterestAppliedAt).getTime() : now;
            const days = Math.max(0, Math.floor((now - lastAt) / DAY_MS));
            if (!days) continue;
            const prev = num(row.balance);
            let balance = prev;
            for (let i = 0; i < days; i++) balance += balance * dailyRate;
            await doc.ref.set({
                balance,
                lastInterestAppliedAt: new Date(now).toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            interestAccrued += Math.max(0, balance - prev);
            updated += 1;
        }
        if (interestAccrued > 0) {
            await postJournalEntry(businessId, {
                description: "Daily loan interest accrual",
                referenceType: "SCRAP_LOAN_INTEREST",
                entries: [
                    { accountCode: "1-1050-01", accountName: "Loans Given", debit: interestAccrued, credit: 0 },
                    { accountCode: "4-4020-01", accountName: "Interest Income", debit: 0, credit: interestAccrued }
                ]
            });
        }
        await logEvent(businessId, "DAILY_INTEREST", `Updated loans: ${updated}`, "System");
        return { updated };
    }

    // VBA rewards style helper: weekly top supplier + annual bonus.
    async function getSupplierRewardSummary(businessId) {
        if (!window.db || !businessId) return null;
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const [weekSnap, yearSnap] = await Promise.all([
            window.db.collection("buying_history").where("businessId", "==", businessId).where("date", ">=", weekStart.toISOString()).get(),
            window.db.collection("buying_history").where("businessId", "==", businessId).where("date", ">=", yearStart.toISOString()).get()
        ]);

        const weekly = {};
        weekSnap.forEach((d) => {
            const r = d.data();
            const k = String(r.supplierName || "Unknown").trim() || "Unknown";
            weekly[k] = (weekly[k] || 0) + num(r.totalWeight);
        });
        const annual = {};
        yearSnap.forEach((d) => {
            const r = d.data();
            const k = String(r.supplierName || "Unknown").trim() || "Unknown";
            annual[k] = (annual[k] || 0) + num(r.totalWeight);
        });
        const top = Object.entries(weekly).sort((a, b) => b[1] - a[1])[0] || null;
        const annualBonus = Object.entries(annual).map(([name, weight]) => ({
            supplierName: name,
            totalWeight: weight,
            bonus: weight * 70
        })).sort((a, b) => b.totalWeight - a.totalWeight);
        return {
            topSupplier: top ? { name: top[0], weight: top[1] } : null,
            annualBonus
        };
    }

    function formatLkr(value) {
        return `Rs. ${Math.round(num(value)).toLocaleString()}/=`;
    }

    function buildAdvanceBalanceMessage(customerName, balanceValue, whenIso) {
        return `Adv update: Rs.${Math.round(num(balanceValue)).toLocaleString()} due. `;
    }

    function buildSettlementMessage(customerName, amount) {
        const amt = num(amount);
        if (amt > 0) return `Settlement: You have to pay us Rs.${Math.round(amt).toLocaleString()}. `;
        if (amt < 0) return `Settlement: We have to pay you Rs.${Math.round(Math.abs(amt)).toLocaleString()}. `;
        return `Settlement: Your balance is now fully settled. `;
    }

    function renderTemplate(templateText, vars) {
        let out = String(templateText || "");
        Object.keys(vars || {}).forEach((k) => {
            const re = new RegExp(`\\{\\{${k}\\}\\}`, "g");
            out = out.replace(re, String(vars[k] ?? ""));
        });
        return out;
    }

    const _smsSettingsCache = { businessId: null, loadedAt: 0, data: null };
    async function getScrapSmsSettings(businessId) {
        if (!window.db || !businessId) return {};
        const now = Date.now();
        if (_smsSettingsCache.businessId === String(businessId) && _smsSettingsCache.data && (now - _smsSettingsCache.loadedAt) < 30000) {
            return _smsSettingsCache.data;
        }
        const snap = await window.db.collection("scrap_sms_settings").doc(String(businessId)).get().catch(() => null);
        const data = snap && snap.exists ? (snap.data() || {}) : {};
        _smsSettingsCache.businessId = String(businessId);
        _smsSettingsCache.loadedAt = now;
        _smsSettingsCache.data = data;
        return data;
    }

    async function isScrapSmsEventEnabled(businessId, eventKey) {
        console.log("[SMS-Debug-v74] STARTING CHECK for:", eventKey);
        if (!businessId) return false;
        const s = await getScrapSmsSettings(businessId);
        console.log("[SMS-Debug-v74] Full Settings Object from DB:", s);
        if (!s) { console.log("[SMS-Debug-v74] NO SETTINGS FOUND in DB"); return false; }
        
        const key = String(eventKey || '').trim().toLowerCase();
        const ev = typeof s.events === 'object' ? s.events : {};
        console.log("[SMS-Debug-v74] Target Key:", key, "Events Map:", ev);
        
        // Check nested events object (preferred)
        if (ev[key] === true || ev[key] === 'true' || ev[key] === 1) {
            console.log("[SMS-Debug-v74] MATCH FOUND in nested events object!");
            return true;
        }

        // Backward compatibility for root-level flags (e.g., enableBuying, enableBill)
        const legacyKey = 'enable' + key.charAt(0).toUpperCase() + key.slice(1);
        if (s[legacyKey] === true || s[legacyKey] === 'true' || s[legacyKey] === 1) {
            console.log("[SMS-Debug-v74] MATCH FOUND in legacy root-level key:", legacyKey);
            return true;
        }
        
        // Direct root-level check (just in case)
        if (s[key] === true || s[key] === 'true' || s[key] === 1) {
            console.log("[SMS-Debug-v74] MATCH FOUND in direct root key:", key);
            return true;
        }

        console.log("[SMS-Debug-v74] RESULT: Event is DISABLED");
        return false;
    }


    async function upsertCustomerLedger(businessId, customerName) {
        if (!window.db || !businessId || !customerName) return null;
        const safe = String(customerName).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
        if (!safe) return null;
        const ledgerId = `${businessId}_${safe}`;
        const ref = window.db.collection("scrap_customer_ledgers").doc(ledgerId);
        await ref.set({
            businessId,
            customerName: String(customerName).trim(),
            active: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return ledgerId;
    }

    async function checkClosedLoans(businessId) {
        if (!window.db || !businessId) return { closed: 0 };
        const snap = await window.db.collection("scrap_loans")
            .where("businessId", "==", businessId)
            .where("active", "==", true)
            .get();
        let closed = 0;
        for (const doc of snap.docs) {
            const row = doc.data();
            if (num(row.balance) <= 0) {
                await doc.ref.set({
                    active: false,
                    closedAt: new Date().toISOString(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                closed += 1;
            }
        }
        if (closed > 0) {
            await logEvent(businessId, "LOAN_AUTO_CLOSE", `Closed loans: ${closed}`, "System");
        }
        return { closed };
    }

    function riskStatusByDays(days) {
        if (days >= 60) return "HIGH RISK (No activity 60+ days)";
        if (days >= 30) return "MEDIUM RISK (No activity 30+ days)";
        return "LOW RISK (Active)";
    }
    function riskPriority(days) {
        if (days >= 60) return 3;
        if (days >= 30) return 2;
        return 1;
    }

    async function runDailyRecovery(businessId) {
        if (!window.db || !businessId) return { processed: 0 };
        const snap = await window.db.collection("scrap_advances").where("businessId", "==", businessId).get();
        let processed = 0;
        for (const doc of snap.docs) {
            const row = doc.data();
            const bal = num(row.balance);
            if (bal <= 0) continue;
            const last = row.updatedAt ? row.updatedAt.toDate() : new Date();
            const days = Math.floor((Date.now() - last.getTime()) / DAY_MS);
            if (days >= 30) {
                // Future: Enqueue automated reminders
            }
            processed++;
        }
        return { processed };
    }

    async function sendPromiseReminders(businessId) {
        // Placeholder for future reminder logic
        return { sent: 0 };
    }

    let polkatuListenerUnsubscribe = null;

    async function getChamaraPhoneNumber(businessId) {
        if (!window.db || !businessId) return null;
        try {
            const snap = await window.db.collection('customers')
                .where('businessId', '==', businessId)
                .get();
            for (const doc of snap.docs) {
                const data = doc.data() || {};
                const name = String(data.fullName || '').trim().toLowerCase();
                const type = String(data.type || data.context || '').trim().toLowerCase();
                if (name === 'chamara' && (type === 'buyer' || type.includes('buyer'))) {
                    return String(data.mobile || data.phone || '').trim();
                }
            }
            // Fallback
            for (const doc of snap.docs) {
                const data = doc.data() || {};
                const name = String(data.fullName || '').trim().toLowerCase();
                if (name === 'chamara') {
                    return String(data.mobile || data.phone || '').trim();
                }
            }
        } catch (err) {
            console.error("[Polkatu-Alert] Error looking up Chamara phone number:", err);
        }
        return null;
    }

    async function sendPolkatuAlertSms(businessId, roundedVal) {
        try {
            const phone = await getChamaraPhoneNumber(businessId);
            if (!phone) {
                console.warn("[Polkatu-Alert] SMS skipped: Chamara phone number not found in customers database.");
                return;
            }
            const msg = `Hi Chamara, we have around ${roundedVal} kg in stock.`;
            console.log(`[Polkatu-Alert] Enqueueing SMS to ${phone}: "${msg}"`);
            const smsRes = await enqueuePendingSms(businessId, phone, msg);
            console.log("[Polkatu-Alert] SMS queue result:", smsRes);
        } catch (e) {
            console.error("[Polkatu-Alert] Failed to send SMS:", e);
        }
    }

    function startPolkatuStockAlertListener(businessId) {
        if (polkatuListenerUnsubscribe) return; // already listening
        if (!window.db || !businessId) return;

        console.log(`[Polkatu-Alert] Starting stock listener for business: ${businessId}`);
        
        polkatuListenerUnsubscribe = window.db.collection('scrap_items')
            .where('businessId', '==', businessId)
            .where('itemName', '==', 'පොල්කටු')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'modified' || change.type === 'added') {
                        const itemDoc = change.doc;
                        const data = itemDoc.data() || {};
                        const currentStock = Number(data.currentStock || 0);
                        const lastAlerted = Number(data.lastAlertedStock || 0);
                        
                        if (currentStock > 800) {
                            const roundedNew = Math.round(currentStock / 100) * 100;
                            if (roundedNew >= 800 && roundedNew !== lastAlerted) {
                                const itemRef = itemDoc.ref;
                                try {
                                    const shouldSend = await window.db.runTransaction(async (transaction) => {
                                        const freshDoc = await transaction.get(itemRef);
                                        if (!freshDoc.exists) return { send: false };
                                        const freshData = freshDoc.data() || {};
                                        const dbLastAlerted = Number(freshData.lastAlertedStock || 0);
                                        const freshStock = Number(freshData.currentStock || 0);
                                        const freshRounded = Math.round(freshStock / 100) * 100;
                                        
                                        if (freshStock > 800 && freshRounded >= 800 && dbLastAlerted !== freshRounded) {
                                            transaction.update(itemRef, { lastAlertedStock: freshRounded });
                                            return { send: true, roundedVal: freshRounded };
                                        }
                                        return { send: false };
                                    });

                                    if (shouldSend && shouldSend.send) {
                                        console.log(`[Polkatu-Alert] Triggering SMS for rounded stock: ${shouldSend.roundedVal}`);
                                        await sendPolkatuAlertSms(businessId, shouldSend.roundedVal);
                                    }
                                } catch (txErr) {
                                    console.error("[Polkatu-Alert] Transaction error:", txErr);
                                }
                            }
                        }
                    }
                });
            }, (error) => {
                console.error("[Polkatu-Alert] Listener error:", error);
            });
    }

    if (typeof window !== 'undefined' && typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user && window.db) {
                const businessId = await getEffectiveSmsWalletBusinessId();
                if (businessId) {
                    startPolkatuStockAlertListener(businessId);
                }
            } else {
                if (polkatuListenerUnsubscribe) {
                    polkatuListenerUnsubscribe();
                    polkatuListenerUnsubscribe = null;
                }
            }
        });
    }

    async function evaluateDownBuyingPriceCriteria(businessId, supplierName, targetDate = new Date(), ignoreBypass = false) {
        if (!window.db || !businessId || !supplierName) {
            return { active: false, reason: "" };
        }
        
        let customerId = "";
        let customerData = null;
        try {
            const custSnap = await window.db.collection('customers')
                .where('businessId', '==', businessId)
                .where('fullName', '==', supplierName)
                .get();
            const activeDocs = custSnap.docs.filter(d => (d.data() || {}).isActive !== false);
            if (activeDocs.length > 0) {
                customerId = activeDocs[0].id;
                customerData = activeDocs[0].data();
            }
        } catch (e) {
            console.warn("[DownPriceCheck] Customer query error:", e);
        }

        // Determine effective start date limit
        if (!ignoreBypass) {
            let effectiveLimit = new Date('2026-06-06T00:00:00');
            if (customerData && customerData.downPriceStartDate) {
                effectiveLimit = new Date(customerData.downPriceStartDate + 'T00:00:00');
            }
            if (targetDate < effectiveLimit) {
                return { active: false, reason: "" };
            }
        }

        // Condition 1: Hand Loan (GIVEN type only)
        try {
            const hlSnap = await window.db.collection('hand_loans')
                .where('businessId', '==', businessId)
                .where('type', '==', 'GIVEN')
                .where('active', '==', true)
                .get();
            for (const doc of hlSnap.docs) {
                const hl = doc.data() || {};
                const nameMatch = String(hl.customerName || '').trim().toLowerCase() === supplierName.toLowerCase();
                const idMatch = customerId && hl.customerId === customerId;
                
                if (nameMatch || idMatch) {
                    const balance = Number(hl.balance || 0);
                    if (balance > 0.01) {
                        let diffDays = 0;
                        if (hl.date) {
                            const [y, m, d] = hl.date.split('-').map(Number);
                            const loanTime = new Date(y, m - 1, d).getTime();
                            diffDays = Math.floor((targetDate.getTime() - loanTime) / (24 * 60 * 60 * 1000));
                        }
                        
                        if (balance > 20000) {
                            return { 
                                active: true, 
                                reason: `Hand Loan outstanding Rs. ${balance.toLocaleString()} (> Rs. 20,000)` 
                            };
                        }
                        if (diffDays > 10) {
                            return { 
                                active: true, 
                                reason: `Hand Loan outstanding for ${diffDays} days (> 10 days)` 
                            };
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[DownPriceCheck] Hand loan check error:", e);
        }

        // Condition 2: No Interest Loan
        try {
            const nilSnap = await window.db.collection('loan_no_interest')
                .where('businessId', '==', businessId)
                .where('active', '==', true)
                .get();
                
            for (const doc of nilSnap.docs) {
                const nil = doc.data() || {};
                const nameMatch = String(nil.customerName || '').trim().toLowerCase() === supplierName.toLowerCase();
                const idMatch = customerId && nil.customerId === customerId;
                
                if (nameMatch || idMatch) {
                    const balance = Number(nil.balance || 0);
                    if (balance > 0.01) {
                        let diffDays = 0;
                        if (nil.date) {
                            const [y, m, d] = nil.date.split('-').map(Number);
                            const loanTime = new Date(y, m - 1, d).getTime();
                            diffDays = Math.floor((targetDate.getTime() - loanTime) / (24 * 60 * 60 * 1000));
                        }
                        
                        if (balance > 20000) {
                            return { 
                                active: true, 
                                reason: `No Interest Loan outstanding Rs. ${balance.toLocaleString()} (> Rs. 20,000)` 
                            };
                        }
                        if (diffDays > 10) {
                            return { 
                                active: true, 
                                reason: `No Interest Loan outstanding for ${diffDays} days (> 10 days)` 
                            };
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[DownPriceCheck] No interest loan check error:", e);
        }

        // Condition: Weekly Loans (Active and Overdue)
        try {
            const targetDateStr = targetDate.toISOString().split('T')[0];
            const wSnap = await window.db.collection('weekly_loans')
                .where('businessId', '==', businessId)
                .where('customerName', '==', supplierName)
                .where('active', '==', true)
                .get();
                
            for (const doc of wSnap.docs) {
                const wl = doc.data() || {};
                const schedule = wl.schedule || [];
                for (const inst of schedule) {
                    const isInstOverdue = inst.status === 'OVERDUE' || (inst.dueDate && inst.dueDate < targetDateStr && (Number(inst.amount) - Number(inst.paidAmount) > 0.01));
                    if (isInstOverdue) {
                        const due = Number(inst.amount) - Number(inst.paidAmount);
                        return {
                            active: true,
                            reason: `Weekly Loan overdue Rs. ${due.toLocaleString()} is not settled`
                        };
                    }
                }
            }
        } catch (e) {
            console.warn("[DownPriceCheck] Weekly loan check error:", e);
        }

        // Condition 3: Advanced
        try {
            const advId = `ADV_${businessId}_${String(supplierName).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
            const advDoc = await window.db.collection('scrap_advances').doc(advId).get();
            
            if (advDoc.exists) {
                const adv = advDoc.data() || {};
                const balance = Number(adv.balance || 0);
                
                if (balance > 0.01) {
                    const histSnap = await window.db.collection('scrap_advance_history')
                        .where('businessId', '==', businessId)
                        .get();
                        
                    const supplierDocs = histSnap.docs
                        .map(d => d.data())
                        .filter(d => String(d.supplierName || '').trim().toLowerCase() === supplierName.toLowerCase());
                        
                    const sorted = supplierDocs.sort((a, b) => 
                        String(a.date || '').localeCompare(String(b.date || ''))
                    );
                    
                    let running = 0;
                    const histWithBal = [];
                    for (const x of sorted) {
                        running += Number(x.amount || 0);
                        histWithBal.push({
                            time: new Date(x.date).getTime(),
                            balance: running
                        });
                    }
                    
                    const sevenDaysLimit = targetDate.getTime() - 7 * 24 * 60 * 60 * 1000;
                    
                    let balAtStart = 0;
                    for (const h of histWithBal) {
                        if (h.time < sevenDaysLimit) {
                            balAtStart = h.balance;
                        }
                    }
                    
                    let heldContinuous = true;
                    if (balAtStart <= 0.01) {
                        heldContinuous = false;
                    } else {
                        for (const h of histWithBal) {
                            if (h.time >= sevenDaysLimit && h.balance <= 0.01) {
                                heldContinuous = false;
                                break;
                            }
                        }
                    }
                    
                    if (heldContinuous) {
                        let crossedTime = targetDate.getTime();
                        for (let i = histWithBal.length - 1; i >= 0; i--) {
                            if (histWithBal[i].balance <= 0.01) {
                                if (i + 1 < histWithBal.length) {
                                    crossedTime = histWithBal[i+1].time;
                                }
                                break;
                            }
                            if (i === 0 && histWithBal[i].balance > 0.01) {
                                crossedTime = histWithBal[0].time;
                            }
                        }
                        const days = Math.floor((targetDate.getTime() - crossedTime) / (24 * 60 * 60 * 1000));
                        
                        return {
                            active: true,
                            reason: `Advance Rs. ${balance.toLocaleString()} held for ${days} days (> 7 days)`
                        };
                    }
                }
            }
        } catch (e) {
            console.warn("[DownPriceCheck] Advance check error:", e);
        }

        // Condition 4: Interest Loans (Requires Rs 500 minimum payment in last 10 days)
        try {
            const ilSnap = await window.db.collection('loan_interest_entries')
                .where('businessId', '==', businessId)
                .where('active', '==', true)
                .get();
                
            const myLoans = ilSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(l => String(l.customerName || '').trim().toLowerCase() === supplierName.toLowerCase() || (customerId && l.customerId === customerId));
                
            if (myLoans.length > 0) {
                const activeLoans = myLoans.filter(l => (Number(l.principalOutstanding) + Number(l.interestOutstanding)) > 0.01);
                if (activeLoans.length > 0) {
                    const tenDaysAgoTime = targetDate.getTime() - 10 * 24 * 60 * 60 * 1000;
                    const tenDaysAgoIso = new Date(tenDaysAgoTime).toISOString();
                    let totalPaidLast10Days = 0;
                    
                    for (const l of activeLoans) {
                        const hSnap = await window.db.collection('loan_interest_history')
                            .where('loanId', '==', l.id)
                            .where('date', '>=', tenDaysAgoIso)
                            .get();
                        hSnap.docs.forEach(d => {
                            const h = d.data();
                            if (h.type === 'REPAY') {
                                totalPaidLast10Days += Math.abs(Number(h.amount || 0));
                            }
                        });
                    }
                    
                    if (totalPaidLast10Days < 500) {
                        return {
                            active: true,
                            reason: `Interest Loan active: Rs. 500 minimum payment not met in last 10 days`
                        };
                    }
                }
            }
        } catch (e) {
            console.warn("[DownPriceCheck] Interest loan check error:", e);
        }

        return { active: false, reason: "" };
    }

    async function isSupplierClean(businessId, supplierName, targetDate = new Date()) {
        if (!window.db || !businessId || !supplierName) return false;
        // Evaluate the criteria with ignoreBypass = true
        const result = await evaluateDownBuyingPriceCriteria(businessId, supplierName, targetDate, true);
        return !result.active;
    }

    async function checkAndSyncDailyLiabilities() {
        try {
            const db = window.db;
            if (!db) return;
            const businessId = window.SCRAP_BUSINESS_ID || window.businessId || 'oDhSDYHQ2dV1DP33koysmZAqaY13';
            if (!businessId) return;

            // Use Asia/Colombo timezone for consistent daily key
            const now = new Date();
            const todayKey = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Colombo', 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit'
            }).format(now);

            // 1. Check if today is already synced
            const expSnap = await db.collection('scrap_expenses')
                .where('businessId', '==', businessId)
                .where('expenseDate', '==', todayKey)
                .where('category', '==', 'Liability (Daily Total)')
                .get();

            if (!expSnap.empty) {
                return; // Already synced
            }

            console.log(`[Auto-Sync] Today (${todayKey}) not synced in scrap_expenses. Syncing liabilities...`);

            // 2. Fetch all liabilities to find active ones
            const snap = await db.collection('scrap_liabilities')
                .where('businessId', '==', businessId)
                .get();

            if (snap.empty) return;

            const liabilitiesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            let totD = 0;
            const activeLiabilities = [];

            liabilitiesData.forEach(item => {
                let isActive = true;
                if (item.remainingBalance !== undefined && item.remainingBalance !== null && Number(item.remainingBalance) <= 0.0001) {
                    isActive = false;
                } else if (item.endDate) {
                    const end = new Date(item.endDate);
                    end.setHours(23, 59, 59, 999);
                    if (!Number.isNaN(end.getTime()) && now > end) {
                        isActive = false;
                    }
                }
                if (isActive) {
                    totD += Number(item.dailyAmount) || 0;
                    activeLiabilities.push(item);
                }
            });

            if (totD > 0) {
                // 3. Deduct from remainingBalance for each active liability
                for (const item of activeLiabilities) {
                    if (item.remainingBalance !== undefined && item.remainingBalance !== null && item.remainingBalance > 0) {
                        const dailyAmt = Number(item.dailyAmount) || 0;
                        const deduction = Math.min(item.remainingBalance, dailyAmt);
                        const nextBal = Math.max(0, item.remainingBalance - deduction);
                        
                        await db.collection('scrap_liabilities').doc(item.id).update({
                            remainingBalance: nextBal,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }

                // 4. Create the expense document
                await db.collection('scrap_expenses').add({
                    businessId: businessId,
                    expenseDate: todayKey,
                    category: 'Liability (Daily Total)',
                    amount: totD,
                    note: 'Auto-synced daily liabilities total',
                    createdBy: 'system_ui',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[Auto-Sync] ✅ Successfully synced daily liabilities total: LKR ${totD}`);
                
                // Trigger page refresh if it exists
                if (typeof window.refreshData === 'function') {
                    window.refreshData();
                }
            }
        } catch (e) {
            console.error("[Auto-Sync] Failed to sync daily liabilities:", e);
        }
    }

    window.scrapVbaCore = {
        evaluateDownBuyingPriceCriteria,
        isSupplierClean,
        startPolkatuStockAlertListener,
        getChamaraPhoneNumber,
        sendPolkatuAlertSms,
        formatWeight,
        enqueuePendingSms,
        enqueuePendingSmsForScrap,
        getEffectiveSmsWalletBusinessId,
        logEvent,
        postJournalEntry,
        getFlattenedJournalLines,
        saveScrapLedgerOpening,
        calculateAllDailyInterest,
        getSupplierRewardSummary,
        buildAdvanceBalanceMessage,
        buildSettlementMessage,
        renderTemplate,
        isScrapSmsEventEnabled,
        upsertCustomerLedger,
        getProfitPool: async function(businessId) {
            if (!window.db || !businessId) return 0;
            const doc = await window.db.collection("scrap_profit_pool").doc(businessId).get();
            return Number((doc.data() || {}).balance || 0);
        },
        updateProfitPool: async function(businessId, delta, type, note) {
            if (!window.db || !businessId) return;
            const d = Number(delta || 0);
            if (Math.abs(d) < 0.001) return;

            const ref = window.db.collection("scrap_profit_pool").doc(businessId);
            try {
                await window.db.runTransaction(async (tx) => {
                    const snap = await tx.get(ref);
                    const current = Number((snap.data() || {}).balance || 0);
                    const next = current + d;
                    tx.set(ref, {
                        businessId,
                        balance: next,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Log the movement
                    const logRef = window.db.collection("scrap_profit_pool_logs").doc();
                    tx.set(logRef, {
                        businessId,
                        delta: d,
                        type,
                        note: String(note || ""),
                        balanceAfter: next,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                console.log(`✅ [ProfitPool] Updated: ${type} | Delta: ${d}`);
            } catch (err) {
                console.error("❌ [ProfitPool] Transaction FAILED:", err);
            }
        },
        checkClosedLoans,
        runDailyRecovery,
        riskStatusByDays,
        riskPriority,
        sendPromiseReminders,
        getInventoryAssetBalance,
        syncInventoryAssetWithStock,
        recalculateProfitPoolFromHistory: async function(businessId) {
            if (!window.db || !businessId) return { error: "Missing DB or BID" };
            console.log(`ðŸ”„ [ProfitPool] Recalculating for BID: ${businessId}`);
            
            const [itemsSnap, buySnap, revSnap, expSnap] = await Promise.all([
                window.db.collection('scrap_items').get().catch(() => ({ docs: [] })),
                window.db.collection('buying_history').where('businessId', '==', businessId).get().catch(() => ({ docs: [] })),
                window.db.collection('scrap_revenue_history').where('businessId', '==', businessId).get().catch(() => ({ docs: [] })),
                window.db.collection('scrap_expenses').where('businessId', '==', businessId).get().catch(() => ({ docs: [] }))
            ]);

            const sellById = {};
            itemsSnap.docs.forEach(d => {
                const r = d.data();
                if (r.businessId === businessId) sellById[d.id] = Number(r.sellingPrice) || 0;
            });

            // 1. Calculate from Buying History (Margins + Deductions)
            let totalMargin = 0;
            let totalDeductions = 0;
            buySnap.docs.forEach(d => {
                const b = d.data();
                const items = Array.isArray(b.items) ? b.items : [];
                items.forEach(line => {
                    const w = Number(line.weight) || 0;
                    const bp = Number(line.buyingPrice) || 0;
                    const sp = sellById[line.itemId] || 0;
                    if (sp > 0) totalMargin += w * (sp - bp);
                });
                totalDeductions += Number(b.vehicleHireApplied || 0);
            });

            // 2. Calculate from Revenue History (Misc Income only, avoid double counting purchase-related types)
            let totalMiscIncome = 0;
            revSnap.docs.forEach(d => {
                const r = d.data();
                const type = String(r.type || '').toUpperCase();
                // We already counted POTENTIAL_PROFIT (margin) and VEHICLE_HIRE from buying_history
                if (type !== 'POTENTIAL_PROFIT' && type !== 'VEHICLE_HIRE') {
                    totalMiscIncome += (Number(r.amount) || 0);
                }
            });

            // 3. Subtract Expenses
            let totalExp = 0;
            expSnap.docs.forEach(d => totalExp += (Number(d.data().amount) || 0));

            const finalPool = totalMargin + totalDeductions + totalMiscIncome - totalExp;

            const ref = window.db.collection("scrap_profit_pool").doc(businessId);
            await ref.set({
                businessId,
                balance: finalPool,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                recalculatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                source: 'HISTORY_RECALC'
            }, { merge: true });

            console.log(`✅ [ProfitPool] Recalced: Margin=${totalMargin}, Ded=${totalDeductions}, Misc=${totalMiscIncome}, Exp=${totalExp}, Final=${finalPool}`);
            return { totalMargin, totalDeductions, totalMiscIncome, totalExp, finalPool };
        },

        async recordTotalLoanHistory(businessId, customerName) {
            try {
                if (!businessId || !customerName) return;
                
                let handTotal = 0;
                const hq = await window.db.collection('hand_loans')
                    .where('businessId', '==', businessId)
                    .where('type', '==', 'GIVEN')
                    .where('active', '==', true)
                    .where('customerName', '==', customerName)
                    .get();
                hq.forEach(d => handTotal += Number(d.data().balance || 0));

                let niTotal = 0;
                const nq = await window.db.collection('loan_no_interest')
                    .where('businessId', '==', businessId)
                    .where('active', '==', true)
                    .where('customerName', '==', customerName)
                    .get();
                nq.forEach(d => niTotal += Number(d.data().balance || 0));

                let iTotal = 0;
                const iq = await window.db.collection('loan_interest_entries')
                    .where('businessId', '==', businessId)
                    .where('active', '==', true)
                    .where('customerName', '==', customerName)
                    .get();
                iq.forEach(d => iTotal += (Number(d.data().principalOutstanding || 0) + Number(d.data().interestOutstanding || 0)));

                let wArrearsAmt = 0;
                const targetDateStr = new Date().toISOString().split('T')[0];
                const wq = await window.db.collection('weekly_loans')
                    .where('businessId', '==', businessId)
                    .where('active', '==', true)
                    .where('customerName', '==', customerName)
                    .get();
                wq.forEach(d => {
                    const sched = d.data().schedule || [];
                    sched.forEach(inst => {
                        const amt = Number(inst.amount) - Number(inst.paidAmount);
                        if (amt > 0.01 && (inst.status === 'OVERDUE' || (inst.dueDate && inst.dueDate < targetDateStr))) {
                            wArrearsAmt += amt;
                        }
                    });
                });

                let dailyTotal = 0;
                const dq = await window.db.collection('loan_daily_entries')
                    .where('businessId', '==', businessId)
                    .where('active', '==', true)
                    .where('customerName', '==', customerName)
                    .get();
                dq.forEach(d => {
                    let data = d.data();
                    let principal = Number(data.principalOutstanding);
                    let interest = Number(data.interestOutstanding);
                    if (isNaN(principal) || data.principalOutstanding === undefined) {
                        const pAmt = Number(data.principalAmount || 0);
                        const iAmt = Number(data.interestAmount || 0);
                        const totPay = pAmt + iAmt;
                        const paid = Number(data.totalPaid || 0);
                        if (totPay > 0) {
                            const piRatio = pAmt / totPay;
                            principal = Math.max(0, pAmt - (paid * piRatio));
                            interest = Math.max(0, iAmt - (paid * (1 - piRatio)));
                        } else {
                            principal = Number(data.balance || 0);
                            interest = 0;
                        }
                    }
                    const lastCalc = data.lastInterestCalcAt || data.date || targetDateStr;
                    const d1 = new Date(lastCalc + 'T00:00:00Z');
                    const d2 = new Date(targetDateStr + 'T00:00:00Z');
                    const diffMs = d2.getTime() - d1.getTime();
                    const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                    if (diffDays > 0 && principal > 0.01) {
                        const dailyRate = 0.10 / 30;
                        interest += Math.round((principal * dailyRate * diffDays) * 100) / 100;
                    }
                    dailyTotal += Math.round((principal + interest) * 100) / 100;
                });

                let advLoanTotal = 0;
                const adq = await window.db.collection('loan_advanced_entries')
                    .where('businessId', '==', businessId)
                    .where('customerName', '==', customerName)
                    .get();
                adq.forEach(d => {
                    const data = d.data();
                    const bal = Number(data.balance || data.principalOutstanding || 0);
                    const status = String(data.status || '').toLowerCase();
                    if (bal > 0.01 && status !== 'closed' && status !== 'settled') {
                        advLoanTotal += (bal + Number(data.interestOutstanding || 0));
                    }
                });

                const totalBalance = handTotal + niTotal + iTotal + wArrearsAmt + dailyTotal + advLoanTotal;

                await window.db.collection('total_loan_history').add({
                    businessId,
                    customerName,
                    totalBalance,
                    date: new Date().toISOString(),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[recordTotalLoanHistory] Updated for ${customerName}. Total: ${totalBalance}`);
            } catch (e) {
                console.error('[recordTotalLoanHistory] Error:', e);
            }
        },
        checkAndSyncDailyLiabilities
    };

    // Auto-trigger daily liabilities sync silently in background when any scrap module is loaded
    setTimeout(() => {
        checkAndSyncDailyLiabilities().catch(e => console.error("[Auto-Sync-Liabilities] Trigger error:", e));
    }, 1500);

    console.log("✅ Scrap VBA Core Initialized v74");
})();
} catch(globalErr) {
    console.error("âŒ CRITICAL: scrap-vba-core.js failed to load!", globalErr);
}
