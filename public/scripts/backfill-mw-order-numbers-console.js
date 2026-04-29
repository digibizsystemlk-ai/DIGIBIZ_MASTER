/* MW Trading one-time backfill for sequential order numbers.
 * Usage (browser console):
 *   await window.backfillMwOrderNumbers('YRMbB6aq4CMevSrLWkQvoVMtc8b2')
 */
(function attachMwOrderNumberBackfill() {
    async function readOrdersForBackfill(db, collectionName, businessId) {
        const snap = await db.collection(collectionName)
            .where('businessId', '==', businessId)
            .get()
            .catch(() => ({ docs: [] }));
        return (snap.docs || []).map((d) => ({ id: d.id, coll: collectionName, data: d.data() || {} }));
    }

    function toMillis(v) {
        if (!v) return 0;
        if (typeof v.toDate === 'function') return v.toDate().getTime();
        if (v.seconds) return Number(v.seconds || 0) * 1000;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }

    async function commitInChunks(db, rows, businessId) {
        let index = 0;
        while (index < rows.length) {
            const chunk = rows.slice(index, index + 350);
            const batch = db.batch();
            chunk.forEach((row, i) => {
                const n = index + i + 1;
                const orderNumber = `ORD-${String(n).padStart(7, '0')}`;
                const ref = db.collection(row.coll).doc(row.id);
                batch.set(ref, {
                    orderNumber,
                    mwOrderNumberBackfilledAt: new Date()
                }, { merge: true });
            });
            await batch.commit();
            index += chunk.length;
        }
        await db.collection('counters').doc(`${businessId}_orderNumber`).set({
            businessId,
            key: 'orderNumber',
            value: rows.length,
            updatedAt: new Date()
        }, { merge: true });
    }

    window.backfillMwOrderNumbers = async function backfillMwOrderNumbers(businessId) {
        if (!window.db) throw new Error('Firestore (window.db) not available.');
        const bid = String(businessId || '').trim();
        if (!bid) throw new Error('businessId is required.');
        const pending = await readOrdersForBackfill(window.db, 'pendingOrders', bid);
        const approved = await readOrdersForBackfill(window.db, 'orders', bid);
        const all = pending.concat(approved).sort((a, b) => {
            const ta = toMillis(a.data.orderDate || a.data.createdAt);
            const tb = toMillis(b.data.orderDate || b.data.createdAt);
            if (ta !== tb) return ta - tb;
            return String(a.id).localeCompare(String(b.id));
        });
        await commitInChunks(window.db, all, bid);
        return {
            businessId: bid,
            totalUpdated: all.length,
            pendingUpdated: pending.length,
            approvedUpdated: approved.length,
            nextCounter: all.length
        };
    };
})();
