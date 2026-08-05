// Scrap VBA core translation helpers (phase 1).
try {
    console.log("ðŸš€ Scrap VBA Core Starting v71...");
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
                date: payload.date ? firebase.firestore.Timestamp.fromDate(new Date(payload.date)) : firebase.firestore.Timestamp.now(),
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
    console.log("âœ… Scrap VBA Core Initialized v71");
})();
} catch(globalErr) {
    console.error("âŒ CRITICAL: scrap-vba-core.js failed to load!", globalErr);
}
