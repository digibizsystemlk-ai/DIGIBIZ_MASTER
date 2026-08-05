/**
 * When a loan row is fully settled (balance 0), set pendingRemovalAt = now + delay.
 * sweepExpired() deletes docs whose pendingRemovalAt has passed and isFullyZero(row) is true.
 */
(function () {
    var DELAY_MS = 60 * 1000;

    function removalTimestamp() {
        if (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.Timestamp) {
            return firebase.firestore.Timestamp.fromMillis(Date.now() + DELAY_MS);
        }
        return new Date(Date.now() + DELAY_MS);
    }

    async function sweepExpired(db, businessId, collectionName, isFullyZero) {
        if (!db || !businessId || !collectionName || typeof isFullyZero !== "function") return 0;
        var snap = await db
            .collection(collectionName)
            .where("businessId", "==", businessId)
            .limit(500)
            .get()
            .catch(function () {
                return { docs: [] };
            });
        var now = Date.now();
        var dels = [];
        snap.docs.forEach(function (d) {
            var r = d.data() || {};
            if (!r.pendingRemovalAt) return;
            var ts = r.pendingRemovalAt.toDate ? r.pendingRemovalAt.toDate().getTime() : new Date(r.pendingRemovalAt).getTime();
            if (Number.isNaN(ts) || now < ts) return;
            if (!isFullyZero(r)) return;
            dels.push(d.ref);
        });
        for (var i = 0; i < dels.length; i += 400) {
            var batch = db.batch();
            dels.slice(i, i + 400).forEach(function (ref) {
                batch.delete(ref);
            });
            await batch.commit();
        }
        return dels.length;
    }

    window.LoanZeroCleanup = {
        DELAY_MS: DELAY_MS,
        removalTimestamp: removalTimestamp,
        sweepExpired: sweepExpired
    };
})();
