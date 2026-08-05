(function() {
    async function runFullSyncFromLive() {
        if (!confirm('⚠️ WARNING: This will Sync & Reset the ENTIRE PROJECT (All Modules). All local test data will be overwritten by Live data. Continue?')) return;
        
        const btn = document.getElementById('fullSyncBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '🔄 Syncing Everything...';

        try {
            const liveConfig = window.DIGIBIZ_LIVE_CONFIG;
            if (!liveConfig) throw new Error('Live configuration not found!');

            let liveApp;
            try {
                liveApp = firebase.app('live_sync');
            } catch (e) {
                liveApp = firebase.initializeApp(liveConfig, 'live_sync');
            }
            const liveDb = liveApp.firestore();
            const testDb = firebase.firestore();

            const LIVE_BID = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
            
            // COMPREHENSIVE COLLECTION LIST (Extracted from codebase)
            const collections = [
                'businesses', 'users', 'customers', 'suppliers', 'reps', 'shops',
                'products', 'orders', 'invoices', 'pendingOrders', 'deliveries', 'stockBatches',
                'scrap_items', 'scrap_loans', 'scrap_advances', 'buying_history',
                'scrap_revenue_history', 'scrap_expenses', 'scrap_event_log',
                'scrap_customer_ledgers', 'hand_loan_history', 'hand_loans',
                'journal', 'journal_entries', 'ledger_opening', 'accounts', 'account_balances', 'customerTransactions',
                'loan_no_interest', 'loan_interest_entries', 'loan_advanced_entries',
                'scrap_advance_history', 'scrap_sms_settings',
                'distributor_products', 'distributor_orders', 'distributor_invoices',
                'distributor_inventory', 'distributor_grn', 'distributor_returns',
                'cheques', 'vehicles', 'branches', 'configs', 'settings', 'counters',
                'investor_entries', 'advanced_accounting', 'expense_categories', 'income_categories',
                'notifications', 'activity_log', 'sms_log', 'stockMovements',
                'prescriptions', 'appointments', 'serviceBills', 'clients'
            ];

            for (const colName of collections) {
                btn.innerHTML = `🔄 Syncing ${colName}...`;
                console.log(`Syncing ${colName}...`);

                // 1. Direct Business/User docs
                if (colName === 'businesses' || colName === 'users' || colName === 'settings') {
                    const doc = await liveDb.collection(colName).doc(LIVE_BID).get();
                    if (doc.exists) {
                        await testDb.collection(colName).doc(doc.id).set(doc.data(), { merge: true });
                    }
                } 
                // 2. Nested Subcollections
                else if (colName === 'journal' || colName === 'accounts' || colName === 'products' || colName === 'invoices' || colName === 'orders' || colName === 'purchases') {
                    const subCols = ['entries', 'account_ledger', 'list', 'orders'];
                    for (const subCol of subCols) {
                        const snap = await liveDb.collection(colName).doc(LIVE_BID).collection(subCol).get();
                        for (const doc of snap.docs) {
                            await testDb.collection(colName).doc(LIVE_BID).collection(subCol).doc(doc.id).set(doc.data(), { merge: true });
                        }
                    }
                    // Also check for documents with businessId filter
                    const snap = await liveDb.collection(colName).where('businessId', '==', LIVE_BID).get();
                    for (const doc of snap.docs) {
                        await testDb.collection(colName).doc(doc.id).set(doc.data(), { merge: true });
                    }
                } 
                // 3. Regular collections with businessId filter
                else {
                    const snap = await liveDb.collection(colName).where('businessId', '==', LIVE_BID).get();
                    for (const doc of snap.docs) {
                        await testDb.collection(colName).doc(doc.id).set(doc.data(), { merge: true });
                    }
                }
            }

            alert('✅ WHOLE PROJECT MIRROR COMPLETE! Every collection is synced.');
            window.location.reload();
        } catch (error) {
            console.error('Global Sync Error:', error);
            alert('❌ Sync Failed: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    window.runFullSyncFromLive = runFullSyncFromLive;

    window.addEventListener('DOMContentLoaded', () => {
        const isTesting = window.location.hostname.includes('digibiz-test') || window.location.hostname.includes('digibiz-testing');
        const btn = document.getElementById('fullSyncBtn');
        if (btn) btn.style.display = isTesting ? 'flex' : 'none';
    });
})();
