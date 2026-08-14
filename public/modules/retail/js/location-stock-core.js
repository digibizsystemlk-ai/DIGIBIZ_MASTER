/**
 * DIGIBIZ Retail - Location Stock & GRN Management Core Engine
 * Handles:
 * - Multi-location data model (locations, product_location_stock, stockMovements)
 * - Atomic transactional GRN Receive (GRN_IN)
 * - Atomic transactional GRN Reversal (GRN_REVERSAL with accounting sync)
 * - Idempotent Journal entries
 * - User Preferred Location persistence
 * - Feature flagging & Migration backfill
 */

(function(window) {
    'use strict';

    const LocationStockCore = {
        DEFAULT_LOCATION_ID: 'MAIN',
        DEFAULT_LOCATION_NAME: 'Main Store (Head Office)',

        // Feature flag helper
        isFeatureEnabled() {
            const flag = localStorage.getItem('retail_location_stock_enabled');
            return flag === null || flag === 'true' || flag === true;
        },

        setFeatureEnabled(enabled) {
            localStorage.setItem('retail_location_stock_enabled', enabled ? 'true' : 'false');
        },

        // Ensure default location exists in Firestore
        async ensureDefaultLocation(businessId) {
            if (!businessId || !window.db) return null;
            const locRef = window.db.collection('locations').doc(businessId).collection('list').doc(this.DEFAULT_LOCATION_ID);
            const snap = await locRef.get();
            if (!snap.exists) {
                const defaultLoc = {
                    id: this.DEFAULT_LOCATION_ID,
                    code: 'MAIN',
                    name: this.DEFAULT_LOCATION_NAME,
                    address: 'Primary Location',
                    isActive: true,
                    isDefault: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                await locRef.set(defaultLoc);
                return defaultLoc;
            }
            return snap.data();
        },

        // Fetch all active locations for a business
        async getLocations(businessId) {
            if (!businessId || !window.db) return [];
            try {
                await this.ensureDefaultLocation(businessId);
                const snapshot = await window.db.collection('locations').doc(businessId).collection('list')
                    .where('isActive', '==', true)
                    .get();
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (list.length === 0) {
                    return [{ id: this.DEFAULT_LOCATION_ID, code: 'MAIN', name: this.DEFAULT_LOCATION_NAME, isDefault: true }];
                }
                return list;
            } catch (err) {
                console.warn('[LocationStockCore] Error loading locations, falling back to default:', err);
                return [{ id: this.DEFAULT_LOCATION_ID, code: 'MAIN', name: this.DEFAULT_LOCATION_NAME, isDefault: true }];
            }
        },

        // Get user preferred location
        async getUserPreferredLocation(uid) {
            const cached = localStorage.getItem('preferredLocation');
            if (cached) return cached;
            if (uid && window.db) {
                try {
                    const userDoc = await window.db.collection('users').doc(uid).get();
                    if (userDoc.exists && userDoc.data().preferredLocation) {
                        const loc = userDoc.data().preferredLocation;
                        localStorage.setItem('preferredLocation', loc);
                        return loc;
                    }
                } catch (e) {
                    console.warn('[LocationStockCore] Could not fetch user preferred location:', e);
                }
            }
            return this.DEFAULT_LOCATION_ID;
        },

        // Set user preferred location
        async setUserPreferredLocation(uid, locationId) {
            if (!locationId) locationId = this.DEFAULT_LOCATION_ID;
            localStorage.setItem('preferredLocation', locationId);
            if (uid && window.db) {
                try {
                    await window.db.collection('users').doc(uid).set({ preferredLocation: locationId }, { merge: true });
                } catch (e) {
                    console.warn('[LocationStockCore] Could not save preferred location to user profile:', e);
                }
            }
        },

        // Fetch stock by location for a product
        async getProductLocationStocks(businessId, productId) {
            if (!businessId || !productId || !window.db) return [];
            try {
                const snapshot = await window.db.collection('product_location_stock').doc(businessId).collection('list')
                    .where('productId', '==', productId)
                    .get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (err) {
                console.warn('[LocationStockCore] Error getting product location stocks:', err);
                return [];
            }
        },

        // Fetch stock movements for a product or general audit
        async getStockMovements(businessId, { productId = null, locationId = null, limit = 50 } = {}) {
            if (!businessId || !window.db) return [];
            try {
                let query = window.db.collection('stockMovements').doc(businessId).collection('list');
                if (productId) {
                    query = query.where('productId', '==', productId);
                }
                query = query.orderBy('createdAt', 'desc').limit(limit);
                const snapshot = await query.get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (err) {
                console.warn('[LocationStockCore] Error getting stock movements:', err);
                return [];
            }
        },

        // Check if user has stock edit/reversal permission
        canUserManageStock(userProfile, userRole) {
            if (!userProfile && !userRole) return false;
            const role = (userRole || userProfile?.role || '').toLowerCase();
            if (role === 'owner' || role === 'admin' || role === 'superadmin') return true;
            if (userProfile?.canStockEdit === true || userProfile?.permissions?.canStockEdit === true) return true;
            return false;
        },

        /**
         * Atomic Transactional Receive of GRN
         * @param {Object} params
         * - businessId: string
         * - po: Purchase Order object
         * - receiveItems: Array of { productId, productName, locationId, receivedQty, costPrice, unit }
         * - currentUser: Firebase user or session user
         */
        async receiveGRNTransactional({ businessId, po, receiveItems, currentUser }) {
            if (!businessId || !po || !receiveItems || !receiveItems.length) {
                throw new Error('Invalid arguments for receiveGRNTransactional');
            }

            const db = window.db;
            const userIdentifier = currentUser?.email || currentUser?.uid || 'system_user';
            const deterministicJournalId = `JE_PURCHASE_${po.poNo || po.id}`;

            return await db.runTransaction(async (transaction) => {
                // 1. Read all product docs and location_stock docs
                const productReads = [];
                const locStockReads = [];

                for (const item of receiveItems) {
                    const locId = item.locationId || this.DEFAULT_LOCATION_ID;
                    const prodDocRef = db.collection('products').doc(businessId).collection('list').doc(item.productId);
                    const locStockDocRef = db.collection('product_location_stock').doc(businessId).collection('list').doc(`${item.productId}__${locId}`);

                    productReads.push({ item, ref: prodDocRef, promise: transaction.get(prodDocRef) });
                    locStockReads.push({ item, locId, ref: locStockDocRef, promise: transaction.get(locStockDocRef) });
                }

                // Await all product snapshots
                const productSnaps = [];
                for (const pr of productReads) {
                    const snap = await pr.promise;
                    productSnaps.push({ item: pr.item, ref: pr.ref, snap });
                }

                // Await all location stock snapshots
                const locSnaps = [];
                for (const lr of locStockReads) {
                    const snap = await lr.promise;
                    locSnaps.push({ item: lr.item, locId: lr.locId, ref: lr.ref, snap });
                }

                // Read PO doc
                const poRef = db.collection('purchases').doc(businessId).collection('orders').doc(po.id);
                const poSnap = await transaction.get(poRef);
                if (!poSnap.exists) {
                    throw new Error(`PO / GRN record ${po.id} not found.`);
                }
                const poData = poSnap.data();
                if (poData.status === 'received') {
                    throw new Error(`GRN ${po.poNo || po.id} has already been received.`);
                }
                if (poData.status === 'reversed') {
                    throw new Error(`GRN ${po.poNo || po.id} has been reversed and cannot be received.`);
                }

                // 2. Perform Writes: Update product stock, product_location_stock, stockMovements
                for (let i = 0; i < receiveItems.length; i++) {
                    const item = receiveItems[i];
                    const locId = item.locationId || this.DEFAULT_LOCATION_ID;
                    const qty = Number(item.receivedQty) || 0;
                    if (qty <= 0) continue;

                    const prodSnapObj = productSnaps[i];
                    const locSnapObj = locSnaps[i];

                    const currentProdData = prodSnapObj.snap.exists ? prodSnapObj.snap.data() : {};
                    const currentLocData = locSnapObj.snap.exists ? locSnapObj.snap.data() : {};

                    const oldTotalStock = Number(currentProdData.stock) || 0;
                    const newTotalStock = oldTotalStock + qty;

                    const oldLocStock = Number(currentLocData.quantity) || 0;
                    const newLocStock = oldLocStock + qty;

                    // Update aggregate Product stock and cost
                    const prodUpdate = {
                        stock: newTotalStock,
                        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    if (item.costPrice && Number(item.costPrice) > 0) {
                        prodUpdate.cost = Number(item.costPrice);
                    }
                    transaction.set(prodSnapObj.ref, prodUpdate, { merge: true });

                    // Update Location Stock
                    transaction.set(locSnapObj.ref, {
                        productId: item.productId,
                        productName: item.productName || currentProdData.name || '',
                        locationId: locId,
                        quantity: newLocStock,
                        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Prepare Stock Movement
                    const movementRef = db.collection('stockMovements').doc(businessId).collection('list').doc();
                    transaction.set(movementRef, {
                        productId: item.productId,
                        productName: item.productName || currentProdData.name || '',
                        fromLocation: null,
                        toLocation: locId,
                        qty: qty,
                        unit: item.unit || currentProdData.unit || 'Pcs',
                        movementType: 'GRN_IN',
                        refType: 'GRN',
                        refId: po.poNo || po.id,
                        oldStock: oldLocStock,
                        newStock: newLocStock,
                        createdBy: userIdentifier,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                // 3. Update PO status
                transaction.update(poRef, {
                    status: 'received',
                    receivedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    receivedBy: userIdentifier,
                    receivedItemsSummary: receiveItems.map(it => ({
                        productId: it.productId,
                        productName: it.productName,
                        locationId: it.locationId || this.DEFAULT_LOCATION_ID,
                        receivedQty: it.receivedQty,
                        costPrice: it.costPrice,
                        unit: it.unit
                    }))
                });

                // 4. Create Idempotent Journal Entry inside Transaction
                const journalRef = db.collection('journal').doc(businessId).collection('entries').doc(deterministicJournalId);
                const journalSnap = await transaction.get(journalRef);

                if (!journalSnap.exists && po.total && Number(po.total) > 0) {
                    const payMethod = po.paymentMode || po.paymentMethod || 'CREDIT';
                    let creditAccount = '2-2010-01'; // Accounts Payable
                    let creditName = 'Accounts Payable';

                    if (payMethod === 'CHEQUE') {
                        creditAccount = '2-2020-01'; // Cheques Payable
                        creditName = 'Issued Cheques Payable';
                    } else if (payMethod === 'CASH') {
                        creditAccount = '1-1010-01'; // Cash
                        creditName = 'Cash in Hand';
                    } else if (payMethod === 'BANK' || payMethod === 'BANK_TRANSFER') {
                        creditAccount = '1-1020-01'; // Bank
                        creditName = 'Bank Account';
                    }

                    const memoStr = `GRN Purchase (${payMethod}) from ${po.supplierName || 'Supplier'} (GRN: ${po.poNo || po.id})`;
                    
                    transaction.set(journalRef, {
                        ref: deterministicJournalId,
                        referenceType: 'PURCHASE',
                        referenceId: po.poNo || po.id,
                        orderId: po.id,
                        date: firebase.firestore.FieldValue.serverTimestamp(),
                        memo: memoStr,
                        totalDebit: Number(po.total),
                        totalCredit: Number(po.total),
                        businessId: businessId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdBy: userIdentifier,
                        entries: [
                            {
                                accountCode: '1-1040-01',
                                accountId: '1-1040-01',
                                accountName: 'Inventory / Stock',
                                type: 'debit',
                                debit: Number(po.total),
                                credit: 0,
                                amount: Number(po.total),
                                description: `Stock received under GRN #${po.poNo || po.id}`
                            },
                            {
                                accountCode: creditAccount,
                                accountId: creditAccount,
                                accountName: creditName,
                                type: 'credit',
                                debit: 0,
                                credit: Number(po.total),
                                amount: Number(po.total),
                                description: `Payment/Liability for GRN #${po.poNo || po.id}`
                            }
                        ]
                    });
                }

                return { success: true, poId: po.id };
            });
        },

        /**
         * Atomic Transactional Reversal of GRN
         * @param {Object} params
         * - businessId: string
         * - poId: Purchase Order ID
         * - reversalReason: string
         * - currentUser: Firebase user or session user
         * - userProfile: User profile object for role check
         */
        async reverseGRNTransactional({ businessId, poId, reversalReason, currentUser, userProfile }) {
            if (!businessId || !poId) {
                throw new Error('businessId and poId are required for reversal');
            }

            if (!this.canUserManageStock(userProfile, currentUser?.role)) {
                throw new Error('Unauthorized: You do not have permission to reverse GRN transactions.');
            }

            if (!reversalReason || !reversalReason.trim()) {
                throw new Error('Reversal reason is mandatory.');
            }

            const db = window.db;
            const userIdentifier = currentUser?.email || currentUser?.uid || 'admin_user';
            const deterministicReversalJournalId = `JE_PURCHASE_REV_${poId}`;

            return await db.runTransaction(async (transaction) => {
                const poRef = db.collection('purchases').doc(businessId).collection('orders').doc(poId);
                const poSnap = await transaction.get(poRef);

                if (!poSnap.exists) {
                    throw new Error(`GRN record ${poId} not found.`);
                }

                const poData = poSnap.data();
                if (poData.status === 'reversed') {
                    throw new Error(`GRN ${poData.poNo || poId} is already reversed.`);
                }
                if (poData.status !== 'received') {
                    throw new Error(`Only RECEIVED GRNs can be reversed. Current status: ${poData.status}`);
                }

                // Determine items to revert
                const itemsToRevert = poData.receivedItemsSummary || poData.items || [];
                if (!itemsToRevert.length) {
                    throw new Error('No item details found on this GRN to revert.');
                }

                // 1. Read Product docs and Location Stock docs
                const productReads = [];
                const locStockReads = [];

                for (const item of itemsToRevert) {
                    const locId = item.locationId || this.DEFAULT_LOCATION_ID;
                    const prodDocRef = db.collection('products').doc(businessId).collection('list').doc(item.productId);
                    const locStockDocRef = db.collection('product_location_stock').doc(businessId).collection('list').doc(`${item.productId}__${locId}`);

                    productReads.push({ item, ref: prodDocRef, promise: transaction.get(prodDocRef) });
                    locStockReads.push({ item, locId, ref: locStockDocRef, promise: transaction.get(locStockDocRef) });
                }

                const productSnaps = [];
                for (const pr of productReads) {
                    const snap = await pr.promise;
                    productSnaps.push({ item: pr.item, ref: pr.ref, snap });
                }

                const locSnaps = [];
                for (const lr of locStockReads) {
                    const snap = await lr.promise;
                    locSnaps.push({ item: lr.item, locId: lr.locId, ref: lr.ref, snap });
                }

                // 2. Perform Stock Reversals & Stock Movements
                for (let i = 0; i < itemsToRevert.length; i++) {
                    const item = itemsToRevert[i];
                    const locId = item.locationId || this.DEFAULT_LOCATION_ID;
                    const qty = Number(item.receivedQty !== undefined ? item.receivedQty : (item.inputQty || item.quantity)) || 0;
                    if (qty <= 0) continue;

                    const prodSnapObj = productSnaps[i];
                    const locSnapObj = locSnaps[i];

                    const currentProdData = prodSnapObj.snap.exists ? prodSnapObj.snap.data() : {};
                    const currentLocData = locSnapObj.snap.exists ? locSnapObj.snap.data() : {};

                    const oldTotalStock = Number(currentProdData.stock) || 0;
                    const newTotalStock = Math.max(0, oldTotalStock - qty);

                    const oldLocStock = Number(currentLocData.quantity) || 0;
                    const newLocStock = Math.max(0, oldLocStock - qty);

                    // Decrement aggregate Product Stock
                    transaction.set(prodSnapObj.ref, {
                        stock: newTotalStock,
                        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Decrement Location Stock
                    transaction.set(locSnapObj.ref, {
                        productId: item.productId,
                        productName: item.productName || currentProdData.name || '',
                        locationId: locId,
                        quantity: newLocStock,
                        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Write GRN_REVERSAL Stock Movement (Immutable)
                    const movementRef = db.collection('stockMovements').doc(businessId).collection('list').doc();
                    transaction.set(movementRef, {
                        productId: item.productId,
                        productName: item.productName || currentProdData.name || '',
                        fromLocation: locId,
                        toLocation: null,
                        qty: qty,
                        unit: item.unit || currentProdData.unit || 'Pcs',
                        movementType: 'GRN_REVERSAL',
                        refType: 'GRN_REVERSAL',
                        refId: poData.poNo || poId,
                        reversalReason: reversalReason.trim(),
                        oldStock: oldLocStock,
                        newStock: newLocStock,
                        createdBy: userIdentifier,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                // 3. Mark PO status as reversed (No hard delete)
                transaction.update(poRef, {
                    status: 'reversed',
                    reversedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    reversedBy: userIdentifier,
                    reversalReason: reversalReason.trim()
                });

                // 4. Create Corrective Reversal Journal Entry
                const revJournalRef = db.collection('journal').doc(businessId).collection('entries').doc(deterministicReversalJournalId);
                const revJournalSnap = await transaction.get(revJournalRef);

                if (!revJournalSnap.exists && poData.total && Number(poData.total) > 0) {
                    const payMethod = poData.paymentMode || poData.paymentMethod || 'CREDIT';
                    let debitAccount = '2-2010-01'; // Accounts Payable
                    let debitName = 'Accounts Payable';

                    if (payMethod === 'CHEQUE') {
                        debitAccount = '2-2020-01';
                        debitName = 'Issued Cheques Payable';
                    } else if (payMethod === 'CASH') {
                        debitAccount = '1-1010-01';
                        debitName = 'Cash in Hand';
                    } else if (payMethod === 'BANK' || payMethod === 'BANK_TRANSFER') {
                        debitAccount = '1-1020-01';
                        debitName = 'Bank Account';
                    }

                    const memoStr = `REVERSAL: GRN Purchase (${payMethod}) from ${poData.supplierName || 'Supplier'} (GRN: ${poData.poNo || poId}) - Reason: ${reversalReason.trim()}`;

                    transaction.set(revJournalRef, {
                        ref: deterministicReversalJournalId,
                        referenceType: 'PURCHASE_REVERSAL',
                        referenceId: poData.poNo || poId,
                        orderId: poId,
                        reversalOf: `JE_PURCHASE_${poData.poNo || poId}`,
                        date: firebase.firestore.FieldValue.serverTimestamp(),
                        memo: memoStr,
                        totalDebit: Number(poData.total),
                        totalCredit: Number(poData.total),
                        businessId: businessId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdBy: userIdentifier,
                        entries: [
                            {
                                accountCode: debitAccount,
                                accountId: debitAccount,
                                accountName: debitName,
                                type: 'debit',
                                debit: Number(poData.total),
                                credit: 0,
                                amount: Number(poData.total),
                                description: `Reversal of Liability/Payment for GRN #${poData.poNo || poId}`
                            },
                            {
                                accountCode: '1-1040-01',
                                accountId: '1-1040-01',
                                accountName: 'Inventory / Stock',
                                type: 'credit',
                                debit: 0,
                                credit: Number(poData.total),
                                amount: Number(poData.total),
                                description: `Reversal of Stock for GRN #${poData.poNo || poId}`
                            }
                        ]
                    });
                }

                // 5. Write to System Audit Log
                const auditRef = db.collection('audit_logs').doc(businessId).collection('list').doc();
                transaction.set(auditRef, {
                    action: 'GRN_REVERSAL',
                    targetType: 'PURCHASE_ORDER',
                    targetId: poId,
                    poNo: poData.poNo || poId,
                    reason: reversalReason.trim(),
                    reversedBy: userIdentifier,
                    reversedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    snapshot: poData
                });

                return { success: true, poId };
            });
        },

        /**
         * Migration & Backfill helper
         * Backfills existing products into product_location_stock with locationId = MAIN
         * and writes INITIAL_IMPORT stock movements.
         */
        async runLocationStockMigration(businessId, currentUser, onProgress) {
            if (!businessId || !window.db) throw new Error('Missing businessId or database');
            const db = window.db;
            const userIdentifier = currentUser?.email || currentUser?.uid || 'migration_admin';

            // Ensure MAIN location exists
            await this.ensureDefaultLocation(businessId);

            const productsSnap = await db.collection('products').doc(businessId).collection('list').get();
            const total = productsSnap.docs.length;
            let migrated = 0;
            let skipped = 0;

            console.log(`[Migration] Starting backfill for ${total} products to location: ${this.DEFAULT_LOCATION_ID}...`);

            const batchSize = 250;
            let currentBatch = db.batch();
            let operationsInBatch = 0;

            for (let i = 0; i < total; i++) {
                const doc = productsSnap.docs[i];
                const p = doc.data();
                const stockQty = Number(p.stock) || 0;

                const locStockRef = db.collection('product_location_stock').doc(businessId).collection('list').doc(`${doc.id}__${this.DEFAULT_LOCATION_ID}`);
                
                // Write location stock
                currentBatch.set(locStockRef, {
                    productId: doc.id,
                    productName: p.name || '',
                    locationId: this.DEFAULT_LOCATION_ID,
                    quantity: stockQty,
                    lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                operationsInBatch++;

                // Write INITIAL_IMPORT movement if stock exists
                if (stockQty > 0) {
                    const movementRef = db.collection('stockMovements').doc(businessId).collection('list').doc();
                    currentBatch.set(movementRef, {
                        productId: doc.id,
                        productName: p.name || '',
                        fromLocation: null,
                        toLocation: this.DEFAULT_LOCATION_ID,
                        qty: stockQty,
                        unit: p.unit || 'Pcs',
                        movementType: 'INITIAL_IMPORT',
                        refType: 'MIGRATION',
                        refId: 'MIGRATION_BACKFILL',
                        oldStock: 0,
                        newStock: stockQty,
                        createdBy: userIdentifier,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    operationsInBatch++;
                }

                migrated++;

                if (operationsInBatch >= batchSize) {
                    await currentBatch.commit();
                    currentBatch = db.batch();
                    operationsInBatch = 0;
                }

                if (onProgress) {
                    onProgress({ current: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
                }
            }

            if (operationsInBatch > 0) {
                await currentBatch.commit();
            }

            console.log(`[Migration] Completed: ${migrated} products backfilled to location ${this.DEFAULT_LOCATION_ID}.`);
            return { total, migrated, skipped };
        }
    };

    window.LocationStockCore = LocationStockCore;
})(window);
