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
            
            // 2. Fallback: Check by Email (for new staff)
            const email = String(user.email || '').trim().toLowerCase();
            if (email) {
                const bizUserEmailDoc = await window.db.collection('businesses').doc(bid).collection('users').doc(email).get();
                if (bizUserEmailDoc.exists) return true;
            }
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
                // 1. Try UID-based lookup
                let memberSnap = await window.db.collectionGroup('users')
                    .where(firebase.firestore.FieldPath.documentId(), '==', user.uid)
                    .limit(1)
                    .get();

                // 2. Fallback: Try Global Staff Registry (High reliability for new staff)
                if (memberSnap.empty && user.email) {
                    const emailNorm = String(user.email).trim().toLowerCase();
                    const registryDoc = await window.db.collection('staff_registry').doc(emailNorm).get();
                    if (registryDoc.exists) {
                        const regData = registryDoc.data();
                        const memberBusinessId = String(regData.businessId || '').trim();
                        if (memberBusinessId && await this.canAccessBusiness(user, memberBusinessId, userDocData)) {
                            try {
                                // AUTO-LINK: Update global user profile and sync to business sub-collection
                                const updateBatch = window.db.batch();
                                updateBatch.set(window.db.collection('users').doc(user.uid), { businessId: memberBusinessId }, { merge: true });
                                updateBatch.set(window.db.collection('businesses').doc(memberBusinessId).collection('users').doc(user.uid), {
                                    email: emailNorm,
                                    role: regData.role || 'VIEWER',
                                    uid: user.uid,
                                    linkedAt: new Date()
                                }, { merge: true });
                                await updateBatch.commit();
                            } catch (ePersist) { /* ignore */ }
                            return memberBusinessId;
                        }
                    }
                }

                // 3. Last Resort: Collection Group Lookup
                if (memberSnap.empty && user.email) {
                    const emailNorm = String(user.email).trim().toLowerCase();
                    memberSnap = await window.db.collectionGroup('users')
                        .where('email', '==', emailNorm)
                        .limit(1)
                        .get();
                    
                    if (memberSnap.empty) {
                        memberSnap = await window.db.collectionGroup('users')
                            .where(firebase.firestore.FieldPath.documentId(), '==', emailNorm)
                            .limit(1)
                            .get();
                    }
                }

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

        const userDoc = await window.db.collection('users').doc(user.uid).get();
        const userDocData = userDoc.exists ? (userDoc.data() || {}) : {};
        const storedBusinessId = this.getStoredBusinessId();
        
        let businessId = '';
        
        // 1. ALWAYS try to resolve staff/fallback membership first (Priority over self-owned new biz)
        const fallbackBusinessId = await this.resolveFallbackBusinessId(user, userDocData);
        
        if (fallbackBusinessId) {
            businessId = fallbackBusinessId;
        } else if (storedBusinessId && await this.canAccessBusiness(user, storedBusinessId, userDocData)) {
            businessId = storedBusinessId;
        } else {
            businessId = user.uid;
        }

        await this.ensureMwTradingOwnerBizMembership(user);
        if (typeof window.ensureMwTradingBusinessProfile === 'function' && this.isMwTradingOwner(user)) {
            await window.ensureMwTradingBusinessProfile();
        }
        if (typeof window.ensureSpranzaBusinessProfile === 'function' && (businessId === 'SPRANZA_PVT_LTD' || (userDocData && userDocData.businessId === 'SPRANZA_PVT_LTD'))) {
            await window.ensureSpranzaBusinessProfile();
        }

        const storedBusinessType = this.normalizeBusinessType(this.getStoredBusinessType());
        const shouldPreferManufacturer = storedBusinessType === 'manufacturer' || String(window.location.pathname || '').toLowerCase().includes('/modules/manufacturer/');
        let businessType = shouldPreferManufacturer ? 'manufacturer' : 'retail';

        const userEmail = String(user.email || '').trim().toLowerCase();
        
        const isImpersonating = localStorage.getItem('digibiz_impersonate_active') === 'true';
        if (isImpersonating) {
            businessId = localStorage.getItem('digibiz_impersonate_biz_id') || localStorage.getItem('currentBusinessId') || businessId;
            businessType = this.normalizeBusinessType(localStorage.getItem('digibiz_impersonate_type') || localStorage.getItem('currentBusinessType') || 'retail');
        } else if ((userEmail === 'biz.himeshi@gmail.com' || userEmail === 'biz.sirimal@gmail.com' || userEmail === '2biz.sirimal@gmail.com' || userEmail === 'scrap@chinthaka.com')) {
            businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
            businessType = 'scrap_collection_center';
        }
        console.log('[Dashboard Context] Resolved BID:', businessId, 'Type:', businessType);
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

        // Final safety check for Sirimal
        const email = String(user.email || '').toLowerCase();
        const isAdminEmail = (email === 'biz.sirimal@gmail.com' || email === '2biz.sirimal@gmail.com' || email === 'scrap@chinthaka.com');
        
        if (isAdminEmail && (businessId === 'oDhSDYHQ2dV1DP33koysmZAqaY13' || businessId === 'STAGING_TEST_SCRAP_BIZ' || businessId === '8KlnS39HmqYwtcNzM0NZMkq6om63')) {
            businessType = 'scrap_collection_center';
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
        
        // Pre-fetch permission overrides if applicable
        if (businessId && window.DigibizDistributorPermissions && typeof window.DigibizDistributorPermissions.fetchAndCachePermissions === 'function') {
            await window.DigibizDistributorPermissions.fetchAndCachePermissions(businessId);
        }

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
        return snapshot.docs.map(doc => {
            const data = doc.data() || {};
            let totalDebit = Number(data.totalDebit) || 0;
            if (!totalDebit && Array.isArray(data.entries)) {
                totalDebit = data.entries.reduce((sum, row) => {
                    let dr = Number(row.debit) || 0;
                    if (row.amount !== undefined && row.type === 'debit') {
                        dr = Number(row.amount) || 0;
                    }
                    return sum + dr;
                }, 0);
            }
            return { id: doc.id, ...data, totalDebit };
        });
    }

    calculateCashFlow(entries) {
        return entries.reduce((sum, entry) => {
            if (!Array.isArray(entry.entries)) return sum;
            return sum + entry.entries.reduce((entrySum, row) => {
                const code = String(row.accountCode || row.accountId || '');
                if (!code.startsWith('1-1010') && !code.startsWith('1-1020')) return entrySum;
                
                let dr = Number(row.debit) || 0;
                let cr = Number(row.credit) || 0;
                
                if (row.amount !== undefined && row.type !== undefined) {
                    if (row.type === 'debit') dr = Number(row.amount) || 0;
                    if (row.type === 'credit') cr = Number(row.amount) || 0;
                }
                
                return entrySum + dr - cr;
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
                        const fCost = Number(item.buyingPrice || item.buyingPriceRaw || item.costPrice) || ((Number(item.unitPrice) || 0) * 0.93);
                        freeIssueValueEst += fq * fCost;
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
            const buyPrice = Number(p.buyingPrice || p.buyingPriceRaw || p.costPrice) || ((Number(p.unitPrice) || 0) * 0.93);
            if (q === 0) outOfStockCount++;
            else if (q <= (Number(p.minStockLevel) || 10)) lowStockAlertCount++;
            if (q === 0 || (q > 0 && q <= (Number(p.minStockLevel) || 10))) {
                lowStockList.push({ name: p.name || '—', brand: p.brand || '', q });
            }
            topProductLines.push({
                name: p.name || '—',
                brand: p.brand || '',
                v: q * buyPrice
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

        const journalSnapshot = await window.db.collection('journal').doc(context.businessId).collection('entries')
            .orderBy('date', 'desc')
            .get();
        const allEntries = journalSnapshot.docs.map(doc => doc.data());

        const monthEntries = allEntries.filter(entry => {
            if (!entry.date) return false;
            const entryDate = entry.date.toDate ? entry.date.toDate() : new Date(entry.date);
            return entryDate >= startMonth;
        });

        let monthSales = 0;
        let todaySales = 0;
        monthEntries.forEach(entry => {
            if (!['SALE', 'DISTRIBUTOR_ORDER_APPROVED'].includes(entry.referenceType)) return;
            const amount = Number(entry.totalCredit) || 0;
            monthSales += amount;
            const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
            if (entryDate >= startToday) todaySales += amount;
        });

        const cashFlow = this.calculateCashFlow(monthEntries);
        const cashBalance = monthEntries.reduce((sum, entry) => {
            if (!Array.isArray(entry.entries)) return sum;
            return sum + entry.entries.reduce((entrySum, row) => {
                const code = String(row.accountCode || row.accountId || '');
                if (!code.startsWith('1-1010')) return entrySum;
                let dr = Number(row.debit) || 0;
                let cr = Number(row.credit) || 0;
                if (row.amount !== undefined && row.type !== undefined) {
                    if (row.type === 'debit') dr = Number(row.amount) || 0;
                    if (row.type === 'credit') cr = Number(row.amount) || 0;
                }
                return entrySum + dr - cr;
            }, 0);
        }, 0);
        const bankBalance = monthEntries.reduce((sum, entry) => {
            if (!Array.isArray(entry.entries)) return sum;
            return sum + entry.entries.reduce((entrySum, row) => {
                const code = String(row.accountCode || row.accountId || '');
                if (!code.startsWith('1-1020')) return entrySum;
                let dr = Number(row.debit) || 0;
                let cr = Number(row.credit) || 0;
                if (row.amount !== undefined && row.type !== undefined) {
                    if (row.type === 'debit') dr = Number(row.amount) || 0;
                    if (row.type === 'credit') cr = Number(row.amount) || 0;
                }
                return entrySum + dr - cr;
            }, 0);
        }, 0);

        let w1 = 0, w2 = 0, w3 = 0, w4 = 0;
        monthEntries.forEach(entry => {
            const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
            const day = entryDate.getDate();
            let net = 0;
            if (Array.isArray(entry.entries)) {
                entry.entries.forEach(row => {
                    const code = String(row.accountCode || row.accountId || '');
                    if (!code.startsWith('1-1010') && !code.startsWith('1-1020')) return;
                    let dr = Number(row.debit) || 0;
                    let cr = Number(row.credit) || 0;
                    if (row.amount !== undefined && row.type !== undefined) {
                        if (row.type === 'debit') dr = Number(row.amount) || 0;
                        if (row.type === 'credit') cr = Number(row.amount) || 0;
                    }
                    net += dr - cr;
                });
            }
            if (day <= 7) w1 += net;
            else if (day <= 14) w2 += net;
            else if (day <= 21) w3 += net;
            else w4 += net;
        });

        const cashFlowWeeks = [w1, w1 + w2, w1 + w2 + w3, w1 + w2 + w3 + w4];

        let stockValue = 0;
        let supplierOutstanding = 0;
        let customerOutstanding = 0;

        const glBalances = {};
        allEntries.forEach(entry => {
            if (entry.isReversed || entry.reversalOf) return;
            (entry.entries || []).forEach(row => {
                const code = row.accountCode || row.accountId || '';
                if (!code) return;
                
                let dr = Number(row.debit) || 0;
                let cr = Number(row.credit) || 0;
                if (row.amount !== undefined && row.type !== undefined) {
                    if (row.type === 'debit') dr = Number(row.amount) || 0;
                    if (row.type === 'credit') cr = Number(row.amount) || 0;
                }

                if (!glBalances[code]) {
                    glBalances[code] = { debit: 0, credit: 0 };
                }
                glBalances[code].debit += dr;
                glBalances[code].credit += cr;
            });
        });

        if (glBalances['1-1040-01']) {
            stockValue = glBalances['1-1040-01'].debit - glBalances['1-1040-01'].credit;
        }
        if (glBalances['1-1030-01']) {
            customerOutstanding = glBalances['1-1030-01'].debit - glBalances['1-1030-01'].credit;
        }
        if (glBalances['2-2010-01']) {
            supplierOutstanding = glBalances['2-2010-01'].credit - glBalances['2-2010-01'].debit;
        }

        return { todaySales, monthSales, pendingOrders, lowStock, cashFlow, cashBalance, bankBalance, cashFlowWeeks, stockValue, supplierOutstanding, customerOutstanding };
    }

    async getTireCentreMetrics(context) {
        const extractDate = (val) => {
            if (!val) return null;
            if (typeof val.toDate === 'function') {
                const d = val.toDate();
                return isNaN(d.getTime()) ? null : d;
            }
            if (val.seconds !== undefined) {
                const d = new Date(val.seconds * 1000);
                return isNaN(d.getTime()) ? null : d;
            }
            if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
            if (typeof val === 'number') {
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            }
            if (typeof val === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    const [y, m, day] = val.split('-').map(Number);
                    return new Date(y, m - 1, day, 12, 0, 0);
                }
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            }
            return null;
        };

        const toLocalDateStr = (d) => {
            if (!d || isNaN(d.getTime())) return '';
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const now = new Date();
        const todayStr = toLocalDateStr(now);
        const monthStr = todayStr.slice(0, 7);

        // 1. Fetch Orders / Sales
        let todaySales = 0;
        let monthSales = 0;
        let completedOrdersCount = 0;
        let pendingOrdersCount = 0;
        let creditOrdersSum = 0;
        let cashSales = 0;
        let bankSales = 0;

        try {
            const orderSnapshot = await window.db.collection('orders').doc(context.businessId).collection('list').get();
            orderSnapshot.docs.forEach(doc => {
                const order = doc.data() || {};
                if (order.isReversed === true || order.status === 'cancelled') return;
                
                let lineTotal = 0;
                if (Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const q = Number(item.quantity || item.qty || 0);
                        const p = Number(item.price || item.unitPrice || 0);
                        lineTotal += (q * p);
                    });
                }
                const amt = Number(order.total ?? order.netTotal ?? order.grandTotal ?? order.amount ?? lineTotal ?? 0);
                const oDate = extractDate(order.createdAt) || extractDate(order.date) || extractDate(order.invoiceDate) || extractDate(order.orderDate) || extractDate(order.timestamp);
                const oDateStr = toLocalDateStr(oDate);

                if (oDateStr) {
                    if (oDateStr.startsWith(monthStr)) monthSales += amt;
                    if (oDateStr === todayStr) todaySales += amt;
                }

                const pm = String(order.paymentMethod || 'cash').toLowerCase();
                if (order.status !== 'credit' && order.paymentStatus !== 'UNPAID') {
                    if (pm === 'bank' || pm === 'card' || pm === 'online' || pm === 'cheque') {
                        bankSales += amt;
                    } else {
                        cashSales += amt;
                    }
                }

                if (['pending', 'hold', 'credit', 'UNPAID'].includes(order.status) || order.paymentStatus === 'UNPAID') {
                    pendingOrdersCount++;
                    if (order.status === 'credit' || order.paymentStatus === 'UNPAID') {
                        creditOrdersSum += amt;
                    }
                } else {
                    completedOrdersCount++;
                }
            });
        } catch (e) {
            console.warn('[Dashboard] Tire Centre orders fetch error:', e);
        }

        // Also check journal entries for SALE refType
        try {
            const journalSnapshot = await window.db.collection('journal').doc(context.businessId).collection('entries').get();
            journalSnapshot.docs.forEach(doc => {
                const entry = doc.data() || {};
                if (entry.isReversed || (entry.refType !== 'SALE' && entry.referenceType !== 'SALE')) return;
                const amt = Number(entry.totalCredit || entry.totalDebit || entry.amount) || 0;
                const eDate = extractDate(entry.date) || extractDate(entry.createdAt);
                const eDateStr = toLocalDateStr(eDate);

                if (eDateStr) {
                    if (eDateStr.startsWith(monthStr) && monthSales === 0) monthSales += amt;
                    if (eDateStr === todayStr && todaySales === 0) todaySales += amt;
                }
            });
        } catch (e) {}

        // 2. Fetch Products / Inventory
        let lowStock = 0;
        let stockValue = 0;
        let totalTireSkus = 0;

        try {
            const productSnapshot = await window.db.collection('products').doc(context.businessId).collection('list').get();
            productSnapshot.docs.forEach(doc => {
                const p = doc.data();
                if (p.isService === true) return; // Skip service items

                totalTireSkus++;
                const stock = Number(p.stock) || 0;
                const restockLevel = Number(p.restockLevel) || 5;
                if (stock <= restockLevel) lowStock++;

                const cost = Number(p.cost) || Number(p.price) || 0;
                if (stock > 0 && cost > 0) {
                    stockValue += (stock * cost);
                }
            });
        } catch (e) {
            console.warn('[Dashboard] Tire Centre products fetch error:', e);
        }

        // 3. Fetch Appointments
        let todayAppointments = 0;
        try {
            const apptSnapshot = await window.db.collection('appointments').doc(context.businessId).collection('list').get();
            apptSnapshot.docs.forEach(doc => {
                const appt = doc.data();
                let aDate = null;
                if (appt.date) aDate = appt.date.toDate ? appt.date.toDate() : new Date(appt.date);
                else if (appt.createdAt) aDate = appt.createdAt.toDate ? appt.createdAt.toDate() : new Date(appt.createdAt);

                if (aDate && !isNaN(aDate.getTime()) && aDate >= startToday && aDate <= endToday) {
                    todayAppointments++;
                }
            });
        } catch (e) {
            console.warn('[Dashboard] Tire Centre appointments fetch error:', e);
        }

        // 4. Fetch Expenses & Cash/Bank split
        let monthExpenses = 0;
        let cashExpenses = 0;
        let bankExpenses = 0;
        try {
            const expSnapshot = await window.db.collection('expenses').doc(context.businessId).collection('list').get();
            expSnapshot.docs.forEach(doc => {
                const exp = doc.data();
                const amt = Number(exp.amount) || 0;
                let eDate = null;
                if (exp.expenseDate) eDate = new Date(exp.expenseDate);
                else if (exp.createdAt) eDate = exp.createdAt.toDate ? exp.createdAt.toDate() : new Date(exp.createdAt);

                const payMethod = String(exp.paymentMethod || 'cash').toLowerCase();
                if (eDate && !isNaN(eDate.getTime()) && eDate >= startMonth) {
                    monthExpenses += amt;
                    if (payMethod === 'bank' || payMethod === 'cheque') bankExpenses += amt;
                    else cashExpenses += amt;
                }
            });
        } catch (e) {
            console.warn('[Dashboard] Tire Centre expenses fetch error:', e);
        }

        // 5. Fetch Onboarding balances from businesses/{businessId} and journal/{businessId}/entries
        let initCash = 0;
        let initBank = 0;
        try {
            const bizDoc = await window.db.collection('businesses').doc(context.businessId).get();
            if (bizDoc.exists && bizDoc.data().onboardingBalances) {
                const b = bizDoc.data().onboardingBalances;
                initCash = Number(b.cash) || 0;
                initBank = Number(b.bank) || 0;
            }

            // Also check journal entries with refType === 'ONBOARDING'
            const journalSnap = await window.db.collection('journal').doc(context.businessId).collection('entries')
                .where('refType', '==', 'ONBOARDING').get();
            journalSnap.docs.forEach(doc => {
                const d = doc.data();
                const ref = String(d.ref || '');
                (d.entries || []).forEach(row => {
                    const code = String(row.accountCode || row.accountId || '');
                    const amt = Number(row.amount) || Number(row.debit) || 0;
                    if (ref === 'onboarding_cash' || code.startsWith('1-1010')) {
                        if (!initCash) initCash = amt;
                    }
                    if (ref === 'onboarding_bank' || code.startsWith('1-1020')) {
                        if (!initBank) initBank = amt;
                    }
                });
            });
        } catch (e) {
            console.warn('[Dashboard] Onboarding balance fetch error:', e);
        }

        // 6. Fetch Purchases / GRNs
        let cashPurchases = 0;
        let bankPurchases = 0;
        let unpaidPurchasesSum = 0;
        try {
            const poSnapshot = await window.db.collection('purchases').doc(context.businessId).collection('orders').get();
            poSnapshot.docs.forEach(doc => {
                const po = doc.data();
                const amt = Number(po.netTotal || po.total || po.amount) || 0;
                const payMethod = String(po.paymentMethod || 'cash').toLowerCase();
                if (po.paymentStatus === 'UNPAID') {
                    unpaidPurchasesSum += amt;
                } else {
                    if (payMethod === 'bank' || payMethod === 'cheque') bankPurchases += amt;
                    else cashPurchases += amt;
                }
            });
        } catch (e) {}

        // 7. Bank Transactions for Cash Deposits, Withdrawals, Cheques, Loans

        // 7b. Fetch Bank Transactions for Cash Deposits, Withdrawals, Cheques, Loans
        let cashDepositsTotal = 0;
        let cashWithdrawalsTotal = 0;
        let chequeDepositsTotal = 0;
        let bankLoanAdditions = 0;
        let bankLoanRepayments = 0;
        try {
            const bankTxSnap = await window.db.collection('banks').doc(context.businessId).collection('transactions').get();
            bankTxSnap.docs.forEach(doc => {
                const tx = doc.data() || {};
                const amt = Number(tx.amount) || 0;
                const type = String(tx.type || '').toUpperCase();
                if (type === 'CASH_DEPOSIT') {
                    cashDepositsTotal += amt;
                } else if (type === 'CASH_WITHDRAWAL' || type === 'WITHDRAWAL') {
                    cashWithdrawalsTotal += amt;
                } else if (type === 'CHEQUE_DEPOSIT' || type === 'CHEQUE_CLEARANCE') {
                    chequeDepositsTotal += amt;
                } else if (type === 'LOAN' || type === 'LINK_LOAN' || type === 'LOAN_ADDITION') {
                    if (tx.isExistingLiabilityOnly !== true) {
                        bankLoanAdditions += amt;
                    }
                } else if (type === 'LOAN_REPAYMENT' || type === 'REPAY_LOAN') {
                    bankLoanRepayments += amt;
                }
            });
        } catch (e) {}

        const cashInflows = cashSales + cashWithdrawalsTotal;
        const cashOutflows = cashExpenses + cashPurchases + cashDepositsTotal;
        const cashBalance = Math.max(0, initCash + cashInflows - cashOutflows);

        const bankInflows = bankSales + cashDepositsTotal + chequeDepositsTotal + bankLoanAdditions;
        const bankOutflows = bankExpenses + bankPurchases + cashWithdrawalsTotal + bankLoanRepayments;
        const bankBalance = Math.max(0, initBank + bankInflows - bankOutflows);
        const cashFlow = cashBalance + bankBalance;

        // 8. Receivables & Payables
        let customerListSum = 0;
        let supplierListSum = 0;
        try {
            const custSnap = await window.db.collection('customers').doc(context.businessId).collection('list').get();
            custSnap.docs.forEach(doc => {
                customerListSum += (Number(doc.data().balance || doc.data().outstanding) || 0);
            });
        } catch (e) {}

        try {
            const supSnap = await window.db.collection('suppliers').doc(context.businessId).collection('list').get();
            supSnap.docs.forEach(doc => {
                supplierListSum += (Number(doc.data().balance || doc.data().outstanding) || 0);
            });
        } catch (e) {}

        let glCustomerOutstanding = 0;
        let glSupplierOutstanding = 0;
        let glStockValue = 0;
        try {
            const journalSnap = await window.db.collection('journal').doc(context.businessId).collection('entries').get();
            const glBalances = {};
            journalSnap.docs.forEach(doc => {
                const entry = doc.data();
                if (entry.isReversed) return;
                (entry.entries || []).forEach(row => {
                    const code = row.accountCode || row.accountId || '';
                    if (!code) return;
                    let dr = Number(row.debit) || 0;
                    let cr = Number(row.credit) || 0;
                    if (row.amount !== undefined && row.type !== undefined) {
                        if (row.type === 'debit') dr = Number(row.amount) || 0;
                        if (row.type === 'credit') cr = Number(row.amount) || 0;
                    }
                    if (!glBalances[code]) glBalances[code] = { debit: 0, credit: 0 };
                    glBalances[code].debit += dr;
                    glBalances[code].credit += cr;
                });
            });

            if (glBalances['1-1030-01']) glCustomerOutstanding = Math.max(0, glBalances['1-1030-01'].debit - glBalances['1-1030-01'].credit);
            if (glBalances['2-2010-01']) glSupplierOutstanding = Math.max(0, glBalances['2-2010-01'].credit - glBalances['2-2010-01'].debit);
            if (glBalances['1-1040-01']) glStockValue = Math.max(0, glBalances['1-1040-01'].debit - glBalances['1-1040-01'].credit);
        } catch (e) {}

        const customerOutstanding = Math.max(customerListSum, creditOrdersSum, glCustomerOutstanding);
        const supplierOutstanding = Math.max(supplierListSum, unpaidPurchasesSum, glSupplierOutstanding);
        if (stockValue === 0 && glStockValue > 0) stockValue = glStockValue;

        const cashFlowWeeks = [
            Math.round(cashFlow * 0.25),
            Math.round(cashFlow * 0.50),
            Math.round(cashFlow * 0.75),
            Math.round(cashFlow)
        ];

        return {
            todaySales,
            monthSales,
            todayAppointments,
            lowStock,
            cashFlow,
            cashBalance,
            bankBalance,
            cashInflows,
            cashOutflows,
            bankInflows,
            bankOutflows,
            cashDepositsTotal,
            cashWithdrawalsTotal,
            chequeDepositsTotal,
            bankLoanAdditions,
            bankLoanRepayments,
            cashSales,
            bankSales,
            cashExpenses,
            bankExpenses,
            cashPurchases,
            bankPurchases,
            cashFlowWeeks,
            stockValue,
            supplierOutstanding,
            customerOutstanding,
            totalTireSkus,
            pendingOrdersCount,
            completedOrdersCount
        };
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

        const yearAgo = new Date();
        yearAgo.setDate(yearAgo.getDate() - 364);
        yearAgo.setHours(0, 0, 0, 0);
        const yearAgoMs = yearAgo.getTime();

        const isScrap = String(context.businessType || '').toLowerCase() === 'scrap_collection_center';
        const emptySnap = () => ({ docs: [] });
        const [itemsSnap, buySnap, sellSnap, loanSnap, allJournalSnap, journalLedgerSnap, openingSnap, extSnap, advSnap, incomeSnap] = await Promise.all([
            window.db.collection('scrap_items').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('buying_history').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('selling_history').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('scrap_loans').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('journal').doc(bid).collection('entries').get().catch(() => emptySnap()),
            window.db.collection('journal').doc(bid).collection('account_ledger').get().catch(() => emptySnap()),
            window.db.collection('journal').doc(bid).collection('ledger_opening').doc('current').get().catch(() => ({ exists: false, data: () => ({}) })),
            window.db.collection('scrap_external_settlements').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('scrap_advances').where('businessId', '==', bid).get().catch(() => emptySnap()),
            window.db.collection('scrap_income').where('businessId', '==', bid).get().catch(() => emptySnap())
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

        // Map of selling prices for margin calculation
        const sellPriceMap = {};
        this.querySnapDocs(itemsSnap).forEach(doc => {
            const r = doc.data();
            sellPriceMap[doc.id] = Number(r.sellingPrice) || 0;
        });

        // Dynamic Range Calculation
        const allSnaps = [buySnap, sellSnap, incomeSnap];
        let minTms = startTodayMs;
        const getUniversalDate = (row) => this.scrapOperationalDateMs(row) || (row.incomeDate ? new Date(row.incomeDate).getTime() : null);

        allSnaps.forEach(snap => {
            this.querySnapDocs(snap).forEach(doc => {
                const t = getUniversalDate(doc.data());
                if (t && t < minTms && t >= yearAgoMs) minTms = t;
            });
        });

        const diffMs = startTodayMs - minTms;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        // End at Yesterday, Start at Earliest
        // If diffDays is 2 (May 11, 12), displayDays should be 2.
        const displayDays = Math.max(1, Math.min(365, diffDays));

        // Dynamic Aggregation Maps
        const buy365Map = {};
        const sell365Map = {};
        const profit365Map = {};
        const dateLabels365 = [];
        const dateKeys365 = [];

        // Helper for zero-padding: 5 -> "05"
        const pad = (n) => String(n).padStart(2, '0');

        for (let i = displayDays; i >= 1; i--) {
            const d = new Date(startToday);
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            dateKeys365.push(key);
            buy365Map[key] = 0;
            sell365Map[key] = 0;
            profit365Map[key] = 0;
            dateLabels365.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }

        const getDayKey = (row) => {
            const tms = getUniversalDate(row);
            if (tms == null) return null;
            const d = new Date(tms);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        };

        let todayBuying = 0;
        let monthBuying = 0;
        let todayStockIn = 0;
        let monthStockIn = 0;
        let buyMatchedCount = 0;

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
            
            // Aggregation for 365 Days Charts
            const k = getDayKey(r);
            if (dateKeys365.includes(k)) {
                if (buy365Map[k] !== undefined) {
                    buy365Map[k] += amount;
                    buyMatchedCount++;
                }

                // Profit components: Buying Margin + Vehicle Hire
                let m = 0;
                const items = Array.isArray(r.items) ? r.items : [];
                items.forEach((line) => {
                    const w = Number(line.weight) || 0;
                    const bp = Number(line.buyingPrice) || 0;
                    const sp = sellPriceMap[line.itemId] || 0;
                    m += w * Math.max(0, sp - bp);
                });
                const vh = Number(r.vehicleHireApplied || 0);
                profit365Map[k] += (m + vh);
            }
        });

        // Add Additional Income from scrap_income
        this.querySnapDocs(incomeSnap).forEach((doc) => {
            const r = doc.data();
            const k = getDayKey(r);
            if (k && profit365Map[k] !== undefined) {
                profit365Map[k] += (Number(r.amount) || 0);
            }
        });

        let todaySales = 0;
        let monthSales = 0;
        let todayStockOut = 0;
        let monthStockOut = 0;
        let sellMatchedCount = 0;

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
            
            const k = getDayKey(r);
            if (dateKeys365.includes(k)) {
                if (sell365Map[k] !== undefined) {
                    sell365Map[k] += amount;
                    sellMatchedCount++;
                }
            }
        });

        console.log(`[Scrap-Sync] Days:${displayDays}, Matched Buy:${buyMatchedCount}, Sell:${sellMatchedCount}`);

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
            ? this.accountBalance(allEntries, (code) => String(code || '').startsWith('1-1010'))
            : this.accountBalance(legacyEntries, (code) => String(code || '').startsWith('1-1010'));
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

        const cashBalance = mergedSynthetic.length
            ? this.accountBalance(allEntries, (code) => String(code || '').startsWith('1-1010'))
            : this.accountBalance(legacyEntries, (code) => String(code || '').startsWith('1-1010'));
        const bankBalance = mergedSynthetic.length
            ? this.accountBalance(allEntries, (code) => String(code || '').startsWith('1-1020'))
            : this.accountBalance(legacyEntries, (code) => String(code || '').startsWith('1-1020'));

        return {
            todaySales: accountingTodaySales || todaySales,
            monthSales: accountingMonthSales || monthSales,
            todayBuying: accountingTodayBuying || todayBuying,
            monthBuying: accountingMonthBuying || monthBuying,
            cashFlow,
            cashBalance,
            bankBalance,
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
            
            // 365 Days Historical Data
            dateLabels365,
            buy365Data: dateKeys365.map(k => buy365Map[k]),
            sell365Data: dateKeys365.map(k => sell365Map[k]),
            profit365Data: dateKeys365.map(k => profit365Map[k])
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
        let todaySales = 0;
        let todayCogs = 0;
        let todayProfit = 0;
        let monthSales = 0;
        let monthCogs = 0;
        let monthProfitFromSales = 0;
        let overdueCollectablesCount = 0;
        let overdueCollectablesAmount = 0;
        const overdueList = [];
        const todayMs = new Date().getTime();

        salesHist30.docs.forEach((doc) => {
            const d = doc.data() || {};
            if (d.isActive === false) return;
            const t = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
            if (!t || Number.isNaN(t.getTime())) return;

            const amt = Number(d.amount || 0);
            const cogs = Number(d.cogsAmount || (Number(d.qty || 0) * Number(d.fgUnitCost || 0)));
            const profit = amt - cogs;

            if (t >= startToday) {
                todaySales += amt;
                todayCogs += cogs;
                todayProfit += profit;
            }
            if (t >= startMonth) {
                monthSales += amt;
                monthCogs += cogs;
                monthProfitFromSales += profit;
            }

            const k = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
            const i = dayIdx[k];
            if (i != null) {
                sales30[i] += amt;
                profit30[i] += profit;
                const m = String(d.paymentMode || '').toUpperCase();
                if (m === 'CREDIT') salesSplit30[i].credit += amt;
                else if (m === 'CHEQUE') salesSplit30[i].cheque += amt;
                else salesSplit30[i].cash += amt;
            }
        });

        receivableSnap.docs.forEach((doc) => {
            const d = doc.data() || {};
            if (d.isActive === false) return;
            const isCredit = d.paymentMode === 'CREDIT';
            const isCheque = d.paymentMode === 'CHEQUE';
            const dueStr = isCredit ? d.dueDate : (isCheque ? d.chequeClearanceDate : null);
            const amt = Number(d.amount || 0);

            let isOverdue = false;
            if (dueStr) {
                const dueMs = new Date(dueStr + 'T23:59:59').getTime();
                if (!isNaN(dueMs) && dueMs < todayMs) {
                    isOverdue = true;
                }
            }

            if (isOverdue) {
                overdueCollectablesCount++;
                overdueCollectablesAmount += amt;
                overdueList.push({
                    id: doc.id,
                    customer: d.companyName || 'Customer',
                    area: d.area || 'N/A',
                    phone: d.customerMobile || '',
                    amount: amt,
                    dueStr,
                    paymentMode: d.paymentMode
                });
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
            const m = String(d.paymentMode || '').toUpperCase();
            if (m === 'CREDIT') purchaseSplit30[i].credit += amt;
            else if (m === 'CHEQUE') purchaseSplit30[i].cheque += amt;
            else purchaseSplit30[i].cash += amt;
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
        const rmPurchaseMonth = entries.reduce((sum, entry) => {
            const ref = String(entry.referenceType || '').toUpperCase();
            if (ref !== 'MANUFACTURING_RAW_MATERIAL_PURCHASED') return sum;
            return sum + (Number(entry.totalDebit) || 0);
        }, 0);

        const netProfit = monthProfitFromSales + sideIncomeMonth - (productionCostMonth + operationalCostMonth);
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
            todaySales,
            todayProfit,
            monthSales,
            rmStockValue,
            fgStockValue,
            productionRuns,
            productionStatus,
            materialEfficiencyYield,
            pendingSettlements,
            overdueCollectablesCount,
            overdueCollectablesAmount,
            overdueList,
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
            retail: ['todaySales', 'monthSales', 'pendingOrders', 'lowStock', 'cashFlow', 'stockValue', 'customerOutstanding', 'supplierOutstanding'],
            distributor: [
                'pendingQueueCount', 'todaySales', 'monthSales', 'approvedCount', 'rejectedCount',
                'dispatchedCount', 'deliveredCount', 'totalStockValue', 'outOfStockCount', 'lowStockAlertCount',
                'returnsCat1Units', 'returnsCat2Units', 'freeIssueUnits', 'freeIssueValueEst', 'outstandingBalance',
                'activeReps', 'newCustomers', 'monthOrderCount', 'cashFlow'
            ],
            pharmacy: ['todaySales', 'monthSales', 'expiringSoon', 'drugCategories', 'prescriptionUploads', 'cashFlow', 'stockValue', 'customerOutstanding', 'supplierOutstanding'],
            hardware: ['todaySales', 'monthSales', 'unitConvertibleItems', 'bulkWeightPricedItems', 'bulkItems', 'quotationCount', 'quoteConversionRate', 'cashFlow', 'stockValue', 'customerOutstanding', 'supplierOutstanding'],
            service: ['todayAppointments', 'upcomingAppointments', 'todaySales', 'serviceBills', 'utilization', 'clients', 'cashFlow'],
            manufacturer: ['todaySales', 'todayProfit', 'rmStockValue', 'fgStockValue', 'productionRuns', 'productionStatus', 'materialEfficiencyYield', 'pendingSettlements', 'rmPurchaseMonth', 'productionCostMonth', 'operationalCostMonth', 'sideIncomeMonth', 'monthSales', 'monthProfit', 'cashFlow'],
            tire_centre: ['todaySales', 'monthSales', 'todayAppointments', 'lowStock', 'cashFlow', 'stockValue', 'customerOutstanding', 'supplierOutstanding'],
            scrap_collection_center: ['cashBalance', 'bankBalance', 'todaySales', 'todayBuying', 'todayStockIn', 'todayStockOut', 'monthSales', 'monthBuying', 'monthStockIn', 'monthStockOut', 'monthProfit', 'stockValue', 'cashFlow', 'scrapGlRevenue', 'scrapGlCogs', 'scrapGlLoansGiven', 'scrapGlInterestIncome', 'scrapGlNet1030', 'scrapGlNet1060', 'outstandingLoans', 'advanceOutstanding', 'externalSettlementNet', 'lowStock']
        };
        return structures[businessType] || structures.retail;
    }

    async getMetrics(context) {
        if (!context) return null;
        const normalizedType = this.normalizeBusinessType(context.businessType);
        context = { ...context, businessType: normalizedType };
        if (context.businessType === 'tire_centre') return this.getTireCentreMetrics(context);
        if (context.businessType === 'distributor') return this.getDistributorMetrics(context);
        if (context.businessType === 'pharmacy') return this.getPharmacyMetrics(context);
        if (context.businessType === 'hardware') return this.getHardwareMetrics(context);
        if (context.businessType === 'service') return this.getServiceMetrics(context);
        if (context.businessType === 'manufacturer') return this.getManufacturerMetrics(context);
        if (context.businessType === 'scrap_collection_center') return this.getScrapMetrics(context);
        return this.getRetailMetrics(context);
    }
    showDemoSystemNotice() {
        const modalId = 'demoSystemNoticeModal';
        if (document.getElementById(modalId)) return;

        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(8px);
            padding: 20px;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #fff;
            padding: 35px;
            border-radius: 24px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        content.innerHTML = `
            <div style="font-size: 50px; margin-bottom: 20px;">ℹ️</div>
            <h2 style="color: #0f3b2c; margin-bottom: 20px; font-size: 22px; font-weight: 800; line-height: 1.4;">පද්ධති දැනුම්දීමයි</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin-bottom: 30px;">
                මේ ඔබව යොමු කරන්නේ අපගේ පද්ධතිවල ස්වභාවය පරික්ෂා කිරීම සදහා වන <b>තාවකාලික පද්ධතියක් (Demo System)</b> වෙතයි.<br><br>
                පද්ධතියේ ක්‍රියාකාරිත්වය පිළිබඳව අවබෝධයක් ලබා ගැනීමට මෙය භාවිතා කරන්න. එසේම <b>ඔබේ ව්‍යාපාරයටම අනන්‍ය වූ පද්ධතියක්</b> නිර්මාණය කර දීමට අපට හැකියාව ඇත.
            </p>
            <button id="closeDemoNotice" style="
                background: #0f3b2c;
                color: white;
                border: none;
                padding: 14px 30px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                width: 100%;
                transition: transform 0.2s;
            ">පද්ධතිය පරීක්ෂා කිරීම අරඹන්න →</button>
            <style>
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                #closeDemoNotice:hover { transform: scale(1.02); }
            </style>
        `;

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        document.getElementById('closeDemoNotice').onclick = () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s';
            setTimeout(() => overlay.remove(), 300);
        };
    }
}

window.dashboardCore = new DashboardCore();
console.log('✅ Dashboard Core Initialized');
