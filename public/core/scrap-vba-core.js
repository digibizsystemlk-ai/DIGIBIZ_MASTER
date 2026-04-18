// Scrap VBA core translation helpers (phase 1).
(function () {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const INVESTOR_MONTHLY_RATE = 8;
    function num(v) {
        return Number(v) || 0;
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
            smsDebug("RTDB mirror failed (Android queue): " + m, false);
            if (strict) throw e;
            return false;
        }
    }

    const SCRAP_FIRESTORE_TENANT_ID = "oDhSDYHQ2dV1DP33koysmZAqaY13";

    /**
     * Prefer users/{uid}.businessId first so pending_sms.businessId passes isBusinessMember(bid) in Firestore rules.
     * Then localStorage business, then legacy scrap owner doc id. First settings/{id} with smsBalance >= 1 wins.
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
            }
        } catch (e2) { /* ignore */ }
        try {
            const ls = localStorage.getItem("currentBusinessId") || sessionStorage.getItem("currentBusinessId");
            if (ls) candidates.push(String(ls).trim());
        } catch (e) { /* ignore */ }
        candidates.push(SCRAP_FIRESTORE_TENANT_ID);
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
        return uniq[0] || SCRAP_FIRESTORE_TENANT_ID;
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
     * (DigiBiz Flutter gateway). Wallet is not debited in that fallback — reconcile when Firestore recovers.
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
                // Intentionally omit initial sms_logs write here: saves 1 Firestore write per SMS (quota).
                // Gateway / sms-node merge into sms_logs when processing. SMS Log page merges pending_sms + sms_logs.
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
            smsDebug(`SMS queued → ${mobile} (bal ${postBalance})`, true);
            return { ok: true, via: "firestore", id: pendingRef.id, postBalance };
        } catch (error) {
            const code = error && error.code ? String(error.code) : "";
            const detail = [code, error && error.message ? String(error.message) : String(error || "")]
                .filter(Boolean)
                .join(" · ");
            const msg = String(error?.message || error || "").toLowerCase();
            const isQuota = isFirestoreQuotaError(code, msg);
            const quotaHint = isQuota
                ? "\n→ Firestore quota: check Console → Usage / Billing (Blaze) or wait for daily reset."
                : "";
            console.warn("enqueuePendingSms failed:", detail, error);

            if (msg.includes("wallet exhausted") || msg.includes("no sms credits") || msg.includes("balance 0")) {
                smsDebug(`SMS queue failed → ${mobile}\n${detail}`, false);
                return { ok: false, skipped: "wallet_exhausted", error: detail };
            }
            if (msg.includes("permission") || code === "permission-denied") {
                smsDebug(`SMS queue failed → ${mobile}\n${detail}`, false);
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
                        `SMS queued (Realtime DB) → ${mobile}\n` +
                            "Firestore write quota exceeded — Flutter gateway reads this queue. " +
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
                    smsDebug(`SMS queue failed → ${mobile}\n${detail}${quotaHint}\nRTDB fallback failed: ${rdet}`, false);
                    return {
                        ok: false,
                        skipped: "quota_exhausted",
                        error: `${detail} — RTDB fallback failed: ${rdet}`
                    };
                }
            }

            if (isQuota && preReadBalance < creditPer) {
                smsDebug(`SMS queue failed → ${mobile}\n${detail}${quotaHint}`, false);
                return { ok: false, skipped: "wallet_exhausted", error: detail };
            }

            smsDebug(`SMS queue failed → ${mobile}\n${detail}`, false);
            return { ok: false, skipped: "firestore_error", error: detail };
        }
    }

    async function logEvent(businessId, action, detail, personName) {
        if (!window.db || !businessId) return;
        await window.db.collection("scrap_event_log").add({
            businessId,
            action: String(action || ""),
            detail: String(detail || ""),
            personName: String(personName || "System"),
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
     * Legacy journal/{bid}/entries is no longer appended for scrap flows — avoids endless rows.
     */
    async function postJournalEntry(businessId, payload) {
        if (!window.db || !businessId || !payload || !Array.isArray(payload.entries)) return;
        const lines = payload.entries.map((line) => ({
            accountCode: String(line.accountCode || ""),
            accountName: String(line.accountName || ""),
            debit: num(line.debit),
            credit: num(line.credit)
        }));
        const totalDebit = lines.reduce((s, r) => s + num(r.debit), 0);
        const totalCredit = lines.reduce((s, r) => s + num(r.credit), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            console.warn("postJournalEntry skipped: unbalanced lines", payload);
            return;
        }
        const base = window.db.collection("journal").doc(businessId).collection("account_ledger");
        const batch = window.db.batch();
        const desc = String(payload.description || "Scrap entry").slice(0, 240);
        const refType = String(payload.referenceType || "SCRAP_TXN");
        lines.forEach((line) => {
            const code = String(line.accountCode || "").trim() || "UNKNOWN";
            const docId = code.replace(/\//g, "_");
            const ref = base.doc(docId);
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
    }

    /** Scrap GL: opening baseline + account_ledger (no legacy entries — avoids double-counting stock). */
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
            await doc.ref.update({
                balance,
                lastInterestAppliedAt: new Date(now).toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
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
        return `Hi ${customerName},\nYour Advance Balance Updated.\nAdv due : ${formatLkr(balanceValue)}\nDate: ${new Date(whenIso || Date.now()).toLocaleString()}`;
    }

    function buildSettlementMessage(customerName, amount) {
        const amt = num(amount);
        if (amt > 0) {
            return `Dear ${customerName},\nAs of now, you have to pay us ${formatLkr(amt)}.\nThank you.`;
        }
        if (amt < 0) {
            return `Dear ${customerName},\nAs of now, we have to pay you ${formatLkr(Math.abs(amt))}.\nThank you.`;
        }
        return `Dear ${customerName},\nYour balance is now zero and fully settled.\nThank you.`;
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
        const s = await getScrapSmsSettings(businessId);
        const ev = s && typeof s.events === 'object' ? s.events : {};
        return ev && ev[String(eventKey || '').trim()] === true;
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
                await doc.ref.update({
                    active: false,
                    closedAt: new Date().toISOString(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                closed += 1;
            }
        }
        if (closed > 0) {
            await logEvent(businessId, "LOAN_AUTO_CLOSE", `Closed loans: ${closed}`, "System");
        }
        return { closed };
    }

    function riskStatusByDays(daysSinceSupply) {
        const d = num(daysSinceSupply);
        if (d > 10) return { status: "CRITICAL", risk: "EXTREME", color: "#111827" };
        if (d > 3) return { status: "BLOCKED", risk: "HIGH", color: "#dc2626" };
        if (d === 3) return { status: "WARNING", risk: "MED", color: "#f59e0b" };
        return { status: "ACTIVE", risk: "LOW", color: "#16a34a" };
    }

    function riskPriority(status) {
        const s = String(status || "").toUpperCase();
        if (s === "CRITICAL") return 4;
        if (s === "BLOCKED") return 3;
        if (s === "WARNING") return 2;
        return 1;
    }

    async function runDailyRecovery(businessId) {
        if (!window.db || !businessId) return { queued: 0 };
        const snap = await window.db.collection("scrap_loans")
            .where("businessId", "==", businessId)
            .where("active", "==", true)
            .get();
        let queued = 0;
        for (const doc of snap.docs) {
            const row = doc.data();
            const bal = num(row.balance);
            if (bal <= 0) continue;
            const lastSupplyAt = row.lastSupplyAt ? new Date(row.lastSupplyAt).getTime() : 0;
            const days = lastSupplyAt ? Math.floor((Date.now() - lastSupplyAt) / DAY_MS) : 999;
            const riskMeta = riskStatusByDays(days);
            if (riskMeta.status === "ACTIVE") continue;
            await window.db.collection("scrap_recovery_queue").add({
                businessId,
                loanId: doc.id,
                customerName: row.customerName || "",
                balance: bal,
                daysSinceSupply: days,
                status: riskMeta.status,
                risk: riskMeta.risk,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            queued += 1;
        }
        await logEvent(businessId, "DAILY_RECOVERY", `Queued recoveries: ${queued}`, "System");
        return { queued };
    }

    async function sendPromiseReminders(businessId) {
        if (!window.db || !businessId) return { sent: 0 };
        if (!(await isScrapSmsEventEnabled(businessId, 'interest'))) return { sent: 0, disabled: true };
        const [loanSnap, settingsSnap] = await Promise.all([
            window.db.collection("scrap_loans").where("businessId", "==", businessId).where("active", "==", true).get(),
            window.db.collection("scrap_sms_settings").doc(businessId).get()
        ]);
        const settings = settingsSnap.exists ? settingsSnap.data() : {};
        const template = String(settings.tplLoan || "Hi {{name}},\nYour loan balance is {{balance}}.\nDate: {{date}}\nThank you.");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let sent = 0;

        for (const loanDoc of loanSnap.docs) {
            const row = loanDoc.data();
            if (!row.promiseDate) continue;
            const pDate = new Date(row.promiseDate);
            pDate.setHours(0, 0, 0, 0);
            if (pDate.getTime() !== today.getTime()) continue;
            const cName = String(row.customerName || "").trim();
            if (!cName) continue;
            const customerSnap = await window.db.collection("scrap_customers")
                .where("businessId", "==", businessId)
                .where("name", "==", cName)
                .limit(1)
                .get();
            const customer = customerSnap.empty ? null : customerSnap.docs[0].data();
            const phone = customer?.phone || "";
            if (!phone) continue;
            const msg = template
                .replace(/\{\{name\}\}/g, cName)
                .replace(/\{\{balance\}\}/g, formatLkr(row.balance))
                .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
            await enqueuePendingSms(businessId, phone, msg);
            sent += 1;
        }
        await logEvent(businessId, "PROMISE_REMINDERS", `Reminders queued: ${sent}`, "System");
        return { sent };
    }

    window.scrapVbaCore = {
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
        checkClosedLoans,
        runDailyRecovery,
        riskStatusByDays,
        riskPriority,
        sendPromiseReminders,
        getInventoryAssetBalance,
        syncInventoryAssetWithStock
    };
})();
