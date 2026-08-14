/* One-time seeder for default demo business used in signup flow.
 * Usage:
 *   await window.createDefaultTestBusiness()
 */
(function attachDefaultTestBusinessSeeder() {
    const DEFAULT_TEST_BUSINESS_ID = 'DEFAULT_TEST_BUSINESS';
    const DEFAULT_TEST_BUSINESS_NAME = 'Demo Business';

    async function ensureDefaultAccounts(db, businessId) {
        const defaultAccounts = [
            { code: '1-1010-01', name: 'Cash', type: 'ASSET', openingBalance: 0, currentBalance: 0 },
            { code: '1-1020-01', name: 'Bank', type: 'ASSET', openingBalance: 0, currentBalance: 0 },
            { code: '1-1030-01', name: 'Accounts Receivable', type: 'ASSET', openingBalance: 0, currentBalance: 0 },
            { code: '1-1040-01', name: 'Inventory', type: 'ASSET', openingBalance: 0, currentBalance: 0 },
            { code: '2-2010-01', name: 'Accounts Payable', type: 'LIABILITY', openingBalance: 0, currentBalance: 0 },
            { code: '3-3010-01', name: 'Capital', type: 'EQUITY', openingBalance: 0, currentBalance: 0 },
            { code: '4-4010-01', name: 'Sales Revenue', type: 'INCOME', openingBalance: 0, currentBalance: 0 },
            { code: '5-5010-01', name: 'Cost of Goods Sold', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 },
            { code: '5-5020-01', name: 'Expenses', type: 'EXPENSE', openingBalance: 0, currentBalance: 0 }
        ];
        for (const acc of defaultAccounts) {
            await db.collection('accounts').doc(businessId).collection('list').doc(acc.code).set(acc, { merge: true });
        }
    }

    window.createDefaultTestBusiness = async function createDefaultTestBusiness() {
        if (!window.db) throw new Error('window.db unavailable');
        const db = window.db;
        await db.collection('businesses').doc(DEFAULT_TEST_BUSINESS_ID).set({
            name: DEFAULT_TEST_BUSINESS_NAME,
            businessType: 'distributor',
            status: 'active',
            distributorModel: 'MW',
            mwTradingSolutionsTenant: true,
            branchWarehousesEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }, { merge: true });

        await db.collection('settings').doc(DEFAULT_TEST_BUSINESS_ID).set({
            subscription: {
                plan: 'TRIAL',
                status: 'TRIAL',
                trialStart: new Date().toISOString(),
                trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                expireDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            smsWallet: {
                paidSmsBalance: 0,
                trialSmsBalance: 300,
                trialSmsExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                smsBalance: 300,
                lowBalanceThreshold: 50,
                unitPrice: 1,
                monthlyFee: 1000,
                trialCreditsGranted: true,
                updatedAt: new Date().toISOString()
            }
        }, { merge: true });

        const branchSeed = [
            { id: 'HEAD_OFFICE', name: 'Head Office', location: 'Colombo', managerName: 'Demo HQ Manager' },
            { id: 'REGION_1', name: 'Regional Branch 1', location: 'Kandy', managerName: 'Demo Regional Manager 1' },
            { id: 'REGION_2', name: 'Regional Branch 2', location: 'Galle', managerName: 'Demo Regional Manager 2' }
        ];
        for (const b of branchSeed) {
            await db.collection('branches').doc(`${DEFAULT_TEST_BUSINESS_ID}_${b.id}`).set({
                businessId: DEFAULT_TEST_BUSINESS_ID,
                name: b.name,
                location: b.location,
                managerName: b.managerName,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }, { merge: true });
        }

        await ensureDefaultAccounts(db, DEFAULT_TEST_BUSINESS_ID);

        return {
            businessId: DEFAULT_TEST_BUSINESS_ID,
            businessName: DEFAULT_TEST_BUSINESS_NAME,
            branchesSeeded: branchSeed.length,
            model: 'Distributor (MW-compatible)'
        };
    };
})();
