// Universal Dashboard Core - business-aware metrics aggregator

class DashboardCore {
    normalizeBusinessType(typeRaw) {
        const raw = String(typeRaw || '').trim().toLowerCase();
        if (!raw) return 'retail';
        const compact = raw.replace(/[\s\-_]+/g, '');
        if (compact === 'teafactory') return 'manufacturer';
        if (compact === 'scrapcollectioncenter') return 'scrap_collection_center';
        if (compact === 'distributor') return 'distributor';
        if (compact === 'manufacturer') return 'manufacturer';
        if (compact === 'pharmacy') return 'pharmacy';
        if (compact === 'hardware') return 'hardware';
        if (compact === 'service') return 'service';
        if (compact === 'retail') return 'retail';
        return raw;
    }

    getMwTradingCanonicalBusinessId() {
        return 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
    }

    isMwTradingOwner(user) {
        return !!(user && user.email && String(user.email).trim().toLowerCase() === 'mwtradingsolutions@gmail.com');
    }

    /** @see window.ensureMwTradingOwnerBizMembership in firebase-init.js */
    async ensureMwTradingOwnerBizMembership(user) {
        if (typeof window.ensureMwTradingOwnerBizMembership === 'function') {
            await window.ensureMwTradingOwnerBizMembership(user);
        }
    }

    getStoredBusinessId() {
        const localId = localStorage.getItem('currentBusinessId');
        const sessionId = sessionStorage.getItem('currentBusinessId');
        return localId || sessionId || null;
    }

    getStoredBusinessType() {
        const localType = localStorage.getItem('currentBusinessType');
        const sessionType = sessionStorage.getItem('currentBusinessType');
        return localType || sessionType || null;
    }

    persistContext(context) {
        if (!context) return;
        if (context.businessId) {
            localStorage.setItem('currentBusinessId', context.businessId);
            sessionStorage.setItem('currentBusinessId', context.businessId);
        }
        if (context.businessType) {
            localStorage.setItem('currentBusinessType', context.businessType);
            sessionStorage.setItem('currentBusinessType', context.businessType);
        }
    }

    async canAccessBusiness(user, businessId, userDocData) {
        const bid = String(businessId || '').trim();
        if (!user || !bid) return false;
        if (this.isSuperAdminRole(userDocData)) return true;
        if (String(userDocData && userDocData.businessId || '') === bid) return true;
        try {
            const bizDoc = await window.db.collection('businesses').doc(bid).get();
            if (!bizDoc.exists) return false;
            const bizData = bizDoc.data() || {};
            if (String(bizData.ownerId || '') === String(user.uid || '')) return true;
        } catch (e) { /* ignore */ }
        try {
            const bizUserDoc = await window.db.collection('businesses').doc(bid).collection('users').doc(user.uid).get();
            if (bizUserDoc.exists) return true;
        } catch (e2) { /* ignore */ }
        return false;
    }

    isSuperAdminRole(userDocData) {
        return String(userDocData && userDocData.role || '').toUpperCase() === 'SUPER_ADMIN';
    }

    async resolveFallbackBusinessId(user, userDocData) {
        if (!user) return null;
        const userBusinessId = String(userDocData && userDocData.businessId || '').trim();
        if (userBusinessId && await this.canAccessBusiness(user, userBusinessId, userDocData)) {
            return userBusinessId;
        }
        // Membership-based fallback: businesses/{bid}/users/{uid}
        try {
            if (window.db && window.db.collectionGroup && typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldPath) {
                const memberSnap = await window.db.collectionGroup('users')
                    .where(firebase.firestore.FieldPath.documentId(), '==', user.uid)
                    .limit(1)
                    .get();
                if (!memberSnap.empty) {
                    const doc = memberSnap.docs[0];
                    const parentBusinessRef = doc.ref && doc.ref.parent && doc.ref.parent.parent;
                    const memberBusinessId = parentBusinessRef ? String(parentBusinessRef.id || '').trim() : '';
                    if (memberBusinessId && await this.canAccessBusiness(user, memberBusinessId, userDocData)) {
                        try {
                            await window.db.collection('users').doc(user.uid).set({ businessId: memberBusinessId }, { merge: true });
                        } catch (ePersist) { /* ignore */ }
                        return memberBusinessId;
                    }
                }
            }
        } catch (eM) { /* ignore */ }
        try {
            const owned = await window.db.collection('businesses').where('ownerId', '==', user.uid).limit(1).get();
            if (!owned.empty) return owned.docs[0].id;
        } catch (e) { /* ignore */ }
        return null;
    }

    async getContext(user) {
        if (!user) return null;

        await this.ensureMwTradingOwnerBizMembership(user);
        if (typeof window.ensureMwTradingBusinessProfile === 'function' && this.isMwTradingOwner(user)) {
            await window.ensureMwTradingBusinessProfile();
        }
        if (typeof window.ensureSpranzaBusinessProfile === 'function' && (businessId === 'SPRANZA_PVT_LTD' || (userDocData && userDocData.businessId === 'SPRANZA_PVT_LTD'))) {
            await window.ensureSpranzaBusinessProfile();
        }

        const userDoc = await window.db.collection('users').doc(user.uid).get();
        const userDocData = userDoc.exists ? (userDoc.data() || {}) : {};
        const storedBusinessId = this.getStoredBusinessId();
        // Prefer selected business only if caller can actually access it.
        let businessId = '';
        if (storedBusinessId && await this.canAccessBusiness(user, storedBusinessId, userDocData)) {
            businessId = storedBusinessId;
        } else {
            const fallbackBusinessId = await this.resolveFallbackBusinessId(user, userDocData);
            businessId = fallbackBusinessId || user.uid;
        }
        if (this.isMwTradingOwner(user)) {
            businessId = this.getMwTradingCanonicalBusinessId();
        }

        const storedBusinessType = this.normalizeBusinessType(this.getStoredBusinessType());
        const shouldPreferManufacturer = storedBusinessType === 'manufacturer' || String(window.location.pathname || '').toLowerCase().includes('/modules/manufacturer/');
        let businessType = shouldPreferManufacturer ? 'manufacturer' : 'retail';
        let businessName = 'Business';
        let logoUrl = '';
        const businessDoc = await window.db.collection('businesses').doc(businessId).get();
        if (businessDoc.exists) {
            const bd = businessDoc.data() || {};
            businessType = this.normalizeBusinessType(bd.businessType || businessType);
            businessName = bd.name || businessName;
            logoUrl = String(bd.logoUrl || '').trim();
        } else {
            businessType = this.normalizeBusinessType(storedBusinessType || businessType);
        }
        if (businessId === this.getMwTradingCanonicalBusinessId()) {
            businessType = 'distributor';
            if (typeof window.ensureMwTradingBusinessProfile === 'function') {
                await window.ensureMwTradingBusinessProfile();
            }
        }
        if (businessId === 'SPRANZA_PVT_LTD') {
            businessType = 'distributor';
            if (typeof window.ensureSpranzaBusinessProfile === 'function') {
                await window.ensureSpranzaBusinessProfile();
            }
        }
        if (shouldPreferManufacturer && businessType !== 'distributor' && businessType !== 'scrap_collection_center') {
            businessType = 'manufacturer';
        }

        businessType = this.normalizeBusinessType(businessType);

        let userRole = '';
        try {
            if (typeof window.getUserRole === 'function' && user && businessId) {
                const ri = await window.getUserRole(user.uid, businessId);
                userRole = String((ri && ri.role) || '');
            }
        } catch (eRole) { /* ignore */ }
        try {
            if (String(businessType || '').toLowerCase() === 'distributor' && user && businessId) {
                const bud = await window.db.collection('businesses').doc(businessId).collection('users').doc(user.uid).get();
                if (bud.exists && bud.data().role != null && String(bud.data().role).trim() !== '') {
                    userRole = String(bud.data().role);
                }
            }
        } catch (eBud) { /* ignore */ }

        const context = { userId: user.uid, businessId, businessType, businessName, userRole, logoUrl };
        this.persistContext(context);
        return context;
    }

