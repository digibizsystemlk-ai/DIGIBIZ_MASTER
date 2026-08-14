/**
 * Snapshot Data Bridge Layer — DIGIBIZ
 * Provides automatic backward compatibility & schema polyfills for frozen snapshot clients.
 */
(function () {
    window.SnapshotDataBridge = {
        version: '1.0.0',

        /**
         * Polyfills document data to ensure legacy field expectations are always met.
         * @param {Object} data - Raw document data from Firestore
         * @param {String} collectionName - Optional collection context
         */
        normalizeDocumentData: function (data, collectionName) {
            if (!data || typeof data !== 'object') return data;
            const polyfilled = { ...data };

            // Polyfill 1: Standardize price & cost fields across retail/distributor/pharmacy
            if (polyfilled.price !== undefined && polyfilled.unitPrice === undefined) {
                polyfilled.unitPrice = polyfilled.price;
            }
            if (polyfilled.unitPrice !== undefined && polyfilled.price === undefined) {
                polyfilled.price = polyfilled.unitPrice;
            }
            if (polyfilled.cost !== undefined && polyfilled.unitCost === undefined) {
                polyfilled.unitCost = polyfilled.cost;
            }

            // Polyfill 2: Standardize business name & profile fields
            if (polyfilled.businessName && !polyfilled.name) {
                polyfilled.name = polyfilled.businessName;
            }
            if (polyfilled.name && !polyfilled.businessName) {
                polyfilled.businessName = polyfilled.name;
            }

            // Polyfill 3: Payment mode fallbacks
            if (!polyfilled.paymentMode && !polyfilled.paymentMethod) {
                polyfilled.paymentMode = 'CASH';
                polyfilled.paymentMethod = 'CASH';
            }

            // Polyfill 4: Ensure arrays are never null/undefined
            if (Array.isArray(polyfilled.items) === false && polyfilled.items === undefined) {
                polyfilled.items = [];
            }

            return polyfilled;
        },

        /**
         * Wraps a Firestore document snapshot to automatically normalize data.
         */
        wrapDocumentSnapshot: function (docSnap, collectionName) {
            if (!docSnap || typeof docSnap.data !== 'function') return docSnap;
            const originalData = docSnap.data();
            const normalizedData = this.normalizeDocumentData(originalData, collectionName);

            return {
                ...docSnap,
                data: function () {
                    return normalizedData;
                }
            };
        }
    };

    console.log('✅ Snapshot Data Bridge Layer Active (Polyfill Engine Loaded)');
})();
