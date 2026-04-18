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

    global.DigiBizDistributorInventory = {
        MOVEMENT_TYPES: MOVEMENT_TYPES,
        numericStock: numericStock,
        syncStockPayload: syncStockPayload,
        orderApprovalStockDelta: orderApprovalStockDelta,
        factoryReturnUnitsFromLine: factoryReturnUnitsFromLine
    };
})(typeof window !== 'undefined' ? window : globalThis);
