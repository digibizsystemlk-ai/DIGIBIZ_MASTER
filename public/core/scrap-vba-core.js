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
     * Queues SMS: primary path Firestore transaction (pending_sms + wallet) then RTDB mirror.
     * If Firestore hits write quota (resource-exhausted) but RTDB works, falls back to RTDB-only
     * (DigiBiz Flutter gateway). Wallet is not debited in that fallback â€” reconcile when Firestore recovers.
     * @param {string} businessId settings + pending_sms tenant id
     */
    async function enqueuePendingSms(businessId, phone, message) {
        await ensureSmsWalletCoreLoaded();
        const bizIdStr = String(businessId);
        const mobile = normalizePhone(phone);
        const text = String(message || "").trim();
        if (!mobile || !text || !bizIdStr) return { ok: false, skipped: "invalid_input" };
        const [settingsSnapForHeader, bizSnapForHeader] = await Promise.all([
            window.db ? window.db.collection('settings').doc(bizIdStr).get().catch(() => null) : Promise.resolve(null),
            window.db ? window.db.collection('businesses').doc(bizIdStr).get().catch(() => null) : Promise.resolve(null)
        ]);
        const settingsDataForHeader = settingsSnapForHeader && settingsSnapForHeader.exists ? (settingsSnapForHeader.data() || {}) : {};
        const bizDataForHeader = bizSnapForHeader && bizSnapForHeader.exists ? (bizSnapForHeader.data() || {}) : {};
        const customHeader = String(settingsDataForHeader.smsHeader || '').trim();
        const bizName = String(bizDataForHeader.name || '').trim();
        const srcHeader = customHeader || bizName || 'DIGIBIZ';
        const header = srcHeader.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'DIGIBIZ';
        const finalBrandedText = `[${header}] - ${text}`;
        const creditPer = window.SmsWalletCore && Number(window.SmsWalletCore.CREDIT_PER_SMS) > 0
            ? Number(window.SmsWalletCore.CREDIT_PER_SMS)
            : 1;
        const preReadBalance = smsBalanceFromSettingsData(settingsDataForHeader);

        try {
            if (!window.db) return { ok: false, skipped: "db_unavailable" };
            const settingsData = settingsDataForHeader;
            const wallet = settingsData.smsWallet || {};
            const lowThreshold = Number(wallet.lowBalanceThreshold || 50);

            const settingsRef = window.db.collection('settings').doc(bizIdStr);
            const pendingRef = window.db.collection("pending_sms").doc();
            let postBalance = 0;
            let preBalance = 0;

            await window.db.runTransaction(async (tx) => {
                const liveSettingsSnap = await tx.get(settingsRef);
                const liveData = liveSettingsSnap.exists ? (liveSettingsSnap.data() || {}) : {};
                const liveWallet = liveData.smsWallet || {};
                let nextWallet = null;
                if (window.SmsWalletCore && typeof window.SmsWalletCore.normalizeWallet === 'function' && typeof window.SmsWalletCore.debitOne === 'function') {
                    const normalized = window.SmsWalletCore.normalizeWallet(liveWallet, liveData.smsBalance);
                    preBalance = Number(normalized.smsBalance || 0);
                    nextWallet = window.SmsWalletCore.debitOne(normalized);
                    postBalance = Number(nextWallet.smsBalance || 0);
                } else {
                    const w = liveWallet && typeof liveWallet === "object" ? liveWallet : {};
                    const nestedSum = Math.max(0, Number(w.trialSmsBalance || 0) + Number(w.paidSmsBalance || 0));
                    const flat = Number(w.smsBalance != null ? w.smsBalance : NaN);
                    const rootB = Math.max(0, Number(liveData.smsBalance || 0));
                    const currentBal = Number.isFinite(flat) && flat > 0
                        ? Math.max(0, flat)
                        : (nestedSum > 0 ? nestedSum : rootB);
                    preBalance = currentBal;
                    if (currentBal < creditPer) throw new Error("SMS wallet exhausted");
                    postBalance = currentBal - creditPer;
                    nextWallet = {
                        ...liveWallet,
                        smsBalance: postBalance,
                        updatedAt: new Date().toISOString()
                    };
                }
                const payload = {
                    businessId: bizIdStr,
                    mobile,
                    message: finalBrandedText,
                    status: "pending",
                    gateway: "android_firestore_gateway",
                    createdBy: "scrapVbaCore.enqueuePendingSms",
                    debugReason: "queued_to_server_gateway",
                    gatewayDocPath: `sms_gateway/${bizIdStr}/pending_sms/${pendingRef.id}`,
                    creditCharged: creditPer,
                    smsBalanceBefore: preBalance,
                    smsBalanceAfter: postBalance,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                tx.set(pendingRef, payload);

                // Write directly to sms_logs for an instant server-side audit trail
                const logRef = window.db.collection("sms_logs").doc(pendingRef.id);
                tx.set(logRef, {
                    ...payload,
                    status: "queued", // initial delivery status shown in logs
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                tx.set(settingsRef, {
                    smsWallet: {
                        ...liveWallet,
                        ...(nextWallet || {}),
                        smsBalance: postBalance,
                        updatedAt: new Date().toISOString()
                    },
                    smsBalance: postBalance
                }, { merge: true });
            });
            
            await mirrorPendingSmsToRtdb(bizIdStr, pendingRef.id, mobile, finalBrandedText);
            
            if (postBalance < lowThreshold && window.eventBus && typeof window.eventBus.publish === "function") {
                window.eventBus.publish("SMS_LOW_BALANCE", { businessId: bizIdStr, smsBalance: postBalance });
            }
            smsDebug(`SMS queued â†’ ${mobile} (bal ${postBalance})`, true);
            return { ok: true, via: "firestore", id: pendingRef.id, postBalance };
        } catch (error) {
            const code = error && error.code ? String(error.code) : "";
            const detail = [code, error && error.message ? String(error.message) : String(error || "")]
                .filter(Boolean)
                .join(" Â· ");
            const msg = String(error?.message || error || "").toLowerCase();
            const isQuota = isFirestoreQuotaError(code, msg);
            const quotaHint = isQuota
                ? "\nâ†’ Firestore quota: check Console â†’ Usage / Billing (Blaze) or wait for daily reset."
                : "";
            console.warn("enqueuePendingSms failed:", detail, error);

            if (msg.includes("wallet exhausted") || msg.includes("no sms credits") || msg.includes("balance 0")) {
                smsDebug(`SMS queue failed â†’ ${mobile}\n${detail}`, false);
                return { ok: false, skipped: "wallet_exhausted", error: detail };
            }
            if (msg.includes("permission") || code === "permission-denied") {
                smsDebug(`SMS queue failed â†’ ${mobile}\n${detail}`, false);
                return { ok: false, skipped: "permission", error: detail };
            }

            if (isQuota && preReadBalance >= creditPer) {
                const rtdbId = `rtdb_q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
                try {
                    await mirrorPendingSmsToRtdb(
                        bizIdStr,
                        rtdbId,
                        mobile,
                        finalBrandedText,
                        { viaFirestoreQuotaFallback: true, ts: Date.now() },
                        { rethrow: true }
                    );
                    smsDebug(
                        `SMS queued (Realtime DB) â†’ ${mobile}\n` +
                            "Firestore write quota exceeded â€” Flutter gateway reads this queue. " +
                            "Cloud wallet was NOT debited in this path; reconcile credits when Firestore works again.",
                        true
                    );
                    return {
                        ok: true,
                        via: "rtdb_quota_fallback",
                        id: rtdbId,
                        fallback: true,
                        postBalance: preReadBalance
                    };
                } catch (rtdbErr) {
                    const rdet = rtdbErr && (rtdbErr.message || String(rtdbErr));
                    smsDebug(`SMS queue failed â†’ ${mobile}\n${detail}${quotaHint}\nRTDB fallback failed: ${rdet}`, false);
                    return {
                        ok: false,
                        skipped: "quota_exhausted",
                        error: `${detail} â€” RTDB fallback failed: ${rdet}`
                    };
                }
            }

            if (isQuota && preReadBalance < creditPer) {
                smsDebug(`SMS queue failed â†’ ${mobile}\n${detail}${quotaHint}`, false);
                return { ok: false, skipped: "wallet_exhausted", error: detail };
            }

            smsDebug(`SMS queue failed â†’ ${mobile}\n${detail}`, false);
            return { ok: false, skipped: "firestore_error", error: detail };
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

    window.scrapVbaCore = {
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
        }
    };
    console.log("✅ Scrap VBA Core Initialized v74");
})();
} catch(globalErr) {
    console.error("âŒ CRITICAL: scrap-vba-core.js failed to load!", globalErr);
}
