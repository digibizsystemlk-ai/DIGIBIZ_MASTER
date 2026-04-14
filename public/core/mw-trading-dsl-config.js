/**
 * MW Trading Solutions × DSL thermal bill & 7% cost→sell margin — strictly scoped.
 *
 * MW UI (7% margin + DSL thermal): mwTradingSolutionsTenant === true OR businessId === MW_TRADING_SOLUTIONS_BUSINESS_ID.
 * Firestore rules restrict mwTradingSolutionsTenant == true to the canonical MW business id so other tenants stay generic.
 */
(function (global) {
    const STORAGE_KEY = 'DIGIBIZ_MW_TRADING_SOLUTIONS_BUSINESS_ID';

    const DigibizMwDslConfig = {
        FOOTER_DIGIBIZ: 'Software Solution by DIGIBIZ - 0713446500',
        DSL_HEADER: 'DSL ENTERPRISES',
        DSL_SUBHEADER: '147/1 Agulana Station Road Moratuwa | 0760817149',
        AGENT_FOOTER_NOTE: 'Agent: MW Trading Solutions',
        COST_TO_SELL_MULTIPLIER: 1.07,

        /** Canonical Firestore businesses/{id} for MW Trading Solutions */
        MW_TRADING_SOLUTIONS_BUSINESS_ID: 'YRMbB6aq4CMevSrLWkQvoVMtc8b2',

        _cachedMwId: undefined,

        clearMwIdCache() {
            this._cachedMwId = undefined;
        },

        mwId() {
            return String(this.MW_TRADING_SOLUTIONS_BUSINESS_ID || '').trim();
        },

        /**
         * If logged-in business is the MW id and mwTradingSolutionsTenant is missing/false, set it true.
         * @returns {boolean} true if an update was written
         */
        async ensureMwTradingTenantProvisioned(db, businessId) {
            const fixed = this.mwId();
            if (!db || !businessId || !fixed || String(businessId) !== fixed) return false;
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

        /**
         * DSL bill + 7% margin: tenant flag or canonical MW business id (Firestore rules block tenant=true off the MW doc).
         */
        isMwTradingTenantActive(businessId, bizData) {
            const fixed = this.mwId();
            if (!businessId || !fixed) return false;
            const idMatch = String(businessId) === fixed;
            const tenantOn = !!(bizData && bizData.mwTradingSolutionsTenant === true);
            return tenantOn || idMatch;
        },

        /** @deprecated use isMwTradingTenantActive(businessId, bizData) */
        isMwTradingBusinessId(currentBusinessId) {
            return this.isMwTradingTenantActive(currentBusinessId, null);
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
                const names = ['MW Trading Solutions', 'MW TRADING SOLUTIONS', 'Mw Trading Solutions'];
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
        }
    };

    global.DigibizMwDslConfig = DigibizMwDslConfig;
})(typeof window !== 'undefined' ? window : globalThis);