    /**
     * Recent activity for dashboard. Scrap uses account_ledger (GL) because journal/entries is not appended for scrap flows.
     * @param {string} businessType optional — when scrap_collection_center, reads journal/{id}/account_ledger
     */
    async getRecentJournalActivities(businessId, limit = 5, businessType = '') {
        if (String(businessType || '').toLowerCase() === 'scrap_collection_center') {
            const snap = await window.db.collection('journal').doc(businessId).collection('account_ledger').get().catch(() => ({ docs: [] }));
            const rows = snap.docs.map((doc) => {
                const d = doc.data() || {};
                return {
                    id: doc.id,
                    reference: String(d.lastReferenceType || 'GL'),
                    description: `${String(d.accountCode || doc.id || '').trim()} — ${String(d.lastDescription || d.accountName || '').trim()}`.replace(/\s+—\s*$/, '').trim(),
                    date: d.updatedAt || null,
                    totalDebit: Math.max(Number(d.totalDebit) || 0, Number(d.totalCredit) || 0)
                };
            });
            rows.sort((a, b) => {
                const ta = a.date && a.date.toDate ? a.date.toDate().getTime() : 0;
                const tb = b.date && b.date.toDate ? b.date.toDate().getTime() : 0;
                return tb - ta;
            });
            return rows.slice(0, limit);
        }
        const snapshot = await window.db.collection('journal').doc(businessId).collection('entries')
            .orderBy('date', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    calculateCashFlow(entries) {
        return entries.reduce((sum, entry) => {
            if (!Array.isArray(entry.entries)) return sum;
            return sum + entry.entries.reduce((entrySum, row) => {
                if (row.accountCode !== '1-1010-01') return entrySum;
                return entrySum + (Number(row.debit) || 0) - (Number(row.credit) || 0);
            }, 0);
        }, 0);
    }

    accountBalance(entries, matcher) {
        let total = 0;
        entries.forEach((entry) => {
            (entry.entries || []).forEach((line) => {
                const code = String(line.accountCode || '');
                const name = String(line.accountName || '').toLowerCase();
                if (matcher(code, name)) {
                    total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
                }
            });
        });
        return total;
    }

    /** Firestore row date: ISO string, Date, or Timestamp. */
    scrapOperationalDateMs(row) {
        if (!row || typeof row !== 'object') return null;
        const d = row.date;
        if (d && typeof d.toDate === 'function') {
            const t = d.toDate().getTime();
            return Number.isNaN(t) ? null : t;
        }
        const c = row.createdAt;
        if (c && typeof c.toDate === 'function') {
            const t = c.toDate().getTime();
            return Number.isNaN(t) ? null : t;
        }
        if (typeof d === 'string' || d instanceof Date) {
            const t = new Date(d).getTime();
            return Number.isNaN(t) ? null : t;
        }
        return null;
    }

    querySnapDocs(snap) {
        if (!snap) return [];
        if (Array.isArray(snap.docs)) return snap.docs;
        return [];
    }

    aggregateEntryDocsToAccountMap(docs) {
        const byCode = {};
        (docs || []).forEach((doc) => {
            const row = doc.data ? doc.data() : doc;
            const entries = row.entries || [];
            entries.forEach((line) => {
                const c = String(line.accountCode || '').trim() || 'UNKNOWN';
                if (!byCode[c]) {
                    byCode[c] = { accountCode: c, accountName: String(line.accountName || c), debit: 0, credit: 0 };
                }
                byCode[c].debit += Number(line.debit) || 0;
                byCode[c].credit += Number(line.credit) || 0;
            });
        });
        return byCode;
    }

    /**
     * Journal entries posted from web loan modules (stored in journal/{bid}/entries only).
     * Scrap GL view otherwise ignores entries to avoid double-counting stock — loans must still appear.
     */
    aggregateLoanJournalEntryDocsToAccountMap(docs) {
        const byCode = {};
        (docs || []).forEach((doc) => {
            const row = doc.data ? doc.data() : doc;
            const rt = String(row.referenceType || '');
            if (!/^(HAND_LOAN|LOAN_|ADV_LOAN)/.test(rt)) return;
            const entries = row.entries || [];
            entries.forEach((line) => {
                const c = String(line.accountCode || '').trim() || 'UNKNOWN';
                if (!byCode[c]) {
                    byCode[c] = { accountCode: c, accountName: String(line.accountName || c), debit: 0, credit: 0 };
                }
                byCode[c].debit += Number(line.debit) || 0;
                byCode[c].credit += Number(line.credit) || 0;
            });
        });
        return byCode;
    }

    aggregateLedgerDocsToAccountMap(docs) {
        const byCode = {};
        (docs || []).forEach((doc) => {
            const r = doc.data ? doc.data() : doc;
            const c = String(r.accountCode || (doc.id != null ? doc.id : '') || '').trim() || 'UNKNOWN';
            byCode[c] = {
                accountCode: c,
                accountName: String(r.accountName || c),
                debit: Number(r.totalDebit) || 0,
                credit: Number(r.totalCredit) || 0
            };
        });
        return byCode;
    }

    mergeAccountMaps(a, b) {
        const out = { ...a };
        Object.keys(b || {}).forEach((k) => {
            if (!out[k]) {
                out[k] = { ...b[k] };
            } else {
                out[k] = {
                    accountCode: k,
                    accountName: b[k].accountName || out[k].accountName,
                    debit: (Number(out[k].debit) || 0) + (Number(b[k].debit) || 0),
                    credit: (Number(out[k].credit) || 0) + (Number(b[k].credit) || 0)
                };
            }
        });
        return out;
    }

    aggregateOpeningDocData(data) {
        const byCode = {};
        const row = data && typeof data === 'object' ? data : {};
        const lines = Array.isArray(row.lines) ? row.lines : [];
        lines.forEach((line) => {
            const c = String(line.accountCode || '').trim();
            if (!c) return;
            if (!byCode[c]) {
                byCode[c] = { accountCode: c, accountName: String(line.accountName || c), debit: 0, credit: 0 };
            }
            byCode[c].debit += Number(line.debit) || 0;
            byCode[c].credit += Number(line.credit) || 0;
        });
        return byCode;
    }

    /**
     * @param openingSnap Firestore DocumentSnapshot for journal/{bid}/ledger_opening/current (optional)
     * @param options.scrapOpeningLedgerOnly — scrap: opening + account_ledger only (no legacy entries; fixes double stock)
     */
    syntheticJournalFromMerged(entriesSnap, ledgerSnap, openingSnap, options = {}) {
        let map;
        if (options.scrapOpeningLedgerOnly) {
            const openingData = openingSnap && openingSnap.exists ? openingSnap.data() : {};
            const base = this.mergeAccountMaps(
                this.aggregateOpeningDocData(openingData),
                this.aggregateLedgerDocsToAccountMap(ledgerSnap && ledgerSnap.docs ? ledgerSnap.docs : [])
            );
            const loanFromEntries = this.aggregateLoanJournalEntryDocsToAccountMap(
                entriesSnap && entriesSnap.docs ? entriesSnap.docs : []
            );
            map = this.mergeAccountMaps(base, loanFromEntries);
        } else {
            map = this.mergeAccountMaps(
                this.aggregateEntryDocsToAccountMap(entriesSnap && entriesSnap.docs ? entriesSnap.docs : []),
                this.aggregateLedgerDocsToAccountMap(ledgerSnap && ledgerSnap.docs ? ledgerSnap.docs : [])
            );
        }
        const lines = Object.values(map).filter((row) => (Number(row.debit) || 0) > 0.0001 || (Number(row.credit) || 0) > 0.0001);
        if (!lines.length) return [];
        return [{
            entries: lines,
            referenceType: options.scrapOpeningLedgerOnly ? 'SCRAP_OPENING_PLUS_LEDGER' : 'MERGED_LEDGER',
            description: options.scrapOpeningLedgerOnly
                ? 'Scrap GL: opening + ledger + loan journals (entries)'
                : 'Running balances (legacy journal + consolidated ledger)',
            date: null
        }];
    }

    async getDistributorMetrics(context) {
        const bid = context.businessId;
        const [snapshot, pendingSnap, productsSnap, repsSnap, shopsSnap, journalSnap] = await Promise.all([
            window.db.collection('orders').where('businessId', '==', bid).get(),
            window.db.collection('pendingOrders').where('businessId', '==', bid).get(),
            window.db.collection('products').where('businessId', '==', bid).get(),
            window.db.collection('reps').where('businessId', '==', bid).get(),
            window.db.collection('shops').where('businessId', '==', bid).get(),
            window.db.collection('journal').doc(bid).collection('entries').get()
        ]);

        const journalEntries = journalSnap.docs.map(d => d.data());
        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);

        // --- ACCOUNTING-BASED METRICS (The Truth Source) ---
        
        // 1. Sales (Income Accounts: 4-xxxx)
        let todaySales = 0;
        let monthSales = 0;
        let monthReturnsValue = 0;
        let monthFreeIssuesValue = 0;

        journalEntries.forEach(entry => {
            const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
            const isThisMonth = entryDate >= startMonth;
            const isToday = entryDate >= startToday;

            (entry.entries || []).forEach(line => {
                const code = String(line.accountCode);
                // Sales Revenue
                if (code.startsWith('4-4010-01')) {
                    const val = Number(line.credit) || 0;
                    if (isToday) todaySales += val;
                    if (isThisMonth) monthSales += val;
                }
                // Sales Returns (Subtract from Sales)
                else if (code.startsWith('4-4010-02')) {
                    const val = Number(line.debit) || 0;
                    if (isToday) todaySales -= val;
                    if (isThisMonth) {
                        monthSales -= val;
                        monthReturnsValue += val;
                    }
                }
                // Free Issues (Marketing Expense)
                else if (code.startsWith('5-5030-01')) {
                    const val = Number(line.debit) || 0;
                    if (isThisMonth) monthFreeIssuesValue += val;
                }
            });
        });

        // 2. Outstanding Balance (Accounts Receivable: 1-1030)
        let outstandingBalance = this.accountBalance(journalEntries, (code) => code.startsWith('1-1030'));

        // 3. Cash Flow (Cash & Bank: 1-1010, 1-1020)
        const cashFlow = this.accountBalance(journalEntries, (code) => code.startsWith('1-1010') || code.startsWith('1-1020'));

        // 4. Inventory Value (1-1040 only — scrap supplier advances were mis-posted to 1-1040 before 1-1060 split)
        let totalStockValue = this.accountBalance(journalEntries, (code, name) =>
            code.startsWith('1-1040') && !String(name || '').toLowerCase().includes('supplier advance'));

        // --- OPERATIONAL METRICS (Process Tracking) ---
        let pendingOrders = pendingSnap.size;
        let approvedCount = 0;
        let rejectedCount = 0;
        let dispatchedCount = 0;
        let deliveredCount = 0;
        let monthOrderCount = 0;
        let returnsCat1Units = 0;
        let returnsCat2Units = 0;
        let freeIssueUnits = 0;
        let freeIssueValueEst = 0;
        const repMap = {};
        const brandMonth = {};
        const trendDayKeyToIndex = {};
        const dayKeys = [];
        for (let i = 6; i >= 0; i--) {
            const ds = new Date(startToday);
            ds.setDate(ds.getDate() - i);
            const dk = `${ds.getFullYear()}-${ds.getMonth()}-${ds.getDate()}`;
            trendDayKeyToIndex[dk] = dayKeys.length;
            dayKeys.push(ds.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }
        const dayTotals = new Array(7).fill(0);

        const accumulateOrder = (order, isPendingQueue) => {
            const amount = Number(order.totalAmount) || 0;
            const dateValue = order.orderDate?.toDate ? order.orderDate.toDate() : null;
            const status = String(order.status || (isPendingQueue ? 'pending' : '')).toLowerCase();
            const isRevenueOrder = ['approved', 'dispatched', 'delivered'].includes(status);
            const repId = order.repId || 'UNASSIGNED';
            const repName = order.repName || order.salesRepName || 'Unassigned Rep';
            if (!repMap[repId]) {
                repMap[repId] = {
                    repId,
                    repName,
                    totalOrders: 0,
                    freeIssues: 0,
                    collections: 0
                };
            }
            repMap[repId].totalOrders += 1;
            const items = Array.isArray(order.items) ? order.items : [];
            const freeQty = items.reduce((sum, item) => sum + (Number(item.freeQty) || 0), 0);
            repMap[repId].freeIssues += freeQty;
            repMap[repId].collections += Number(order.collectionAmount) || Number(order.collectedAmount) || 0;

            if (dateValue && dateValue >= startMonth) {
                monthOrderCount += 1;
                items.forEach((item) => {
                    returnsCat1Units += Number(item.returnCompanyQty) || 0;
                    returnsCat2Units += Number(item.returnResellQty) || 0;
                    const fq = Number(item.freeQty) || 0;
                    if (fq > 0) {
                        freeIssueUnits += fq;
                        freeIssueValueEst += fq * (Number(item.unitPrice) || 0);
                    }
                    const brand = (item.productBrand || '').trim() || 'Unbranded';
                    const line = (Number(item.orderedQty) || 0) * (Number(item.unitPrice) || 0)
                        + fq * (Number(item.unitPrice) || 0);
                    brandMonth[brand] = (brandMonth[brand] || 0) + line;
                });
            }

            if (status === 'approved') approvedCount++;
            else if (status === 'rejected') rejectedCount++;
            else if (status === 'dispatched') dispatchedCount++;
            else if (status === 'delivered') deliveredCount++;

            if (dateValue && isRevenueOrder) {
                const dk = `${dateValue.getFullYear()}-${dateValue.getMonth()}-${dateValue.getDate()}`;
                const di = trendDayKeyToIndex[dk];
                if (di != null) dayTotals[di] += amount;
            }
        };

        pendingSnap.docs.forEach((doc) => accumulateOrder(doc.data(), true));
        snapshot.docs.forEach((doc) => accumulateOrder(doc.data(), false));

        let outOfStockCount = 0;
        let lowStockAlertCount = 0;
        const lowStockList = [];
        const topProductLines = [];
        productsSnap.forEach((doc) => {
            const p = doc.data();
            const q = Number(p.currentStock != null ? p.currentStock : p.stock) || 0;
            const price = Number(p.unitPrice) || 0;
            if (q === 0) outOfStockCount++;
            else if (q <= (Number(p.minStockLevel) || 10)) lowStockAlertCount++;
            if (q === 0 || (q > 0 && q <= (Number(p.minStockLevel) || 10))) {
                lowStockList.push({ name: p.name || '—', brand: p.brand || '', q });
            }
            topProductLines.push({
                name: p.name || '—',
                brand: p.brand || '',
                v: q * price
            });
        });
        lowStockList.sort((a, b) => a.q - b.q);
        topProductLines.sort((a, b) => b.v - a.v);

        let newCustomers = 0;
        shopsSnap.forEach((doc) => {
            const c = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null;
            if (c && c >= startMonth) newCustomers++;
        });

        const repSummary = Object.values(repMap).sort((a, b) => b.totalOrders - a.totalOrders);
        const brandLabels = Object.keys(brandMonth).sort((a, b) => (brandMonth[b] || 0) - (brandMonth[a] || 0)).slice(0, 8);
        const brandValues = brandLabels.map((k) => brandMonth[k] || 0);
        const repLeaderLabels = repSummary.slice(0, 8).map((r) => r.repName);
        const repLeaderValues = repSummary.slice(0, 8).map((r) => r.collections || 0);

        const recentOrdersList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const ta = a.orderDate?.toDate ? a.orderDate.toDate().getTime() : 0;
                const tb = b.orderDate?.toDate ? b.orderDate.toDate().getTime() : 0;
                return tb - ta;
            })
            .slice(0, 12);

        return {
            todaySales,
            monthSales,
            pendingOrders,
            pendingQueueCount: pendingSnap.size,
            approvedCount,
            rejectedCount,
            dispatchedCount,
            deliveredCount,
            totalStockValue,
            outOfStockCount,
            lowStockAlertCount,
            returnsCat1Units,
            returnsCat2Units,
            freeIssueUnits,
            freeIssueValueEst,
            outstandingBalance,
            activeReps: repsSnap.size,
            newCustomers,
            monthOrderCount,
            cashFlow,
            monthReturnsValue,
            monthFreeIssuesValue,
            repSummary,
            repFilterOptions: repSummary.map((rep) => ({ repId: rep.repId, repName: rep.repName })),
            distributorTrendLabels: dayKeys,
            distributorTrendData: dayTotals,
            distributorBrandLabels: brandLabels,
            distributorBrandData: brandValues,
            distributorRepLeaderLabels: repLeaderLabels,
            distributorRepLeaderData: repLeaderValues,
            lowStockList: lowStockList.slice(0, 15),
            topProductLines: topProductLines.slice(0, 12),
            recentOrdersList
        };
    }

