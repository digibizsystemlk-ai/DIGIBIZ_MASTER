
(function (global) {
    const STORAGE_KEY = 'DIGIBIZ_MW_TRADING_SOLUTIONS_BUSINESS_ID';

    const DigibizMwDslConfig = {
        FOOTER_DIGIBIZ: 'Software Solution by DIGIBIZ - 0713446500',
        DSL_HEADER: 'DSL ENTERPRISES (PVT) LTD',
        DSL_SUBHEADER: '147/1 Agulana Station Road Moratuwa | 0760817149',
        AGENT_FOOTER_NOTE: 'Agent: SPRANZA_PVT_LTD',
        COST_TO_SELL_MULTIPLIER: 1.07,
        getTenantDisplayName(bizData) {
            if (bizData && bizData.name) return bizData.name;
            return 'MW Trading';
        },

        _cachedMwId: undefined,

        clearMwIdCache() {
            this._cachedMwId = undefined;
        },

        mwId() {
            return 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
        },

        async ensureMwTradingTenantProvisioned(db, businessId) {
            const fixed = this.mwId();
            if (!db || !businessId || !fixed || (String(businessId) !== fixed && String(businessId) !== 'SPRANZA_PVT_LTD')) return false;
            try {
                const ref = db.collection('businesses').doc(businessId);
                const snap = await ref.get();
                if (!snap.exists) return false;
                const d = snap.data() || {};
                if (d.mwTradingSolutionsTenant === true) return false;
                await ref.update({
                    mwTradingSolutionsTenant: true,
                    mwTradingTenantAutoProvisionedAt: new Date()
                });
                console.info('[DIGIBIZ] mwTradingSolutionsTenant auto-set true for', businessId);
                return true;
            } catch (e) {
                console.warn('[DigibizMwDslConfig] ensureMwTradingTenantProvisioned', e);
                return false;
            }
        },

        isMwTradingTenantActive(businessId, bizData) {
            const bid = String(businessId || '').trim().toUpperCase();
            const idMatch = bid === 'YRMBB6AQ4CMEVSRLWKQVOVMTC8B2' || bid === 'SPRANZA_PVT_LTD';
            const tenantOn = !!(bizData && (bizData.mwTradingSolutionsTenant === true || String(bizData.name || '').toUpperCase() === 'SPRANZA_PVT_LTD'));
            return tenantOn || idMatch;
        },

        async resolveMwTradingBusinessId(db) {
            if (!db) {
                this._cachedMwId = '';
                return '';
            }
            if (this._cachedMwId !== undefined) return this._cachedMwId;

            const fixed = this.mwId();
            if (fixed) {
                this._cachedMwId = fixed;
                return this._cachedMwId;
            }
            try {
                const ls = global.localStorage.getItem(STORAGE_KEY);
                if (ls && ls.trim()) {
                    this._cachedMwId = ls.trim();
                    return this._cachedMwId;
                }
                const flagged = await db.collection('businesses').where('mwTradingSolutionsTenant', '==', true).limit(1).get();
                if (!flagged.empty) {
                    const id = flagged.docs[0].id;
                    global.localStorage.setItem(STORAGE_KEY, id);
                    this._cachedMwId = id;
                    return id;
                }
                const names = ['MW Trading', 'MW TRADING', 'M W TRADING', 'SPRANZA_PVT_LTD'];
                for (let i = 0; i < names.length; i++) {
                    const snap = await db.collection('businesses').where('name', '==', names[i]).limit(1).get();
                    if (!snap.empty) {
                        const id = snap.docs[0].id;
                        global.localStorage.setItem(STORAGE_KEY, id);
                        this._cachedMwId = id;
                        return id;
                    }
                }
            } catch (e) {
                console.warn('[DigibizMwDslConfig] resolveMwTradingBusinessId', e);
            }
            this._cachedMwId = '';
            return '';
        },

        applyCostToSellingPrice(buying) {
            const bp = Number(buying);
            if (!Number.isFinite(bp) || bp < 0) return null;
            return Math.round(bp * this.COST_TO_SELL_MULTIPLIER * 100) / 100;
        },

        mwTradingDistributorCanCreateNewCustomer(perms, isMwActive) {
            if (!perms) return false;
            if (perms.canCustomerCreate) return true;
            return !!isMwActive && !!perms.canCustomerView;
        }
    };

    global.DigibizMwDslConfig = DigibizMwDslConfig;
})(typeof window !== 'undefined' ? window : globalThis);