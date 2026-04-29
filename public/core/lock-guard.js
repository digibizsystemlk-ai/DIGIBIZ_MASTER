/**
 * DIGIBIZ — Business lock guard (client-side).
 * Blocks settings / module-registration style pages when the current business is LOCKED.
 * Does not block normal operations (orders, GRN, transfers, dashboards).
 *
 * Usage (non-module pages):
 *   <script src="/core/lock-guard.js?v=1"></script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function () {
 *       if (window.DigibizLockGuard) window.DigibizLockGuard.checkBusinessLock().catch(function () {});
 *     });
 *   </script>
 */
(function (global) {
    const DASHBOARD_URL = '/modules/core/dashboard.html';

    const PATH_EXEMPT_SUBSTRINGS = [
        '/auth/',
        '/admin/business-lock.html',
        '/admin/super-dashboard.html',
        '/admin/setup-super-admin.html',
        '/modules/core/dashboard.html',
        '/index.html'
    ];

    /** Company / billing / subscription — blocked when LOCKED + level MEDIUM or HARD, or SOFT for module/code only. */
    const SETTINGS_PATH_SUBSTRINGS = [
        '/modules/company/profile.html',
        '/modules/company/staff.html',
        '/modules/company/settings.html',
        '/modules/company/sms-settings.html',
        '/modules/core/billing.html',
        '/modules/core/change-password.html'
    ];

    const MODULE_OR_CODE_PATH_SUBSTRINGS = [
        '/modules/core/subscription.html',
        '/modules/admin/'
    ];

    function currentPath() {
        return String(global.location.pathname || '').replace(/\\/g, '/');
    }

    function pathIncludesAny(path, list) {
        const p = path.toLowerCase();
        return list.some((s) => p.indexOf(String(s).toLowerCase()) !== -1);
    }

    function getStoredBusinessId() {
        try {
            return String(
                global.localStorage.getItem('currentBusinessId')
                || global.sessionStorage.getItem('currentBusinessId')
                || global.localStorage.getItem('selectedBusinessId')
                || global.sessionStorage.getItem('selectedBusinessId')
                || ''
            ).trim();
        } catch (e) {
            return '';
        }
    }

    function normalizeLock(docData) {
        const d = docData || {};
        const status = String(d.lockStatus || 'UNLOCKED').toUpperCase();
        const lockStatus = status === 'LOCKED' ? 'LOCKED' : 'UNLOCKED';
        let level = String(d.lockLevel || 'HARD').toUpperCase();
        if (level !== 'SOFT' && level !== 'MEDIUM' && level !== 'HARD') level = 'HARD';
        return { lockStatus, lockLevel: level };
    }

    function redirectToDashboard() {
        global.location.href = DASHBOARD_URL;
    }

    async function fetchCurrentBusiness(businessId) {
        if (!global.firebase || !global.firebase.firestore) return null;
        const db = global.db;
        if (!db) return null;
        const snap = await db.collection('businesses').doc(businessId).get().catch(() => null);
        if (!snap || !snap.exists) return null;
        return Object.assign({ id: snap.id }, snap.data() || {});
    }

    function classifyPath(path) {
        return {
            exempt: pathIncludesAny(path, PATH_EXEMPT_SUBSTRINGS) || path === '/' || path === '',
            settings: pathIncludesAny(path, SETTINGS_PATH_SUBSTRINGS),
            moduleOrCode: pathIncludesAny(path, MODULE_OR_CODE_PATH_SUBSTRINGS)
        };
    }

    /**
     * @param {{ silent?: boolean }} [opts]
     * @returns {Promise<{ blocked: boolean, reason?: string }>}
     */
    async function checkBusinessLock(opts) {
        const options = opts || {};
        const path = currentPath();
        const cls = classifyPath(path);
        if (cls.exempt) return { blocked: false };

        const businessId = getStoredBusinessId();
        if (!businessId) return { blocked: false };

        if (path.toLowerCase().indexOf('change-password') !== -1 && global.firebase && global.firebase.auth) {
            const uid = global.firebase.auth().currentUser && global.firebase.auth().currentUser.uid;
            if (uid && global.db) {
                const udoc = await global.db.collection('users').doc(uid).get().catch(() => null);
                if (udoc && udoc.exists && (udoc.data() || {}).mustChangePassword === true) {
                    return { blocked: false };
                }
            }
        }

        const biz = await fetchCurrentBusiness(businessId);
        if (!biz) return { blocked: false };

        const { lockStatus, lockLevel } = normalizeLock(biz);
        if (lockStatus !== 'LOCKED') return { blocked: false };

        let blockReason = '';
        /* SOFT: allow company settings; MEDIUM/HARD: block settings. All LOCKED levels block module/dev paths. */
        if (cls.settings && lockLevel !== 'SOFT') {
            blockReason = 'This business is locked. Settings cannot be changed.';
        } else if (cls.moduleOrCode) {
            blockReason = 'This business is locked. New modules and developer tools are not available.';
        }

        if (blockReason) {
            if (!options.silent) {
                try {
                    global.alert(blockReason);
                } catch (e) { /* ignore */ }
            }
            redirectToDashboard();
            return { blocked: true, reason: blockReason };
        }
        return { blocked: false };
    }

    global.DigibizLockGuard = {
        checkBusinessLock,
        normalizeLock,
        getStoredBusinessId
    };
}(typeof window !== 'undefined' ? window : this));
