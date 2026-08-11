window.ManufacturerModule = (function () {
    const API = {};
    API.businessId = null;
    API.context = null;

    API.money = function (n) {
        return (Number(n) || 0).toFixed(2);
    };

    API.baseStyles = `
        body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .mfg-wrap { padding: 24px; max-width: 1380px; margin: 0 auto; box-sizing: border-box; }
        @media (max-width: 768px) { .mfg-wrap { padding: 12px; } }
        .mfg-head { margin-bottom: 20px; }
        .mfg-head h2 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.5px; }
        .mfg-head p { font-size: 13px; color: #64748b; margin: 0; }
        .mfg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        @media (max-width: 1024px) { .mfg-grid { grid-template-columns: 1fr; } }
        .mfg-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05); box-sizing: border-box; overflow: hidden; }
        @media (max-width: 640px) { .mfg-card { padding: 14px; border-radius: 10px; } }
        .mfg-card h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
        .mfg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .mfg-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) { .mfg-row, .mfg-row3 { grid-template-columns: 1fr; gap: 10px; } }
        .mfg-card label { display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .mfg-card input, .mfg-card select, .mfg-card textarea { width: 100%; box-sizing: border-box; padding: 10px 14px; font-size: 14px; font-family: inherit; color: #0f172a; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; transition: all 0.2s ease; }
        .mfg-card input:focus, .mfg-card select:focus, .mfg-card textarea:focus { background-color: #ffffff; border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); }
        .mfg-card select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; padding-right: 36px; cursor: pointer; }
        .mfg-msg { margin-top: 10px; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; display: none; }
        .mfg-msg:not(:empty) { display: block; }
        .mfg-msg.err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .mfg-msg:not(.err) { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .mfg-card table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
        th { background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
        tr:hover td { background: #f8fafc; }
        /* Auto responsive table container wrapper */
        .mfg-card > table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
    `;

    API.formatDate = function (v) {
        if (!v) return '-';
        if (typeof v.toDate === 'function') return v.toDate().toLocaleString();
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toLocaleString();
    };

    API.uuid = function (prefix) {
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    };

    API.init = async function (activeKey) {
        return new Promise((resolve) => {
            firebase.auth().onAuthStateChanged(async (u) => {
                if (!u) {
                    window.location.href = '/auth/login.html';
                    return;
                }
                const ctx = window.dashboardCore && window.dashboardCore.getContext
                    ? await window.dashboardCore.getContext(u)
                    : null;
                API.context = ctx || {};
                const rawBid = (ctx && ctx.businessId) || localStorage.getItem('currentBusinessId') || u.uid;
                API.businessId = rawBid != null ? String(rawBid) : null;
                const head = document.getElementById('mfgBusinessCtx');
                if (head) head.textContent = `Business: ${API.businessId}`;
                resolve(API.businessId);
            });
        });
    };

    API.publishEvent = function (type, data) {
        if (window.eventBus && typeof window.eventBus.publish === 'function') {
            window.eventBus.publish(type, data);
        }
    };

    API.firstName = function (fullName) {
        const clean = String(fullName || '').trim().replace(/\s+/g, ' ');
        return clean ? clean.split(' ')[0] : '';
    };

    API.template = function (tpl, data) {
        let s = String(tpl || '');
        Object.keys(data).forEach((k) => {
            const val = data[k];
            s = s.split(`{${k}}`).join(val != null ? val : '');
            s = s.split(`[${k}]`).join(val != null ? val : '');
        });
        return s;
    };

    API.defaultSmsManager = function () {
        return {
            tplSales: '[BRAND] - Hello {Name}, your bill of Rs.{Amount} is confirmed. Bal: Rs.{Balance}.',
            tplInbound: '[BRAND] - {Material} {Qty} purchased today. Value: Rs.{Amount}. {PaymentDetails}',
            tplOutbound: '[BRAND] - {Product} {Qty} sold today. Value: Rs.{Amount}. {PaymentDetails}',
            tplPayment: '[BRAND] - Hi {Name}, received payment Rs.{Amount}. Remaining: Rs.{Balance}.',
            tplDebt: '[BRAND] - Dear {Name}, a friendly reminder of your outstanding Rs.{Amount}. Please settle soon.',
            autoDebtReminders: false,
            events: { inbound: true, outbound: true, payment: true, debt: true }
        };
    };

    API.smsEventAllowed = function (smsManager, smsType) {
        const ev = (smsManager && smsManager.events) || {};
        if (smsType === 'INBOUND_PURCHASE') return ev.inbound !== false;
        if (smsType === 'OUTBOUND_SALE') return ev.outbound !== false;
        if (smsType === 'PAYMENT_CONFIRMATION') return ev.payment !== false;
        if (smsType === 'DEBT_REMINDER') return ev.debt !== false;
        // Legacy support
        if (smsType === 'SALE_CONFIRMATION') return ev.outbound !== false || ev.sales !== false;
        return true;
    };

    let digibizRtdbLoadPromise = null;
    API.ensureFirebaseDatabaseLoaded = function () {
        if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') {
            return Promise.resolve();
        }
        if (digibizRtdbLoadPromise) return digibizRtdbLoadPromise;
        digibizRtdbLoadPromise = new Promise((resolve) => {
            const existing = document.querySelector('script[data-digibiz-rtdb-compat]');
            if (existing) {
                (async () => {
                    for (let i = 0; i < 60; i++) {
                        if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') break;
                        await new Promise((r) => setTimeout(r, 50));
                    }
                    resolve();
                })();
                return;
            }
            const s = document.createElement('script');
            s.src = 'https://www.gstatic.com/firebasejs/12.11.0/firebase-database-compat.js';
            s.async = true;
            s.setAttribute('data-digibiz-rtdb-compat', '1');
            s.onload = () => resolve();
            s.onerror = () => resolve();
            document.head.appendChild(s);
        });
        return digibizRtdbLoadPromise;
    };

    /**
     * Manufacturer pages do not always run subscription-manager; SMS queue needs a non-zero wallet.
     */
    API.ensureSmsWalletSeeded = async function (businessId) {
        if (!businessId || !window.db) return;
        if (window.SmsWalletCore && typeof window.SmsWalletCore.ensureSeeded === 'function') {
            await window.SmsWalletCore.ensureSeeded(String(businessId));
            return;
        }
        const settingsRef = db.collection('settings').doc(businessId);
        const snap = await settingsRef.get().catch(() => null);
        const data = snap && snap.exists ? (snap.data() || {}) : {};
        const wallet = data.smsWallet || {};
        const bal = Number(wallet.smsBalance ?? data.smsBalance ?? 0);
        if (bal > 0) return;
        const TRIAL = (window.subscriptionManager && Number(window.subscriptionManager.TRIAL_SMS_CREDITS)) || 300;
        const UNIT = (window.subscriptionManager && Number(window.subscriptionManager.SMS_UNIT_PRICE)) || 1;
        const FEE = (window.subscriptionManager && Number(window.subscriptionManager.MONTHLY_FEE)) || 1000;
        await settingsRef.set({
            smsWallet: {
                smsBalance: TRIAL,
                lowBalanceThreshold: 50,
                unitPrice: UNIT,
                monthlyFee: FEE,
                trialCreditsGranted: true,
                updatedAt: new Date().toISOString()
            },
            smsBalance: TRIAL,
            smsManager: { ...API.defaultSmsManager(), ...(data.smsManager || {}) }
        }, { merge: true });
    };

    API.enqueueSms = async function (smsType, message, opts = {}) {
        const bizIdStr = API.businessId;
        if (!bizIdStr) return { ok: false, error: 'no_business_id' };

        // 1. Resolve Settings and Template
        const settingsSnap = await db.collection('settings').doc(bizIdStr).get().catch(() => null);
        const settingsData = settingsSnap && settingsSnap.exists ? settingsSnap.data() || {} : {};
        const smsManager = { ...API.defaultSmsManager(), ...(settingsData.smsManager || {}) };
        
        if (!API.smsEventAllowed(smsManager, smsType)) {
            return { ok: false, skipped: 'sms_event_disabled' };
        }

        const header = String(settingsData.smsHeader || 'DIGIBIZ').trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
        const to = String(opts.mobile || '').trim();
        if (to.length < 9) return { ok: false, skipped: 'no_mobile' };

        // Fetch Real-time Total Balance for SMS transparency
        let totalBalance = Number(opts.balance || 0);
        if (opts.customerId) {
            const snapshot = await API.getCustomerFinanceSnapshot(bizIdStr, opts.customerId);
            const currentAmount = Number(opts.amount || 0);
            const applyDelta = opts.applyDelta !== false;
            totalBalance = Number(snapshot.netBalance || 0);

            // show the immediate "after this transaction" balance for flows that save before posting to ledgers
            if (applyDelta && smsType === 'INBOUND_PURCHASE') {
                totalBalance -= currentAmount;
            } else if (applyDelta && smsType === 'OUTBOUND_SALE') {
                totalBalance += currentAmount;
            } else if (applyDelta && smsType === 'PAYMENT_CONFIRMATION') {
                if (opts.type === 'PAYMENT_GIVEN') totalBalance += currentAmount;
                else totalBalance -= currentAmount;
            }
        }

        let tpl = '';
        if (smsType === 'INBOUND_PURCHASE') tpl = smsManager.tplInbound;
        else if (smsType === 'OUTBOUND_SALE') tpl = smsManager.tplOutbound;
        else if (smsType === 'PAYMENT_CONFIRMATION') tpl = smsManager.tplPayment;
        else if (smsType === 'DEBT_REMINDER') tpl = smsManager.tplDebt;
        else tpl = String(message || '').trim();

        // 2. Prepare Template Data
        const amount = Number(opts.amount || 0).toFixed(2);
        const balanceDisp = Math.abs(totalBalance).toFixed(2);
        const balanceSign = totalBalance > 0 ? ' (To Receive)' : (totalBalance < 0 ? ' (To Pay)' : '');
        const first = API.firstName(opts.name || '');
        
        let paymentDetails = '';
        if (smsType === 'INBOUND_PURCHASE' || smsType === 'OUTBOUND_SALE') {
            const isPaid = opts.paymentStatus === 'PAID';
            if (isPaid) {
                paymentDetails = `We paid you Rs.${amount} (Cash).`;
                if (smsType === 'OUTBOUND_SALE') paymentDetails = `Payment of Rs.${amount} received (Cash).`;
            } else {
                const dateStr = opts.dueDate ? new Date(opts.dueDate).toLocaleDateString() : 'a later date';
                paymentDetails = `Amount not paid today. Expecting to settle on ${dateStr}.`;
                if (smsType === 'OUTBOUND_SALE') paymentDetails = `Payment pending. Expecting to receive on ${dateStr}.`;
            }
        }

        const data = {
            BRAND: header,
            Name: first || 'Customer',
            Amount: amount,
            Balance: `${balanceDisp}${balanceSign}`,
            Material: opts.materialName || 'Material',
            Product: opts.productName || 'Product',
            Qty: opts.qty || '',
            PaymentDetails: paymentDetails,
            ...opts
        };

        let branded = API.template(tpl, data);
        if (!branded.startsWith('[')) branded = `[${header}] - ${branded}`;

        // 3. PRIMARY: Write to Realtime Database immediately (Saves Firestore Reads)
        let rtdbSuccess = false;
        const rtdbId = `sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        try {
            await API.ensureFirebaseDatabaseLoaded();
            if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') {
                await firebase.database().ref(`sms_gateway/${bizIdStr}/pending_sms/${rtdbId}`).set({
                    businessId: bizIdStr,
                    mobile: to,
                    message: branded,
                    ts: Date.now(),
                    type: smsType
                });
                rtdbSuccess = true;
                console.info('[Manufacturer SMS] RTDB Primary write successful.');
            }
        } catch (rtdbErr) {
            console.warn('[Manufacturer SMS] RTDB Primary write failed:', rtdbErr);
        }

        // 4. ACCOUNTING: Update Firestore Balance using increment (Saves Reads Quota)
        try {
            const settingsRef = db.collection('settings').doc(bizIdStr);
            const isolatedRef = db.collection('businesses').doc(bizIdStr).collection('pending_sms').doc(rtdbId);
            
            const updatePayload = {
                smsBalance: firebase.firestore.FieldValue.increment(-1),
                "smsWallet.smsBalance": firebase.firestore.FieldValue.increment(-1),
                "smsWallet.updatedAt": new Date().toISOString()
            };

            const historyPayload = {
                businessId: bizIdStr,
                type: smsType,
                message: branded,
                mobile: to,
                status: 'sent_via_rtdb',
                creditCharged: 1,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await Promise.all([
                settingsRef.update(updatePayload).catch(e => console.warn('Balance update failed:', e.message)),
                isolatedRef.set(historyPayload).catch(e => console.warn('History log failed:', e.message))
            ]);

            return { ok: true, via: 'rtdb' };
        } catch (e) {
            console.warn('[Manufacturer SMS] Firestore accounting failed, but SMS sent via RTDB.');
            return { ok: true, fallback: true };
        }
    };

    API.getCustomerBalance = async function (bid, cid) {
        if (!bid || !cid) return 0;
        try {
            const snap = await db.collection('journal').doc(bid).collection('entries').get();
            let bal = 0;
            snap.docs.forEach(doc => {
                const entry = doc.data();
                (entry.entries || []).forEach(line => {
                    if (line.customerId === cid || line.supplierId === cid) {
                        bal += (Number(line.debit) || 0) - (Number(line.credit) || 0);
                    }
                });
            });
            return bal;
        } catch (e) {
            console.warn('[MFG] Balance fetch failed:', e);
            return 0;
        }
    };

    API.getCustomerFinanceSnapshot = async function (bid, cid, optFullName) {
        const empty = {
            payableTotal: 0,
            receivableTotal: 0,
            paymentGivenTotal: 0,
            paymentReceivedTotal: 0,
            netBalance: 0
        };
        if (!bid || !cid) return empty;

        try {
            const isScrap = API.context && API.context.businessType === 'scrap_collection_center';
            
            const inboundColl = isScrap ? 'buying_history' : 'manufacturer_raw_material_history';
            const outboundColl = isScrap ? 'selling_history' : 'manufacturer_sales';

            // In scrap mode, we often need the full name to query history collections
            let resolvedName = optFullName || cid;
            if (isScrap && !optFullName) {
                // Fallback: try to get name from customers collection if cid looks like a doc ID
                try {
                    const cSnap = await db.collection('customers').doc(cid).get();
                    if (cSnap.exists) resolvedName = cSnap.data().fullName || cid;
                } catch (e) {
                    console.warn('[MFG] Could not resolve customer name for snapshot:', e);
                }
            }

            const [inboundSnap, outboundSnap, financeSnap] = await Promise.all([
                db.collection(inboundColl)
                    .where('businessId', '==', bid)
                    .where(isScrap ? 'supplierName' : 'customerId', '==', resolvedName)
                    .get()
                    .catch(() => ({ docs: [] })),
                db.collection(outboundColl)
                    .where('businessId', '==', bid)
                    .where(isScrap ? 'customerName' : 'customerId', '==', resolvedName)
                    .get()
                    .catch(() => ({ docs: [] })),
                db.collection('finance_transactions')
                    .where('businessId', '==', bid)
                    .where('customerId', '==', cid)
                    .get()
                    .catch(() => ({ docs: [] }))
            ]);

            const payableTotal = inboundSnap.docs.reduce((sum, d) => {
                const x = d.data() || {};
                if (!isScrap && !['PENDING', 'PENDING_CLEARANCE'].includes(x.paymentStatus)) return sum;
                return sum + (Number(x.totalAmount || x.amount) || 0);
            }, 0);
            
            const receivableTotal = outboundSnap.docs.reduce((sum, d) => {
                const x = d.data() || {};
                if (!isScrap && !['PENDING', 'PENDING_CLEARANCE'].includes(x.paymentStatus)) return sum;
                return sum + (Number(x.totalAmount || x.amount) || 0);
            }, 0);

            const paymentGivenTotal = financeSnap.docs.reduce((sum, d) => {
                const x = d.data() || {};
                if (x.isActive === false) return sum;
                return x.type === 'PAYMENT_GIVEN' ? sum + (Number(x.amount) || 0) : sum;
            }, 0);
            const paymentReceivedTotal = financeSnap.docs.reduce((sum, d) => {
                const x = d.data() || {};
                if (x.isActive === false) return sum;
                return x.type === 'PAYMENT_RECEIVED' ? sum + (Number(x.amount) || 0) : sum;
            }, 0);

            const netBalance = (receivableTotal - paymentReceivedTotal) - (payableTotal - paymentGivenTotal);
            return { payableTotal, receivableTotal, paymentGivenTotal, paymentReceivedTotal, netBalance };
        } catch (err) {
            console.warn('[MFG] Finance snapshot fetch failed:', err);
            return empty;
        }
    };

    API.baseStyles = `
        body{font-family:Inter,system-ui,sans-serif;background:#f3f4f6;margin:0;color:#0f172a;}
        .mfg-wrap{padding:20px;max-width:none;width:100%;}
        .mfg-head{margin-bottom:12px;}
        .mfg-head h2{margin:0;font-size:22px;}
        .mfg-head p{margin:6px 0 0;color:#475569;font-size:12px;}
        .mfg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}
        .mfg-card{background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.08);}
        .mfg-card h3{margin:0 0 10px;font-size:15px;}
        .mfg-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .mfg-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
        label{display:block;font-size:12px;color:#334155;margin-bottom:4px;}
        input,select,textarea{width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;}
        button{background:#0f766e;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;}
        button.secondary{background:#334155;}
        .mfg-msg{font-size:12px;margin-top:8px;color:#065f46;min-height:14px;}
        .mfg-msg.warn{color:#92400e;}
        .mfg-msg.err{color:#991b1b;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th,td{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left;vertical-align:top;}
        .wrap-name{white-space:normal;word-break:break-word;overflow-wrap:anywhere;line-height:1.35;}
        .pill{padding:2px 8px;border-radius:999px;font-size:11px;}
        .pill.paid{background:#dcfce7;color:#166534;}
        .pill.pending{background:#fee2e2;color:#991b1b;}
        .aging-overdue{background:#fee2e2 !important;color:#991b1b;}
        .aging-soon{background:#fef9c3 !important;color:#854d0e;}
        @media (max-width:900px){.mfg-row,.mfg-row3{grid-template-columns:1fr;}}
        .mfg-customer-banner{font-size:10px;margin-top:2px;display:none;color:#16a34a;font-weight:500;padding:0;background:none;border:none;}
        .mfg-customer-banner.show{display:block;}
        .mfg-customer-banner.warn{color:#ca8a04;}
        .mfg-customer-banner.ok{color:#16a34a;}
        .mfg-customer-banner.err{color:#dc2626;}
        select.mfg-select-customer{font-size:14px;font-weight:500;}
    `;

    API.saveFieldSuggestion = async function (fieldKey, value) {
        if (window.DigiBizUI) return window.DigiBizUI.saveFieldSuggestion(fieldKey, value);
        
        const raw = String(value || '').trim();
        if (!raw || !API.businessId) return;
        const id = `${fieldKey}_${raw.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await db.collection('businesses').doc(API.businessId).collection('manufacturer_field_suggestions').doc(id).set({
            businessId: API.businessId,
            fieldKey: fieldKey,
            value: raw,
            updatedAt: new Date()
        }, { merge: true });
    };

    API.loadFieldSuggestions = async function (fieldKey) {
        if (window.DigiBizUI) return window.DigiBizUI.loadFieldSuggestions(fieldKey);
        
        if (!API.businessId) return [];
        const snap = await db.collection('businesses').doc(API.businessId).collection('manufacturer_field_suggestions')
            .where('fieldKey', '==', fieldKey)
            .orderBy('value')
            .get()
            .catch(() => ({ docs: [] }));
        return snap.docs.map((d) => (d.data() || {}).value).filter(Boolean);
    };

    API.bindAutocomplete = async function (inputId, fieldKey) {
        if (window.DigiBizUI) return window.DigiBizUI.bindAutocomplete(inputId, fieldKey);
        
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const listId = `${inputId}_datalist`;
        let datalist = document.getElementById(listId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            document.body.appendChild(datalist);
        }
        input.setAttribute('list', listId);

        const refreshList = async () => {
            const suggestions = await API.loadFieldSuggestions(fieldKey);
            datalist.innerHTML = suggestions.map(s => `<option value="${s}"></option>`).join('');
        };

        await refreshList();
        
        return async () => {
            const val = input.value.trim();
            if (val) {
                await API.saveFieldSuggestion(fieldKey, val);
                await refreshList();
            }
        };
    };

    // Legacy support
    API.saveCategory = (group, name) => API.saveFieldSuggestion(group, name);
    API.loadCategories = (group) => API.loadFieldSuggestions(group);

    /**
     * Flat accounting mirrors (supplier_ledger + account_balances) for distributor-style KPIs.
     * Journal double-entry remains in journal/{businessId}/entries via accounts-core events.
     */
    API.upsertFlatAccountBalance = async function (businessId, accountName, delta, when) {
        const idPart = String(accountName || '').trim();
        if (!businessId || !idPart || !window.db) return;
        const ref = window.db.collection('account_balances').doc(String(businessId) + '__' + idPart.replace(/\s+/g, '_').toUpperCase());
        await window.db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const cur = snap.exists ? (Number((snap.data() || {}).balance) || 0) : 0;
            const next = cur + (Number(delta) || 0);
            tx.set(ref, {
                businessId,
                account: idPart,
                balance: next,
                updatedAt: when || new Date()
            }, { merge: true });
        });
    };

    API.addSupplierLedgerRow = async function ({ businessId, supplierId, supplierName, amount, type, reference, date }) {
        if (!businessId || !window.db) return;
        const amt = Number(amount) || 0;
        if (amt <= 0) return;
        const d = date instanceof Date ? date.toISOString().slice(0, 10) : (typeof date === 'string' ? date.slice(0, 10) : new Date().toISOString().slice(0, 10));
        await window.db.collection('supplier_ledger').add({
            supplierId: supplierId || '',
            supplierName: String(supplierName || '').trim() || 'Supplier',
            amount: amt,
            type: String(type || 'credit').toLowerCase(),
            reference: String(reference || ''),
            date: d,
            businessId,
            createdAt: new Date()
        });
    };

    API.syncFlatAccountingRawMaterialPurchase = async function (data) {
        const bid = data.businessId;
        const amt = Number(data.amount) || 0;
        if (!bid || amt <= 0) return;
        const refText = 'MFG_RM/' + String(data.purchaseId || '');
        const postingDate = data.createdAt && data.createdAt.toDate
            ? data.createdAt.toDate().toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        await API.addSupplierLedgerRow({
            businessId: bid,
            supplierId: data.customerId || '',
            supplierName: data.supplierName,
            amount: amt,
            type: 'credit',
            reference: refText,
            date: postingDate
        });
        const now = new Date();
        await Promise.all([
            API.upsertFlatAccountBalance(bid, 'Purchases', amt, now),
            API.upsertFlatAccountBalance(bid, 'Inventory', amt, now),
            API.upsertFlatAccountBalance(bid, 'SupplierOutstanding', amt, now),
            API.upsertFlatAccountBalance(bid, 'StockValue', amt, now)
        ]);
    };

    API.syncFlatAccountingFinishedGoodSale = async function (data) {
        const bid = data.businessId;
        const cogs = Number(data.cogsAmount) || 0;
        if (!bid || cogs <= 0) return;
        await API.upsertFlatAccountBalance(bid, 'StockValue', -cogs, new Date());
    };

    API.syncFlatAccountingOperationalExpense = async function (data) {
        const bid = data.businessId;
        const amt = Number(data.amount) || 0;
        if (!bid || amt <= 0) return;
        await API.upsertFlatAccountBalance(bid, 'OperatingExpenses', amt, new Date());
    };

    API.syncFlatAccountingProductionRecorded = async function (data) {
        const bid = data.businessId;
        const totalRmCost = Number(data.totalRmCost) || 0;
        const totalLaborOverhead = (Number(data.laborCost) || 0) + (Number(data.overheadCost) || 0);
        const totalBatchCost = Number(data.totalBatchCost) || (totalRmCost + totalLaborOverhead);
        if (!bid || totalBatchCost <= 0) return;
        const now = new Date();
        await Promise.all([
            API.upsertFlatAccountBalance(bid, 'RawMaterialStockValue', -totalRmCost, now),
            API.upsertFlatAccountBalance(bid, 'FinishedGoodsStockValue', totalBatchCost, now),
            API.upsertFlatAccountBalance(bid, 'StockValue', totalLaborOverhead, now)
        ]);
    };

    return API;
})();
