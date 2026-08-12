(function (global) {
    const TARGET_OWNER_EMAIL = 'biz.sirimal@gmail.com';
    const FEATURE_LOCK_KEY = 'digibizDistributionPilotBusinessId';
    const COLLECTIONS = {
        LORRIES: 'lorries',
        LORRY_STOCK: 'lorryStock',
        STOCK_TRANSFERS: 'stockTransfers'
    };

    function normalizeEmail(v) {
        return String(v || '').trim().toLowerCase();
    }

    function normalizeQty(v) {
        const n = Math.round(Number(v) || 0);
        return Math.max(0, n);
    }

    function lorryStockDocId(businessId, lorryId, productId) {
        return [String(businessId || '').trim(), String(lorryId || '').trim(), String(productId || '').trim()].join('__');
    }

    function activeForSession(userEmail, currentBusinessId) {
        const email = normalizeEmail(userEmail);
        const bid = String(currentBusinessId || '').trim();
        if (!email || !bid || (email !== TARGET_OWNER_EMAIL && email !== '2biz.sirimal@gmail.com')) return false;
        try {
            const existing = localStorage.getItem(FEATURE_LOCK_KEY) || sessionStorage.getItem(FEATURE_LOCK_KEY);
            if (existing && existing !== bid) return false;
            localStorage.setItem(FEATURE_LOCK_KEY, bid);
            sessionStorage.setItem(FEATURE_LOCK_KEY, bid);
            return true;
        } catch (e) {
            return true;
        }
    }

    global.DigiBizDistributorLorryStock = {
        TARGET_OWNER_EMAIL: TARGET_OWNER_EMAIL,
        COLLECTIONS: COLLECTIONS,
        normalizeQty: normalizeQty,
        lorryStockDocId: lorryStockDocId,
        activeForSession: activeForSession
    };
})(typeof window !== 'undefined' ? window : globalThis);