    async getRetailMetrics(context) {
        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);

        const orderSnapshot = await window.db.collection('orders').doc(context.businessId).collection('list').get();
        let pendingOrders = 0;
        orderSnapshot.docs.forEach(doc => {
            const order = doc.data();
            if (['pending', 'hold', 'credit'].includes(order.status)) pendingOrders++;
        });

        const productSnapshot = await window.db.collection('products').doc(context.businessId).collection('list').get();
        let lowStock = 0;
        productSnapshot.docs.forEach(doc => {
            const stock = Number(doc.data().stock) || 0;
            if (stock > 0 && stock <= 10) lowStock++;
        });

        const monthJournal = await window.db.collection('journal').doc(context.businessId).collection('entries')
            .where('date', '>=', startMonth)
            .get();
        let monthSales = 0;
        let todaySales = 0;
        const monthEntries = monthJournal.docs.map(doc => doc.data());
        monthEntries.forEach(entry => {
            if (!['SALE', 'DISTRIBUTOR_ORDER_APPROVED'].includes(entry.referenceType)) return;
            const amount = Number(entry.totalCredit) || 0;
            monthSales += amount;
            const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
            if (entryDate >= startToday) todaySales += amount;
        });

        const cashFlow = this.calculateCashFlow(monthEntries);
        return { todaySales, monthSales, pendingOrders, lowStock, cashFlow };
    }

    async getPharmacyMetrics(context) {
        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const in30Days = new Date(startToday);
        in30Days.setDate(in30Days.getDate() + 30);

        const productSnapshot = await window.db.collection('products').doc(context.businessId).collection('list').get();
        let lowStock = 0;
        let expiringSoon = 0;
        let expiredCount = 0;
        const categories = {};

        productSnapshot.docs.forEach((doc) => {
            const item = doc.data();
            const stock = Number(item.stock) || 0;
            if (stock > 0 && stock <= 10) lowStock++;
            const category = (item.drugCategory || item.category || 'Uncategorized').trim();
            categories[category] = (categories[category] || 0) + 1;
            const expiryDate = item.expiryDate?.toDate ? item.expiryDate.toDate() : (item.expiryDate ? new Date(item.expiryDate) : null);
            if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
                if (expiryDate < startToday) expiredCount++;
                else if (expiryDate <= in30Days) expiringSoon++;
            }
        });

        let prescriptionUploads = 0;
        try {
            const rxSnapshot = await window.db.collection('prescriptions')
                .where('businessId', '==', context.businessId)
                .get();
            prescriptionUploads = rxSnapshot.size;
        } catch (error) {
            console.warn('Prescription collection unavailable:', error?.message || error);
        }

        const baseMetrics = await this.getRetailMetrics(context);
        return {
            ...baseMetrics,
            expiringSoon,
            expiredCount,
            drugCategories: Object.keys(categories).length,
            topDrugCategories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5),
            prescriptionUploads,
            dashboardStructure: ['sales', 'expiryAlerts', 'drugCategories', 'prescriptionQueue', 'lowStock', 'cashFlow']
        };
    }

    async getHardwareMetrics(context) {
        const productSnapshot = await window.db.collection('products').doc(context.businessId).collection('list').get();
        let convertibleItems = 0;
        let weightPricedItems = 0;
        let bulkItems = 0;
        let inventoryUnitsTracked = 0;

        productSnapshot.docs.forEach((doc) => {
            const item = doc.data();
            const unit = String(item.sellingUnit || item.stockUnit || item.unit || '').toLowerCase();
            const altUnits = Array.isArray(item.altUnits) ? item.altUnits.length : 0;
            if (['ft', 'feet', 'inch', 'inches', 'mm', 'cm', 'm'].includes(unit) || altUnits > 0) convertibleItems++;
            if (item.pricePerKg || item.pricePerTon || item.weightPricing === true) weightPricedItems++;
            if (item.isBulk === true || ['kg', 'ton', 'cft', 'cube'].includes(unit)) bulkItems++;
            if (unit) inventoryUnitsTracked++;
        });

        const baseMetrics = await this.getRetailMetrics(context);
        const ordersSnapshot = await window.db.collection('orders').doc(context.businessId).collection('list').get();
        let quotationCount = 0;
        let convertedCount = 0;
        let invoiceCount = 0;
        const now = new Date();
        ordersSnapshot.docs.forEach((doc) => {
            const row = doc.data();
            if (row.businessType !== 'hardware') return;
            if (row.status === 'QUOTATION') {
                const validUntil = row.validUntil ? new Date(row.validUntil) : null;
                const isActive = !validUntil || (validUntil >= now);
                if (isActive) quotationCount++;
            }
            if (row.status === 'CONVERTED') convertedCount++;
            if (row.status === 'INVOICE') invoiceCount++;
        });
        const issuedQuotes = quotationCount + convertedCount;
        const quoteConversionRate = issuedQuotes > 0 ? (convertedCount / issuedQuotes) * 100 : 0;

        return {
            ...baseMetrics,
            unitConvertibleItems: convertibleItems,
            bulkWeightPricedItems: weightPricedItems,
            bulkItems,
            inventoryUnitsTracked,
            quotationCount,
            quoteConversionRate,
            hardwareSalesVsQuotations: {
                sales: invoiceCount,
                quotations: issuedQuotes
            },
            dashboardStructure: ['sales', 'inventory', 'unitConversions', 'weightPricing', 'bulkItems', 'quotationCount', 'quoteConversionRate', 'cashFlow']
        };
    }

    async getServiceMetrics(context) {
        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const endToday = new Date(startToday);
        endToday.setDate(endToday.getDate() + 1);

        let todayAppointments = 0;
        let upcomingAppointments = 0;
        let completedToday = 0;
        let serviceBills = 0;
        let clients = 0;

        try {
            const apptSnapshot = await window.db.collection('appointments')
                .where('businessId', '==', context.businessId)
                .get();
            apptSnapshot.docs.forEach((doc) => {
                const appt = doc.data();
                const when = appt.date?.toDate ? appt.date.toDate() : (appt.date ? new Date(appt.date) : null);
                if (!when || Number.isNaN(when.getTime())) return;
                const status = String(appt.status || '').toLowerCase();
                if (when >= startToday && when < endToday) {
                    todayAppointments++;
                    if (status === 'completed') completedToday++;
                } else if (when >= endToday) {
                    upcomingAppointments++;
                }
            });
        } catch (error) {
            console.warn('Appointments collection unavailable:', error?.message || error);
        }

        try {
            const billSnapshot = await window.db.collection('serviceBills')
                .where('businessId', '==', context.businessId)
                .get();
            serviceBills = billSnapshot.size;
        } catch (error) {
            console.warn('Service billing collection unavailable:', error?.message || error);
        }

        try {
            const clientsSnapshot = await window.db.collection('clients')
                .where('businessId', '==', context.businessId)
                .get();
            clients = clientsSnapshot.size;
        } catch (error) {
            console.warn('Clients collection unavailable:', error?.message || error);
        }

        const monthJournal = await window.db.collection('journal').doc(context.businessId).collection('entries').get();
        const entries = monthJournal.docs.map((doc) => doc.data());
        const serviceRevenue = entries
            .filter((entry) => ['SALE', 'SERVICE_BILL'].includes(entry.referenceType))
            .reduce((sum, entry) => sum + (Number(entry.totalCredit) || 0), 0);
        const cashFlow = this.calculateCashFlow(entries);
        const utilization = todayAppointments > 0 ? (completedToday / todayAppointments) * 100 : 0;

        return {
            todaySales: serviceRevenue,
            monthSales: serviceRevenue,
            pendingOrders: Math.max(upcomingAppointments, 0),
            cashFlow,
            todayAppointments,
            upcomingAppointments,
            serviceBills,
            clients,
            utilization,
            dashboardStructure: ['todayAppointments', 'upcoming', 'serviceRevenue', 'serviceBills', 'utilization', 'clients']
        };
    }

    async getScrapMetrics(context) {
        const bid = context.businessId;
        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);
        const startTodayMs = startToday.getTime();
        const startMonthMs = startMonth.getTime();

        const isScrap = String(context.businessType || '').toLowerCase() === 'scrap_collection_center';
        const emptySnap = () => ({ docs: [] });
        const [itemsSnap, buySnap, sellSnap, loanSnap, allJournalSnap, journalLedgerSnap, openingSnap, extSnap, advSnap] = await Promise.all([
            window.db.collection('scrap_items').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('buying_history').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('selling_history').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('scrap_loans').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('journal').doc(bid).collection('entries').get().catch(() => emptySnap()),
            window.db.collection('journal').doc(bid).collection('account_ledger').get().catch(() => emptySnap()),
            window.db.collection('journal').doc(bid).collection('ledger_opening').doc('current').get().catch(() => ({ exists: false, data: () => ({}) })),
            window.db.collection('scrap_external_settlements').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('scrap_advances').where('businessId', '==', bid).get().catch(() => emptySnap())
        ]);
        const legacyEntries = this.querySnapDocs(allJournalSnap).map((doc) => doc.data());
        const todayEntries = legacyEntries.filter((entry) => {
            const dt = entry.date?.toDate ? entry.date.toDate() : (entry.date ? new Date(entry.date) : null);
            return dt && !Number.isNaN(dt.getTime()) && dt >= startToday;
        });
        const monthEntries = legacyEntries.filter((entry) => {
            const dt = entry.date?.toDate ? entry.date.toDate() : (entry.date ? new Date(entry.date) : null);
            return dt && !Number.isNaN(dt.getTime()) && dt >= startMonth;
        });
        const mergedSynthetic = isScrap
            ? this.syntheticJournalFromMerged(allJournalSnap, journalLedgerSnap, openingSnap, { scrapOpeningLedgerOnly: true })
            : this.syntheticJournalFromMerged(allJournalSnap, journalLedgerSnap, openingSnap, {});
        const allEntries = isScrap
            ? (mergedSynthetic.length ? mergedSynthetic : [])
            : (mergedSynthetic.length ? mergedSynthetic : legacyEntries);

        let stockValue = 0;
        let lowStock = 0;
        this.querySnapDocs(itemsSnap).forEach((doc) => {
            const r = doc.data();
            const stock = Number(r.currentStock) || 0;
            const cp = Number(r.costPrice);
            const cost = (Number.isFinite(cp) && cp > 0) ? cp : 0;
            stockValue += stock * cost;
            if (stock > 0 && stock <= 10) lowStock += 1;
        });

        let todayBuying = 0;
        let monthBuying = 0;
        let todayStockIn = 0;
        let monthStockIn = 0;
        this.querySnapDocs(buySnap).forEach((doc) => {
            const r = doc.data();
            const amount = Number(r.totalAmount) || 0;
            const weight = Number(r.totalWeight) || 0;
            const tms = this.scrapOperationalDateMs(r);
            if (tms == null) return;
            if (tms >= startMonthMs) {
                monthBuying += amount;
                monthStockIn += weight;
            }
            if (tms >= startTodayMs) {
                todayBuying += amount;
                todayStockIn += weight;
            }
        });
        let todaySales = 0;
        let monthSales = 0;
        let todayStockOut = 0;
        let monthStockOut = 0;
        this.querySnapDocs(sellSnap).forEach((doc) => {
            const r = doc.data();
            const amount = Number(r.totalAmount) || 0;
            const qty = Number(r.qty) || 0;
            const tms = this.scrapOperationalDateMs(r);
            if (tms == null) return;
            if (tms >= startMonthMs) {
                monthSales += amount;
                monthStockOut += qty;
            }
            if (tms >= startTodayMs) {
                todaySales += amount;
                todayStockOut += qty;
            }
        });
        let outstandingLoans = 0;
        this.querySnapDocs(loanSnap).forEach((doc) => {
            const row = doc.data() || {};
            const bal = Number(row.balance) || 0;
            if (bal > 0) outstandingLoans += bal;
        });
        let externalSettlementNet = 0;
        this.querySnapDocs(extSnap).forEach((doc) => {
            const row = doc.data();
            const tms = this.scrapOperationalDateMs(row);
            if (tms == null || tms < startMonthMs) return;
            externalSettlementNet += Number(row.amount) || 0;
        });
        let advanceOutstanding = 0;
        this.querySnapDocs(advSnap).forEach((doc) => {
            const row = doc.data();
            advanceOutstanding += Number(row.balance != null ? row.balance : row.amount) || 0;
        });
        /* Cash + bank: merged GL when available; else legacy journal lines (calculateCashFlow only looked at 1-1010-01). */
        const cashFlow = mergedSynthetic.length
            ? this.accountBalance(allEntries, (code) => String(code || '').startsWith('1-1010') || String(code || '').startsWith('1-1020'))
            : this.accountBalance(legacyEntries, (code) => String(code || '').startsWith('1-1010') || String(code || '').startsWith('1-1020'));
        const accountingTodaySales = todayEntries.reduce((sum, entry) => {
            const ref = String(entry.referenceType || '').toUpperCase();
            if (!['SCRAP_BILL', 'SCRAP_SELL'].includes(ref)) return sum;
            return sum + (Number(entry.totalCredit) || 0);
        }, 0);
        const accountingTodayBuying = todayEntries.reduce((sum, entry) => {
            const ref = String(entry.referenceType || '').toUpperCase();
            if (ref !== 'SCRAP_BUYING') return sum;
            return sum + (Number(entry.totalDebit) || 0);
        }, 0);
        const accountingMonthSales = monthEntries.reduce((sum, entry) => {
            const ref = String(entry.referenceType || '').toUpperCase();
            if (!['SCRAP_BILL', 'SCRAP_SELL'].includes(ref)) return sum;
            return sum + (Number(entry.totalCredit) || 0);
        }, 0);
        const accountingMonthBuying = monthEntries.reduce((sum, entry) => {
            const ref = String(entry.referenceType || '').toUpperCase();
            if (ref !== 'SCRAP_BUYING') return sum;
            return sum + (Number(entry.totalDebit) || 0);
        }, 0);
        /* 1-1030-01 is shared in GL between AR and Scrap Inventory — ledger stores one bucket; cannot split. */
        const scrapGlNet1030 = mergedSynthetic.length
            ? this.accountBalance(allEntries, (code) => String(code || '').trim() === '1-1030-01')
            : 0;
        const scrapGlNet1060 = mergedSynthetic.length
            ? this.accountBalance(allEntries, (code) => String(code || '').trim() === '1-1060-01')
            : 0;
        /* Stock value KPI: operational (qty×cost). If no cost data but GL inventory leg exists, fall back to GL net on 1-1030 (combined AR+inventory — approximate). */
        const stockValueReported = stockValue > 0.01
            ? stockValue
            : (mergedSynthetic.length && Math.abs(scrapGlNet1030) > 0.01 ? scrapGlNet1030 : stockValue);
        const effectiveMonthSales = (accountingMonthSales || monthSales);
        const effectiveMonthBuying = (accountingMonthBuying || monthBuying);
        /* Scrap no longer posts dated rows to journal/entries — MTD margin from ops (buy/sell history), aligned with KPI sales/buying. */
        const monthProfit = effectiveMonthSales - effectiveMonthBuying;
        const scrapGlRevenue = mergedSynthetic.length
            ? -this.accountBalance(allEntries, (code) => String(code || '').startsWith('4-4010'))
            : 0;
        const scrapGlCogs = mergedSynthetic.length
            ? this.accountBalance(allEntries, (code) => String(code || '').startsWith('5-5010'))
            : 0;
        const scrapGlLoansGiven = mergedSynthetic.length
            ? this.accountBalance(allEntries, (code) => String(code || '').startsWith('1-1050'))
            : 0;
        const scrapGlInterestIncome = mergedSynthetic.length
            ? -this.accountBalance(allEntries, (code) => String(code || '').startsWith('4-4020'))
            : 0;
        const trendDayKeyToIndex = {};
        const scrapTrendLabels = [];
        for (let i = 6; i >= 0; i--) {
            const ds = new Date(startToday);
            ds.setDate(ds.getDate() - i);
            const dk = `${ds.getFullYear()}-${ds.getMonth()}-${ds.getDate()}`;
            trendDayKeyToIndex[dk] = scrapTrendLabels.length;
            scrapTrendLabels.push(ds.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }
        const scrapTrendBuying = new Array(7).fill(0);
        const scrapTrendSales = new Array(7).fill(0);
        this.querySnapDocs(buySnap).forEach((doc) => {
            const r = doc.data();
            const tms = this.scrapOperationalDateMs(r);
            if (tms == null) return;
            const dt = new Date(tms);
            const dk = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
            const idx = trendDayKeyToIndex[dk];
            if (idx == null) return;
            scrapTrendBuying[idx] += Number(r.totalAmount) || 0;
        });
        this.querySnapDocs(sellSnap).forEach((doc) => {
            const r = doc.data();
            const tms = this.scrapOperationalDateMs(r);
            if (tms == null) return;
            const dt = new Date(tms);
            const dk = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
            const idx = trendDayKeyToIndex[dk];
            if (idx == null) return;
            scrapTrendSales[idx] += Number(r.totalAmount) || 0;
        });

        return {
            todaySales: accountingTodaySales || todaySales,
            monthSales: accountingMonthSales || monthSales,
            todayBuying: accountingTodayBuying || todayBuying,
            monthBuying: accountingMonthBuying || monthBuying,
            cashFlow,
            stockValue: stockValueReported,
            lowStock,
            outstandingLoans,
            monthProfit,
            todayStockIn,
            todayStockOut,
            monthStockIn,
            monthStockOut,
            externalSettlementNet,
            advanceOutstanding,
            scrapGlRevenue,
            scrapGlCogs,
            scrapGlLoansGiven,
            scrapGlInterestIncome,
            scrapGlNet1030,
            scrapGlNet1060,
            scrapTrendLabels,
            scrapTrendBuying,
            scrapTrendSales
        };
    }

    async getManufacturerMetrics(context) {
        const bid = context.businessId;
        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);
        const start30 = new Date(startToday);
        start30.setDate(start30.getDate() - 29);
        const dayKeys = [];
        const dayIdx = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date(start30);
            d.setDate(start30.getDate() + i);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            dayIdx[key] = i;
            dayKeys.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }
        const purchases30 = new Array(30).fill(0);
        const sales30 = new Array(30).fill(0);
        const production30 = new Array(30).fill(0);
        const profit30 = new Array(30).fill(0);
        const purchaseSplit30 = new Array(30).fill(0).map(() => ({ cash: 0, credit: 0, cheque: 0 }));
        const salesSplit30 = new Array(30).fill(0).map(() => ({ cash: 0, credit: 0, cheque: 0 }));

        const [rmSnap, fgSnap, prodSnap, opSnap, sideSnap, journalSnap, mapSnap, payableSnap, receivableSnap, rawHist30, salesHist30, side30] = await Promise.all([
            window.db.collection('manufacturer_raw_materials').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_finished_products').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_production_runs').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_expenses').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_side_income').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            window.db.collection('journal').doc(bid).collection('entries').where('date', '>=', startMonth).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_transformations').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_raw_material_history').where('businessId', '==', bid).where('paymentStatus', 'in', ['PENDING', 'PENDING_CLEARANCE']).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_sales').where('businessId', '==', bid).where('paymentStatus', 'in', ['PENDING', 'PENDING_CLEARANCE']).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_raw_material_history').where('businessId', '==', bid).where('createdAt', '>=', start30).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_sales').where('businessId', '==', bid).where('createdAt', '>=', start30).get().catch(() => ({ docs: [] })),
            window.db.collection('manufacturer_side_income').where('businessId', '==', bid).where('date', '>=', start30).get().catch(() => ({ docs: [] }))
        ]);

        let rmStockValue = 0;
        rmSnap.docs.forEach((doc) => {
            const d = doc.data() || {};
            rmStockValue += (Number(d.stockQty) || 0) * (Number(d.lastUnitCost) || 0);
        });

        let fgStockValue = 0;
        fgSnap.docs.forEach((doc) => {
            const d = doc.data() || {};
            fgStockValue += (Number(d.stockQty) || 0) * (Number(d.unitPrice) || 0);
        });

        let productionRuns = 0;
        let productionCostMonth = 0;
        prodSnap.docs.forEach((doc) => {
            const d = doc.data() || {};
            const t = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
            if (t && !Number.isNaN(t.getTime()) && t >= startMonth) {
                productionRuns += 1;
                productionCostMonth += Number(d.processingCost || 0);
            }
            if (t && !Number.isNaN(t.getTime()) && t >= start30) {
                const k = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
                const i = dayIdx[k];
                if (i != null) {
                    production30[i] += Number(d.producedQty || 0);
                    profit30[i] -= Number(d.processingCost || 0);
                }
            }
        });

        let operationalCostMonth = 0;
        opSnap.docs.forEach((doc) => {
            const d = doc.data() || {};
            const t = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
            if (t && !Number.isNaN(t.getTime()) && t >= startMonth) {
                operationalCostMonth += Number(d.amount || 0);
            }
            if (t && !Number.isNaN(t.getTime()) && t >= start30) {
                const k = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
                const i = dayIdx[k];
                if (i != null) profit30[i] -= Number(d.amount || 0);
            }
        });

        let sideIncomeMonth = 0;
        sideSnap.docs.forEach((doc) => {
            const d = doc.data() || {};
            const t = d.date?.toDate ? d.date.toDate() : (d.date ? new Date(d.date) : null);
            if (t && !Number.isNaN(t.getTime()) && t >= startMonth) {
                sideIncomeMonth += Number(d.amount || 0);
            }
        });
        rawHist30.docs.forEach((doc) => {
            const d = doc.data() || {};
            const t = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
            if (!t || Number.isNaN(t.getTime())) return;
            const k = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
            const i = dayIdx[k];
            if (i == null) return;
            const amt = Number(d.amount || 0);
            purchases30[i] += amt;
            profit30[i] -= amt;
            const m = String(d.paymentMode || '').toUpperCase();
            if (m === 'CREDIT') purchaseSplit30[i].credit += amt;
            else if (m === 'CHEQUE') purchaseSplit30[i].cheque += amt;
            else purchaseSplit30[i].cash += amt;
        });
        salesHist30.docs.forEach((doc) => {
            const d = doc.data() || {};
            const t = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
            if (!t || Number.isNaN(t.getTime())) return;
            const k = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
            const i = dayIdx[k];
            if (i == null) return;
            const amt = Number(d.amount || 0);
            sales30[i] += amt;
            profit30[i] += amt;
            const m = String(d.paymentMode || '').toUpperCase();
            if (m === 'CREDIT') salesSplit30[i].credit += amt;
            else if (m === 'CHEQUE') salesSplit30[i].cheque += amt;
            else salesSplit30[i].cash += amt;
        });
        side30.docs.forEach((doc) => {
            const d = doc.data() || {};
            const t = d.date?.toDate ? d.date.toDate() : (d.date ? new Date(d.date) : null);
            if (!t || Number.isNaN(t.getTime())) return;
            const k = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
            const i = dayIdx[k];
            if (i == null) return;
            profit30[i] += Number(d.amount || 0);
        });

        const entries = journalSnap.docs.map((doc) => doc.data() || {});
        const monthSales = entries.reduce((sum, entry) => {
            const ref = String(entry.referenceType || '').toUpperCase();
            if (!['MANUFACTURING_FINISHED_GOOD_SALE', 'SALE', 'DISTRIBUTOR_ORDER_APPROVED'].includes(ref)) return sum;
            return sum + (Number(entry.totalCredit) || 0);
        }, 0);

        const rmPurchaseMonth = entries.reduce((sum, entry) => {
            const ref = String(entry.referenceType || '').toUpperCase();
            if (ref !== 'MANUFACTURING_RAW_MATERIAL_PURCHASED') return sum;
            return sum + (Number(entry.totalDebit) || 0);
        }, 0);

        const netProfit = (monthSales + sideIncomeMonth) - (rmPurchaseMonth + productionCostMonth + operationalCostMonth);
        const cashFlow = this.calculateCashFlow(entries);
        const runToday = prodSnap.docs.filter((doc) => {
            const d = doc.data() || {};
            const t = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
            return t && !Number.isNaN(t.getTime()) && t >= startToday;
        }).length;
        const productionStatus = runToday > 0 ? 100 : (productionRuns > 0 ? 65 : 20);
        const yieldSeries = mapSnap.docs.map((doc) => {
            const d = doc.data() || {};
            const i = Number(d.inputQty) || 0;
            const o = Number(d.outputQty) || 0;
            return i > 0 ? (o / i) * 100 : null;
        }).filter((v) => v != null);
        const materialEfficiencyYield = yieldSeries.length
            ? yieldSeries.reduce((a, b) => a + b, 0) / yieldSeries.length
            : 0;
        const pendingSettlements = (payableSnap.size || 0) + (receivableSnap.size || 0);

        return {
            todaySales: 0,
            monthSales,
            rmStockValue,
            fgStockValue,
            productionRuns,
            productionStatus,
            materialEfficiencyYield,
            pendingSettlements,
            manufacturer30Labels: dayKeys,
            manufacturerPurchases30: purchases30,
            manufacturerSales30: sales30,
            manufacturerProduction30: production30,
            manufacturerProfit30: profit30,
            manufacturerPurchasesPaymentSplit30: purchaseSplit30,
            manufacturerSalesPaymentSplit30: salesSplit30,
            rmPurchaseMonth,
            productionCostMonth,
            operationalCostMonth,
            sideIncomeMonth,
            monthProfit: netProfit,
            cashFlow
        };
    }

    getDashboardStructure(businessType) {
        businessType = this.normalizeBusinessType(businessType);
        const structures = {
            retail: ['todaySales', 'monthSales', 'pendingOrders', 'lowStock', 'cashFlow'],
            distributor: [
                'pendingQueueCount', 'todaySales', 'monthSales', 'approvedCount', 'rejectedCount',
                'dispatchedCount', 'deliveredCount', 'totalStockValue', 'outOfStockCount', 'lowStockAlertCount',
                'returnsCat1Units', 'returnsCat2Units', 'freeIssueUnits', 'freeIssueValueEst', 'outstandingBalance',
                'activeReps', 'newCustomers', 'monthOrderCount', 'cashFlow'
            ],
            pharmacy: ['todaySales', 'monthSales', 'expiringSoon', 'drugCategories', 'prescriptionUploads', 'cashFlow'],
            hardware: ['todaySales', 'monthSales', 'unitConvertibleItems', 'bulkWeightPricedItems', 'bulkItems', 'quotationCount', 'quoteConversionRate', 'cashFlow'],
            service: ['todayAppointments', 'upcomingAppointments', 'todaySales', 'serviceBills', 'utilization', 'clients', 'cashFlow'],
            manufacturer: ['rmStockValue', 'fgStockValue', 'productionRuns', 'productionStatus', 'materialEfficiencyYield', 'pendingSettlements', 'rmPurchaseMonth', 'productionCostMonth', 'operationalCostMonth', 'sideIncomeMonth', 'monthSales', 'monthProfit', 'cashFlow'],
            scrap_collection_center: ['todaySales', 'todayBuying', 'todayStockIn', 'todayStockOut', 'monthSales', 'monthBuying', 'monthStockIn', 'monthStockOut', 'monthProfit', 'stockValue', 'cashFlow', 'scrapGlRevenue', 'scrapGlCogs', 'scrapGlLoansGiven', 'scrapGlInterestIncome', 'scrapGlNet1030', 'scrapGlNet1060', 'outstandingLoans', 'advanceOutstanding', 'externalSettlementNet', 'lowStock']
        };
        return structures[businessType] || structures.retail;
    }

    async getMetrics(context) {
        if (!context) return null;
        const normalizedType = this.normalizeBusinessType(context.businessType);
        context = { ...context, businessType: normalizedType };
        if (context.businessType === 'distributor') return this.getDistributorMetrics(context);
        if (context.businessType === 'pharmacy') return this.getPharmacyMetrics(context);
        if (context.businessType === 'hardware') return this.getHardwareMetrics(context);
        if (context.businessType === 'service') return this.getServiceMetrics(context);
        if (context.businessType === 'manufacturer') return this.getManufacturerMetrics(context);
        if (context.businessType === 'scrap_collection_center') return this.getScrapMetrics(context);
        return this.getRetailMetrics(context);
    }
}

window.dashboardCore = new DashboardCore();
console.log('✅ Dashboard Core Initialized');
