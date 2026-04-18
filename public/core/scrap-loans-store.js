/**
 * Shared in-memory cache for active scrap_loans — used by scrap-debts.html,
 * scrap-buying.html, and other admin pages so loan lists stay in sync.
 * Call invalidate() after create/payment/close/bill-settlement so the next
 * fetchAllActive() reloads from Firestore.
 */
(function (global) {
    const cache = { businessId: null, rows: null };

    function invalidate() {
        cache.rows = null;
        cache.businessId = null;
    }

    /**
     * @param {string} businessId
     * @param {{ force?: boolean }} [opts] force=true skips cache (e.g. right after invalidate).
     * @returns {Promise<Array<{id:string}&Record<string, unknown>>>}
     */
    async function fetchAllActive(businessId, opts) {
        const force = !!(opts && opts.force);
        const db = global.db;
        if (!db || !businessId) return [];
        if (!force && cache.businessId === businessId && Array.isArray(cache.rows)) {
            return cache.rows.slice();
        }
        const snap = await db.collection('scrap_loans')
            .where('businessId', '==', businessId)
            .where('active', '==', true)
            .get()
            .catch((e) => {
                console.warn('scrap-loans-store fetch', e);
                return { docs: [] };
            });
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cache.businessId = businessId;
        cache.rows = rows;
        return rows.slice();
    }

    global.scrapLoansStore = { fetchAllActive, invalidate };
})(typeof window !== 'undefined' ? window : this);
