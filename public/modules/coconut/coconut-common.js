/**
 * Coconut Wholesale & Husk Products Module — Shared Helper Library
 * Standalone, self-contained business module layer for DigiBiz platform.
 */

window.CoconutModule = (function () {
    const Mod = {};

    Mod.businessId = null;
    Mod.context = null;

    // --- Formatters ---
    Mod.fmt = function (num, decimals = 2) {
        const n = Number(num) || 0;
        return n.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    };

    Mod.fmtLKR = function (num) {
        return 'Rs. ' + Mod.fmt(num, 2);
    };

    Mod.esc = function (str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    Mod.uid = function (prefix = 'c') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    };

    // --- Date Helpers ---
    Mod.parseDateAny = function (val) {
        if (!val) return null;
        if (typeof val.toDate === 'function') return val.toDate();
        if (val.seconds !== undefined) return new Date(val.seconds * 1000);
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
        if (typeof val === 'number') return new Date(val);
        if (typeof val === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                const [y, m, d] = val.split('-').map(Number);
                return new Date(y, m - 1, d, 12, 0, 0);
            }
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    };

    Mod.toLocalDateStr = function (d) {
        const dt = Mod.parseDateAny(d) || new Date();
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    Mod.formatDateTime = function (d) {
        const dt = Mod.parseDateAny(d);
        if (!dt) return '-';
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    Mod.formatDate = function (d) {
        const dt = Mod.parseDateAny(d);
        if (!dt) return '-';
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    Mod.startOfToday = function () {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    };

    Mod.startOfMonth = function () {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    Mod.tsToFirestore = function (dateObj) {
        const d = Mod.parseDateAny(dateObj) || new Date();
        if (window.firebase && window.firebase.firestore && window.firebase.firestore.Timestamp) {
            return window.firebase.firestore.Timestamp.fromDate(d);
        }
        return d;
    };

    Mod.getDb = function () {
        return window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
    };

    Mod.getAuth = function () {
        return window.firebase && window.firebase.auth ? window.firebase.auth() : null;
    };

    // --- Authentication & Business Context ---
    Mod.resolveContext = async function (user) {
        if (!user) return null;
        const db = Mod.getDb();
        if (!db) throw new Error('Firestore not initialized');

        let businessId = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || user.uid;
        let businessType = 'coconut';
        let businessName = 'Coconut Wholesale & Husk Products';
        let userRole = 'BUSINESS_OWNER';
        let logoUrl = '';

        try {
            // Check users doc
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const ud = userDoc.data() || {};
                if (ud.businessId) businessId = ud.businessId;
                if (ud.role) userRole = ud.role;
            }

            // Check businesses doc
            const bizDoc = await db.collection('businesses').doc(businessId).get();
            if (bizDoc.exists) {
                const bd = bizDoc.data() || {};
                businessName = bd.name || businessName;
                businessType = bd.businessType || businessType;
                logoUrl = bd.logoUrl || '';
            }
        } catch (e) {
            console.warn('[CoconutModule] Context resolve warning:', e);
        }

        Mod.businessId = businessId;
        Mod.context = {
            userId: user.uid,
            businessId,
            businessType,
            businessName,
            userRole,
            userEmail: user.email || '',
            logoUrl
        };

        localStorage.setItem('currentBusinessId', businessId);
        sessionStorage.setItem('currentBusinessId', businessId);
        localStorage.setItem('currentBusinessType', businessType);

        return Mod.context;
    };

    Mod.guardCoconutPage = function () {
        return new Promise((resolve) => {
            const auth = Mod.getAuth();
            if (!auth) {
                console.error('[CoconutModule] Firebase Auth not loaded');
                resolve(null);
                return;
            }

            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    window.location.href = '/auth/login.html';
                    resolve(null);
                    return;
                }
                const ctx = await Mod.resolveContext(user);
                resolve(ctx);
            });
        });
    };

    // --- Double-Entry Accounting Invariant Poster ---
    Mod.postJournalEntry = async function ({ businessId, description, referenceType, ref, date, lines, batch }) {
        const db = Mod.getDb();
        if (!db || !businessId) throw new Error('Cannot post journal: DB or BusinessId missing');

        let totalDebit = 0;
        let totalCredit = 0;
        const normalizedLines = (lines || []).map(line => {
            const dr = Number(line.debit) || 0;
            const cr = Number(line.credit) || 0;
            totalDebit += dr;
            totalCredit += cr;
            return {
                accountCode: String(line.accountCode || '').trim(),
                accountName: String(line.accountName || '').trim(),
                debit: dr,
                credit: cr
            };
        });

        // Round to 2 decimals for floating point comparisons
        totalDebit = Number(totalDebit.toFixed(2));
        totalCredit = Number(totalCredit.toFixed(2));

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            console.error('[Journal Error] Unbalanced entry:', { description, totalDebit, totalCredit, lines });
            throw new Error(`Unbalanced journal entry: Total Debit (${totalDebit}) !== Total Credit (${totalCredit})`);
        }

        const entryDocId = `JE_${Mod.uid('c')}`;
        const journalDocRef = db.collection('journal').doc(businessId).collection('entries').doc(entryDocId);

        const journalData = {
            businessId,
            date: Mod.tsToFirestore(date || new Date()),
            description: String(description || 'Coconut Business Transaction'),
            ref: String(ref || ''),
            referenceType: String(referenceType || 'COCONUT_TX'),
            totalDebit,
            totalCredit,
            entries: normalizedLines,
            createdAt: Mod.tsToFirestore(new Date()),
            isActive: true
        };

        if (batch) {
            batch.set(journalDocRef, journalData);
            return entryDocId;
        } else {
            await journalDocRef.set(journalData);
            return entryDocId;
        }
    };

    Mod.calcAccountBalance = function (entries, prefixOrMatcher) {
        let balance = 0;
        (entries || []).forEach(entry => {
            if (entry.isActive === false || entry.isReversed === true) return;
            (entry.entries || []).forEach(line => {
                const code = String(line.accountCode || '');
                const match = typeof prefixOrMatcher === 'function'
                    ? prefixOrMatcher(code, line.accountName)
                    : code.startsWith(prefixOrMatcher);
                if (match) {
                    balance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
                }
            });
        });
        return balance;
    };

    Mod.calcCashFlow = function (entries) {
        return Mod.calcAccountBalance(entries, (code) => code.startsWith('1-1010') || code.startsWith('1-1020'));
    };

    // --- Standalone Metrics Aggregator ---
    Mod.getMetrics = async function (context) {
        const bid = context.businessId;
        const db = Mod.getDb();
        if (!db || !bid) return {};

        const startToday = Mod.startOfToday();
        const startMonth = Mod.startOfMonth();

        // 30 Days trend setup
        const dayLabels30 = [];
        const dayKeys30 = [];
        const dayIdx = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date(startToday);
            d.setDate(d.getDate() - i);
            const k = Mod.toLocalDateStr(d);
            dayKeys30.push(k);
            dayIdx[k] = 29 - i;
            dayLabels30.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
        }

        const seriesCoconutPurchases30 = new Array(30).fill(0);
        const seriesSales30 = new Array(30).fill(0);
        const seriesProfit30 = new Array(30).fill(0);
        const seriesProduction30 = new Array(30).fill(0);

        const paymentSplitPurchases = { CASH: 0, CREDIT: 0, CHEQUE: 0, BANK: 0 };
        const paymentSplitSales = { CASH: 0, CREDIT: 0, CHEQUE: 0, BANK: 0 };

        const [
            coconutPurchasesSnap,
            huskPurchasesSnap,
            coconutStockSnap,
            huskStockDoc,
            productionRunsSnap,
            finishedProductsSnap,
            salesSnap,
            expensesSnap,
            journalSnap,
            loansSnap
        ] = await Promise.all([
            db.collection('coconut_raw_material_history').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            db.collection('coconut_husk_purchases').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            db.collection('coconut_raw_coconuts').doc(bid).collection('items').get().catch(() => ({ docs: [] })),
            db.collection('coconut_husk_raw').doc(bid).collection('items').doc('current').get().catch(() => ({ exists: false })),
            db.collection('coconut_production_runs').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            db.collection('coconut_finished_products').doc(bid).collection('items').get().catch(() => ({ docs: [] })),
            db.collection('coconut_sales').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            db.collection('coconut_expenses').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            db.collection('journal').doc(bid).collection('entries').get().catch(() => ({ docs: [] })),
            db.collection('coconut_loans').where('businessId', '==', bid).get().catch(() => ({ docs: [] }))
        ]);

        // 1. Coconut Purchases
        let todayCoconutPurchaseCount = 0;
        let monthCoconutPurchaseCount = 0;
        let monthPurchaseCost = 0;

        coconutPurchasesSnap.docs.forEach(doc => {
            const data = doc.data() || {};
            if (data.isActive === false) return;
            const dt = Mod.parseDateAny(data.date || data.createdAt);
            const total = Number(data.totalCost || data.amount) || 0;
            const qty = Number(data.quantity) || 0;
            const mode = String(data.paymentMode || 'CASH').toUpperCase();

            if (dt) {
                if (dt >= startToday) todayCoconutPurchaseCount += qty;
                if (dt >= startMonth) {
                    monthCoconutPurchaseCount += qty;
                    monthPurchaseCost += total;
                }
                const dayKey = Mod.toLocalDateStr(dt);
                if (dayIdx[dayKey] !== undefined) {
                    const idx = dayIdx[dayKey];
                    seriesCoconutPurchases30[idx] += total;
                    seriesProfit30[idx] -= total;
                }
            }

            if (paymentSplitPurchases[mode] !== undefined) paymentSplitPurchases[mode] += total;
            else paymentSplitPurchases.CASH += total;
        });

        // Husk Purchases contribution to month purchase cost
        huskPurchasesSnap.docs.forEach(doc => {
            const data = doc.data() || {};
            if (data.isActive === false) return;
            const dt = Mod.parseDateAny(data.date || data.createdAt);
            const total = Number(data.totalCost || data.amount) || 0;
            const mode = String(data.paymentMode || 'CASH').toUpperCase();

            if (dt && dt >= startMonth) {
                monthPurchaseCost += total;
            }
            if (paymentSplitPurchases[mode] !== undefined) paymentSplitPurchases[mode] += total;
            else paymentSplitPurchases.CASH += total;
        });

        // 2. Stock Values
        let coconutStockQty = 0;
        let rmStockValue = 0;
        coconutStockSnap.docs.forEach(doc => {
            const item = doc.data() || {};
            const q = Number(item.stockQty) || 0;
            const c = Number(item.avgCostPerUnit || item.lastUnitCost) || 0;
            coconutStockQty += q;
            rmStockValue += (q * c);
        });

        let huskStockQty = 0;
        if (huskStockDoc.exists) {
            const hd = huskStockDoc.data() || {};
            huskStockQty = Number(hd.stockKg) || 0;
            rmStockValue += (huskStockQty * (Number(hd.avgCostPerKg) || 0));
        }

        let fgStockValue = 0;
        finishedProductsSnap.docs.forEach(doc => {
            const item = doc.data() || {};
            if (item.isActive === false) return;
            const q = Number(item.stockQty) || 0;
            const c = Number(item.unitCost) || 0;
            fgStockValue += (q * c);
        });

        // 3. Production Runs
        let todayProductionCount = 0;
        let monthProductionCount = 0;
        let monthProductionCost = 0;

        productionRunsSnap.docs.forEach(doc => {
            const data = doc.data() || {};
            if (data.isActive === false) return;
            const dt = Mod.parseDateAny(data.runDate || data.createdAt);
            const qty = Number(data.producedQty) || 0;
            const pCost = Number(data.processingCost) || 0;

            if (dt) {
                if (dt >= startToday) todayProductionCount += qty;
                if (dt >= startMonth) {
                    monthProductionCount += qty;
                    monthProductionCost += pCost;
                }
                const dayKey = Mod.toLocalDateStr(dt);
                if (dayIdx[dayKey] !== undefined) {
                    seriesProduction30[dayIdx[dayKey]] += 1;
                }
            }
        });

        // 4. Sales & COGS
        let todaySales = 0;
        let monthSales = 0;
        let monthCogs = 0;

        salesSnap.docs.forEach(doc => {
            const data = doc.data() || {};
            if (data.isActive === false) return;
            const dt = Mod.parseDateAny(data.date || data.createdAt);
            const amt = Number(data.amount) || 0;
            const cogs = Number(data.cogsAmount) || 0;
            const mode = String(data.paymentMode || 'CASH').toUpperCase();

            if (dt) {
                if (dt >= startToday) todaySales += amt;
                if (dt >= startMonth) {
                    monthSales += amt;
                    monthCogs += cogs;
                }
                const dayKey = Mod.toLocalDateStr(dt);
                if (dayIdx[dayKey] !== undefined) {
                    const idx = dayIdx[dayKey];
                    seriesSales30[idx] += amt;
                    seriesProfit30[idx] += (amt - cogs);
                }
            }

            if (paymentSplitSales[mode] !== undefined) paymentSplitSales[mode] += amt;
            else paymentSplitSales.CASH += amt;
        });

        // 5. Expenses
        let monthOperationalCost = 0;
        expensesSnap.docs.forEach(doc => {
            const data = doc.data() || {};
            if (data.isActive === false) return;
            const dt = Mod.parseDateAny(data.date || data.createdAt);
            const amt = Number(data.amount) || 0;
            if (dt && dt >= startMonth) {
                monthOperationalCost += amt;
            }
        });

        // 6. GL & Cash Balances
        const journalEntries = journalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const cashBalance = Mod.calcAccountBalance(journalEntries, '1-1010-01');
        const bankBalance = Mod.calcAccountBalance(journalEntries, '1-1020-01');
        const customerReceivables = Mod.calcAccountBalance(journalEntries, '1-1030-01');
        const supplierPayables = -Mod.calcAccountBalance(journalEntries, '2-2010-01');
        const loansPayable = -Mod.calcAccountBalance(journalEntries, '2-2030-01');
        const cashFlow = cashBalance + bankBalance;

        // Month Profit: Sales - COGS - Expenses
        const monthProfit = monthSales - monthCogs - monthOperationalCost;

        // Recent 10 Combined Transactions
        const recentActivity = [];
        coconutPurchasesSnap.docs.forEach(d => {
            const r = d.data() || {};
            if (r.isActive !== false) {
                recentActivity.push({
                    type: 'COCONUT_PURCHASE',
                    title: `Coconut Purchase (${r.quantity} nuts)`,
                    party: r.supplierName || 'Supplier',
                    amount: r.totalCost || r.amount,
                    date: Mod.parseDateAny(r.date || r.createdAt),
                    badge: 'purchase'
                });
            }
        });
        huskPurchasesSnap.docs.forEach(d => {
            const r = d.data() || {};
            if (r.isActive !== false) {
                recentActivity.push({
                    type: 'HUSK_PURCHASE',
                    title: `Husk Purchase (${r.quantityKg} kg)`,
                    party: r.supplierName || 'Supplier',
                    amount: r.totalCost || r.amount,
                    date: Mod.parseDateAny(r.date || r.createdAt),
                    badge: 'purchase'
                });
            }
        });
        productionRunsSnap.docs.forEach(d => {
            const r = d.data() || {};
            if (r.isActive !== false) {
                recentActivity.push({
                    type: 'PRODUCTION',
                    title: `Produced: ${r.transformationName || 'Finished Goods'} (${r.producedQty} units)`,
                    party: `Cost: Rs. ${Mod.fmt(r.totalRunCost)}`,
                    amount: r.totalRunCost,
                    date: Mod.parseDateAny(r.runDate || r.createdAt),
                    badge: 'production'
                });
            }
        });
        salesSnap.docs.forEach(d => {
            const r = d.data() || {};
            if (r.isActive !== false) {
                recentActivity.push({
                    type: 'SALE',
                    title: `Sale Invoiced`,
                    party: r.customerName || 'Customer',
                    amount: r.amount,
                    date: Mod.parseDateAny(r.date || r.createdAt),
                    badge: 'sale'
                });
            }
        });

        recentActivity.sort((a, b) => {
            const ta = a.date ? a.date.getTime() : 0;
            const tb = b.date ? b.date.getTime() : 0;
            return tb - ta;
        });

        return {
            todayCoconutPurchaseCount,
            monthCoconutPurchaseCount,
            monthPurchaseCost,
            coconutStockQty,
            huskStockQty,
            todaySales,
            monthSales,
            monthCogs,
            todayProductionCount,
            monthProductionCount,
            fgStockValue,
            rmStockValue,
            monthProfit,
            cashBalance,
            bankBalance,
            customerReceivables: Math.max(0, customerReceivables),
            supplierPayables: Math.max(0, supplierPayables),
            loansPayable: Math.max(0, loansPayable),
            cashFlow,
            trendLabels30: dayLabels30,
            trendCoconutPurchases30: seriesCoconutPurchases30,
            trendSales30: seriesSales30,
            trendProfit30: seriesProfit30,
            trendProduction30: seriesProduction30,
            paymentSplitPurchases,
            paymentSplitSales,
            recentActivity: recentActivity.slice(0, 10)
        };
    };

    // --- Navigation (Managed by global DIGIBIZ Core Sidebar) ---
    Mod.renderNav = function (activeId = 'dashboard') {
        const root = document.getElementById('nav-root');
        if (root) root.innerHTML = '';
    };

    // --- Toast Notifications ---
    Mod.showToast = function (msg, type = 'info') {
        let container = document.getElementById('c-toast-root');
        if (!container) {
            container = document.createElement('div');
            container.id = 'c-toast-root';
            container.className = 'c-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `c-toast ${type}`;
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${Mod.esc(msg)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // --- Lightweight Canvas Chart Renderer (No external CDN required) ---
    Mod.drawBarChart = function (canvasId, labels, data, color = '#059669', title = '') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.parentElement.clientWidth || 320;
        const h = canvas.height = canvas.parentElement.clientHeight || 180;

        ctx.clearRect(0, 0, w, h);
        if (!data || !data.length) return;

        const max = Math.max(...data, 10);
        const padding = 30;
        const chartW = w - padding * 2;
        const chartH = h - padding * 2;
        const barW = Math.max(4, (chartW / data.length) - 4);

        // Axis
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        data.forEach((val, i) => {
            const x = padding + (i * (chartW / data.length)) + 2;
            const barH = (val / max) * chartH;
            const y = (h - padding) - barH;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]) : ctx.rect(x, y, barW, barH);
            ctx.fill();
        });
    };

    Mod.drawLineChart = function (canvasId, labels, seriesArray) {
        // seriesArray: [{ name, data, color }]
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.parentElement.clientWidth || 600;
        const h = canvas.height = canvas.parentElement.clientHeight || 240;

        ctx.clearRect(0, 0, w, h);
        if (!labels || !labels.length) return;

        let allVals = [];
        seriesArray.forEach(s => { allVals = allVals.concat(s.data); });
        const max = Math.max(...allVals, 10);
        const min = Math.min(...allVals, 0);
        const range = (max - min) || 1;

        const padLeft = 45;
        const padRight = 20;
        const padTop = 20;
        const padBottom = 35;
        const chartW = w - padLeft - padRight;
        const chartH = h - padTop - padBottom;

        // Grid lines
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padTop + (i * (chartH / 4));
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(w - padRight, y);
            ctx.stroke();

            const v = max - (i * (range / 4));
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(Mod.fmt(v, 0), padLeft - 6, y + 3);
        }

        // Draw each line series
        seriesArray.forEach(series => {
            ctx.strokeStyle = series.color || '#059669';
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            series.data.forEach((val, i) => {
                const x = padLeft + (i * (chartW / (labels.length - 1 || 1)));
                const y = padTop + chartH - (((val - min) / range) * chartH);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Dots
            ctx.fillStyle = series.color;
            series.data.forEach((val, i) => {
                const x = padLeft + (i * (chartW / (labels.length - 1 || 1)));
                const y = padTop + chartH - (((val - min) / range) * chartH);
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // X-axis labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        const step = Math.ceil(labels.length / 6);
        labels.forEach((lbl, i) => {
            if (i % step === 0 || i === labels.length - 1) {
                const x = padLeft + (i * (chartW / (labels.length - 1 || 1)));
                ctx.fillText(lbl, x, h - 12);
            }
        });
    };

    return Mod;
})();
