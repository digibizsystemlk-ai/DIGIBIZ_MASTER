// Universal Dashboard Core - business-aware metrics aggregator

class DashboardCore {
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

    async getContext(user) {
        if (!user) return null;

        await this.ensureMwTradingOwnerBizMembership(user);

        const userDoc = await window.db.collection('users').doc(user.uid).get();
        const storedBusinessId = this.getStoredBusinessId();
        const storedBusinessType = this.getStoredBusinessType();
        const businessId = userDoc.exists
            ? (userDoc.data().businessId || storedBusinessId || user.uid)
            : (storedBusinessId || user.uid);

        let businessType = storedBusinessType || 'retail';
        let businessName = 'Business';
        const businessDoc = await window.db.collection('businesses').doc(businessId).get();
        if (businessDoc.exists) {
            businessType = businessDoc.data().businessType || businessType;
            businessName = businessDoc.data().name || businessName;
        }

        const context = { userId: user.uid, businessId, businessType, businessName };
        this.persistContext(context);
        return context;
    }

    async getRecentJournalActivities(businessId, limit = 5) {
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

    async getDistributorMetrics(context) {
        const bid = context.businessId;
        const [snapshot, pendingSnap, productsSnap, repsSnap, shopsSnap] = await Promise.all([
            window.db.collection('orders').where('businessId', '==', bid).get(),
            window.db.collection('pendingOrders').where('businessId', '==', bid).get(),
            window.db.collection('products').where('businessId', '==', bid).get(),
            window.db.collection('reps').where('businessId', '==', bid).get(),
            window.db.collection('shops').where('businessId', '==', bid).get()
        ]);

        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);

        let todaySales = 0;
        let monthSales = 0;
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
        let outstandingBalance = 0;
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

            if (dateValue && dateValue >= startMonth && isRevenueOrder) monthSales += amount;
            if (dateValue && dateValue >= startToday && isRevenueOrder) todaySales += amount;

            if (isRevenueOrder) {
                const paid = Number(order.collectionAmount) || Number(order.collectedAmount) || 0;
                outstandingBalance += Math.max(0, amount - paid);
            }

            if (dateValue && isRevenueOrder) {
                const dk = `${dateValue.getFullYear()}-${dateValue.getMonth()}-${dateValue.getDate()}`;
                const di = trendDayKeyToIndex[dk];
                if (di != null) dayTotals[di] += amount;
            }
        };

        pendingSnap.docs.forEach((doc) => accumulateOrder(doc.data(), true));
        snapshot.docs.forEach((doc) => accumulateOrder(doc.data(), false));

        let totalStockValue = 0;
        let outOfStockCount = 0;
        let lowStockAlertCount = 0;
        const lowStockList = [];
        const topProductLines = [];
        productsSnap.forEach((doc) => {
            const p = doc.data();
            const q = Number(p.currentStock != null ? p.currentStock : p.stock) || 0;
            const price = Number(p.unitPrice) || 0;
            totalStockValue += q * price;
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

        const monthJournal = await window.db.collection('journal').doc(bid).collection('entries')
            .where('date', '>=', startMonth)
            .get();
        const cashFlow = this.calculateCashFlow(monthJournal.docs.map((doc) => doc.data()));

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

    getDashboardStructure(businessType) {
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
            service: ['todayAppointments', 'upcomingAppointments', 'todaySales', 'serviceBills', 'utilization', 'clients', 'cashFlow']
        };
        return structures[businessType] || structures.retail;
    }

    async getMetrics(context) {
        if (!context) return null;
        if (context.businessType === 'distributor') return this.getDistributorMetrics(context);
        if (context.businessType === 'pharmacy') return this.getPharmacyMetrics(context);
        if (context.businessType === 'hardware') return this.getHardwareMetrics(context);
        if (context.businessType === 'service') return this.getServiceMetrics(context);
        return this.getRetailMetrics(context);
    }
}

window.dashboardCore = new DashboardCore();
console.log('✅ Dashboard Core Initialized');
