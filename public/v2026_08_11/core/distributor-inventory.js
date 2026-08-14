/**
 * Distributor / MW-style stock movement types and helpers (email-agnostic).
 * Current stock (MW model) = (Initial + GRN + Cat 2 market returns + replacement-in)
 *                          − (sales from approved orders + Cat 1 returns to factory + replacement-out).
 * orderApprovalStockDelta applies −(ordered + free) + resell returns only; GRN / Cat1 / replacements use warehouse movements.
 * Product docs keep synced numeric fields: currentStock + stock.
 */
(function (global) {
    const MOVEMENT_TYPES = {
        GRN: 'GRN',
        RETURN_TO_COMPANY: 'RETURN_TO_COMPANY',
        RETURN_TO_RESELL: 'RETURN_TO_RESELL',
        REPLACEMENT_OUT: 'REPLACEMENT_OUT',
        REPLACEMENT_IN: 'REPLACEMENT_IN',
        ADJUSTMENT: 'ADJUSTMENT'
    };

    function numericStock(docData) {
        if (!docData) return 0;
        if (docData.currentStock != null && docData.currentStock !== '') {
            const n = Number(docData.currentStock);
            return Number.isFinite(n) ? n : 0;
        }
        const s = Number(docData.stock);
        return Number.isFinite(s) ? s : 0;
    }

    function syncStockPayload(nextQty) {
        const n = Math.max(0, Math.round(Number(nextQty) || 0));
        return { currentStock: n, stock: n };
    }

    /**
     * Stock change when approving a rep order line (sales + return split).
     * Cat 2 (resell / agent) returns add stock back; Cat 1 (to factory/company) does not add to sellable stock.
 * On manager approval, company-return units increment `factoryReturnBucket` on the product (non-sellable bucket).
     * Legacy lines with only returnQty count as resell when split fields are absent.
     */
    function orderApprovalStockDelta(item) {
        const ordered = Number(item.orderedQty) || 0;
        const free = Number(item.freeQty) || 0;
        const rc = Number(item.returnCompanyQty) || 0;
        const legacy = Number(item.returnQty) || 0;
        let resellBack = 0;
        if (item.returnResellQty != null || item.returnCompanyQty != null) {
            resellBack = Number(item.returnResellQty) || 0;
            void rc;
        } else {
            resellBack = legacy;
        }
        return -(ordered + free) + resellBack;
    }

    function factoryReturnUnitsFromLine(item) {
        return Number(item && item.returnCompanyQty) || 0;
    }

    function isMwTradingBusiness(businessId, businessName) {
        const bid = String(businessId || '').trim();
        const bname = String(businessName || '').trim().toUpperCase();
        return bid === 'YRMbB6aq4CMevSrLWkQvoVMtc8b2' || bname === 'M W TRADING' || bid === 'SPRANZA_PVT_LTD';
    }

    function extractFreeIssueRowsFromOrder(order, orderId) {
        const o = order || {};
        const id = String(orderId || o.orderId || '').trim();
        const when = o.orderDate || o.date || o.createdAt || null;
        const customer = o.customerName || o.shopName || o.shopId || '—';
        const rep = o.repName || o.salesRepName || o.repId || '—';
        const rows = [];

        if (Array.isArray(o.freeItems) && o.freeItems.length) {
            o.freeItems.forEach((it) => {
                const qty = Number(it.quantity ?? it.freeQty ?? it.qty) || 0;
                if (qty <= 0) return;
                const unitPrice = Number(it.unitPrice || it.price || 0) || 0;
                rows.push({
                    orderId: id,
                    when,
                    customer,
                    rep,
                    item: it.productName || it.itemName || it.name || '—',
                    brand: String(it.brand || it.productBrand || '—').trim() || '—',
                    qty,
                    value: Number(it.value || (qty * unitPrice)),
                    note: it.reason || it.note || it.freeReason || '—'
                });
            });
            return rows;
        }

        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach((it) => {
            const qty = Number(it.freeQty ?? it.freeQuantity ?? 0) || 0;
            if (qty <= 0) return;
            const unitPrice = Number(it.unitPrice || it.price || 0) || 0;
            rows.push({
                orderId: id,
                when,
                customer,
                rep,
                item: it.productName || it.itemName || it.name || '—',
                brand: String(it.productBrand || it.brand || '—').trim() || '—',
                qty,
                value: qty * unitPrice,
                note: it.freeReason || '—'
            });
        });
        return rows;
    }

    function extractReturnRowsFromOrder(order, orderId) {
        const o = order || {};
        const id = String(orderId || o.orderId || '').trim();
        const when = o.orderDate || o.date || o.createdAt || null;
        const customer = o.customerName || o.shopName || o.shopId || '—';
        const rep = o.repName || o.salesRepName || o.repId || '—';
        const rows = [];

        if (Array.isArray(o.returns) && o.returns.length) {
            o.returns.forEach((it) => {
                const cat1 = Number(it.returnCompanyQty || it.cat1 || 0) || 0;
                const cat2 = Number(it.returnResellQty || it.returnQty || it.cat2 || 0) || 0;
                if (cat1 <= 0 && cat2 <= 0) return;
                const unitPrice = Number(it.unitPrice || it.price || 0) || 0;
                rows.push({
                    orderId: id,
                    when,
                    customer,
                    rep,
                    item: it.productName || it.itemName || it.name || '—',
                    brand: String(it.productBrand || it.brand || '—').trim() || '—',
                    cat1,
                    cat2,
                    value: Number(it.value || ((cat1 + cat2) * unitPrice)),
                    note: it.reason || it.note || it.returnReason || '—'
                });
            });
            return rows;
        }

        const items = Array.isArray(o.items) ? o.items : [];
        items.forEach((it) => {
            const rc = Number(it.returnCompanyQty) || 0;
            const rr = Number(it.returnResellQty) || 0;
            const hasSplit = it.returnResellQty != null || it.returnCompanyQty != null;
            const legacy = Number(it.returnQty) || 0;
            let cat1 = 0;
            let cat2 = 0;
            if (rc > 0 || rr > 0) {
                cat1 = rc;
                cat2 = rr;
            } else if (!hasSplit && legacy > 0) {
                cat2 = legacy;
            }
            if (cat1 <= 0 && cat2 <= 0) return;
            const unitPrice = Number(it.unitPrice || it.price || 0) || 0;
            rows.push({
                orderId: id,
                when,
                customer,
                rep,
                item: it.productName || it.itemName || it.name || '—',
                brand: String(it.productBrand || it.brand || '—').trim() || '—',
                cat1,
                cat2,
                value: (cat1 + cat2) * unitPrice,
                note: it.returnReason || '—'
            });
        });
        return rows;
    }

    global.DigiBizDistributorInventory = {
        MOVEMENT_TYPES: MOVEMENT_TYPES,
        numericStock: numericStock,
        syncStockPayload: syncStockPayload,
        orderApprovalStockDelta: orderApprovalStockDelta,
        factoryReturnUnitsFromLine: factoryReturnUnitsFromLine,
        isMwTradingBusiness: isMwTradingBusiness,
        extractFreeIssueRowsFromOrder: extractFreeIssueRowsFromOrder,
        extractReturnRowsFromOrder: extractReturnRowsFromOrder
    };
})(typeof window !== 'undefined' ? window : globalThis);