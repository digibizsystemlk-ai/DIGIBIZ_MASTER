const firebaseConfig = {
  apiKey: "AIzaSyBLFefSjFXp84Hg7nnIfuJ18SFcM92bsno",
  authDomain: "digibiz-sys.firebaseapp.com",
  projectId: "digibiz-sys",
  storageBucket: "digibiz-sys.firebasestorage.app",
  messagingSenderId: "761278318158",
  appId: "1:761278318158:web:f4451f5cf5f8762192a51f",
  /** Realtime Database URL (Console → Realtime Database → copy). Replace region if yours differs. */
  databaseURL: "https://digibiz-sys-default-rtdb.firebaseio.com"
};

/** Exposed for secondary Auth app (e.g. admin-led staff creation without signing out the owner). */
window.__DIGIBIZ_FIREBASE_CONFIG__ = firebaseConfig;

/**
 * Secondary Firebase Auth instance: creating a user here does not change the default app's session.
 * @returns {firebase.auth.Auth}
 */
window.getDigiBizSecondaryAuth = function () {
    var NAME = 'DigiBizStaffSecondary';
    var app;
    try {
        app = firebase.app(NAME);
    } catch (e) {
        app = firebase.initializeApp(firebaseConfig, NAME);
    }
    return firebase.auth(app);
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.db = firebase.firestore();
window.auth = firebase.auth();
try {
    window.storage = firebase.storage();
} catch (e) {
    console.warn('[DigiBiz] Firebase Storage init failed (add firebase-storage script on pages that upload files):', e && (e.message || e));
}

const db = window.db;
const auth = window.auth;

(function () {
    const MW_TRADING_OWNER_EMAIL = 'mwtradingsolutions@gmail.com';
    const MW_TRADING_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
    const KUBUKA_OWNER_EMAIL = 'kdkumbukaagro@gmail.com';
    const KUBUKA_BUSINESS_ID = '0Uled5estVeQVN8cChmMTNRDNIE3';

    /**
     * Ensures MW Trading business profile is pinned to distributor mode.
     */
    window.ensureMwTradingBusinessProfile = async function () {
        if (!window.db) return;
        try {
            await window.db.collection('businesses').doc(MW_TRADING_BUSINESS_ID).set(
                {
                    businessType: 'distributor',
                    mwTradingSolutionsTenant: true
                },
                { merge: true }
            );
            localStorage.setItem('currentBusinessType', 'distributor');
            sessionStorage.setItem('currentBusinessType', 'distributor');
        } catch (e) {
            console.warn('[DigiBiz] MW Trading business profile bootstrap failed:', e && (e.message || e));
        }
    };

    /**
     * Ensure KUBUKA Tea Factory business name is correct in Firestore.
     * This keeps sidebar/dashboard/business name consistent for this tenant.
     */
    window.ensureKubukaTeaBusinessProfile = async function () {
        if (!window.db) return;
        try {
            await window.db.collection('businesses').doc(KUBUKA_BUSINESS_ID).set(
                {
                    name: 'KUBUKA TEA FACTORY'
                },
                { merge: true }
            );
        } catch (e) {
            console.warn('[DigiBiz] KUBUKA business profile bootstrap failed:', e && (e.message || e));
        }
    };

    /**
     * Ensures MW Trading owner has businesses/{MW}/users/{uid} (BUSINESS_OWNER) + users/{uid}.businessId for RBAC.
     */
    window.ensureMwTradingOwnerBizMembership = async function (user) {
        if (!user || !window.db) return;
        const email = String(user.email || '').trim().toLowerCase();
        if (email !== MW_TRADING_OWNER_EMAIL) return;
        const uid = user.uid;
        const bizUserRef = window.db.collection('businesses').doc(MW_TRADING_BUSINESS_ID).collection('users').doc(uid);
        const payload = {
            role: 'distributor_owner',
            email: MW_TRADING_OWNER_EMAIL,
            businessId: MW_TRADING_BUSINESS_ID
        };
        try {
            await window.ensureMwTradingBusinessProfile();
            await bizUserRef.set(payload, { merge: true });
            await window.db.collection('users').doc(uid).set(
                { businessId: MW_TRADING_BUSINESS_ID, role: 'distributor_owner' },
                { merge: true }
            );
            console.info('[DigiBiz] ensureMwTradingOwnerBizMembership: wrote businesses/' + MW_TRADING_BUSINESS_ID + '/users/' + uid + ' (BUSINESS_OWNER)');
        } catch (e) {
            console.warn('[DigiBiz] MW Trading owner biz membership bootstrap failed:', e && (e.message || e));
        }
    };

    /** Email-only master key: mwtradingsolutions@gmail.com → BUSINESS_OWNER + fixed businessId (no name logic). */
    window.auth.onAuthStateChanged(function (user) {
        if (!user) {
            window.__DIGIBIZ_MW_PROFILE_SYNC__ = null;
            try {
                localStorage.removeItem('digibizMwDisplayRole');
                localStorage.removeItem('digibizMwBusinessId');
                localStorage.removeItem('digibizMwSyncEmail');
                localStorage.removeItem('digibizMwDisplayName');
            } catch (e) { /* ignore */ }
            return;
        }
        const email = String(user.email || '').trim().toLowerCase();
        const storedBusinessId = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
        if (storedBusinessId === MW_TRADING_BUSINESS_ID) {
            try {
                window.ensureMwTradingBusinessProfile();
                localStorage.setItem('currentBusinessType', 'distributor');
                sessionStorage.setItem('currentBusinessType', 'distributor');
            } catch (e) { /* ignore */ }
        }
        if (email === MW_TRADING_OWNER_EMAIL) {
            window.__DIGIBIZ_MW_PROFILE_SYNC__ = {
                role: 'distributor_owner',
                businessId: MW_TRADING_BUSINESS_ID,
                email: user.email
            };
            try {
                window.ensureMwTradingBusinessProfile();
                localStorage.removeItem('digibizMwDisplayName');
                localStorage.setItem('digibizMwDisplayRole', 'distributor_owner');
                localStorage.setItem('digibizMwBusinessId', MW_TRADING_BUSINESS_ID);
                localStorage.setItem('digibizMwSyncEmail', email);
                localStorage.setItem('currentBusinessId', MW_TRADING_BUSINESS_ID);
                localStorage.setItem('currentBusinessType', 'distributor');
                sessionStorage.setItem('currentBusinessId', MW_TRADING_BUSINESS_ID);
                sessionStorage.setItem('currentBusinessType', 'distributor');
            } catch (e) { /* ignore */ }
            console.info('[DigiBiz] MW email master: BUSINESS_OWNER @', MW_TRADING_BUSINESS_ID);
        } else if (email === KUBUKA_OWNER_EMAIL) {
            try {
                window.ensureKubukaTeaBusinessProfile();
                localStorage.setItem('currentBusinessId', KUBUKA_BUSINESS_ID);
                sessionStorage.setItem('currentBusinessId', KUBUKA_BUSINESS_ID);
                localStorage.setItem('selectedBusinessId', KUBUKA_BUSINESS_ID);
                sessionStorage.setItem('selectedBusinessId', KUBUKA_BUSINESS_ID);
            } catch (e) { /* ignore */ }
        } else {
            window.__DIGIBIZ_MW_PROFILE_SYNC__ = null;
            try {
                localStorage.removeItem('digibizMwDisplayRole');
                localStorage.removeItem('digibizMwBusinessId');
                localStorage.removeItem('digibizMwSyncEmail');
                localStorage.removeItem('digibizMwDisplayName');
                const curBid = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
                if (curBid === MW_TRADING_BUSINESS_ID) {
                    // Prevent stale MW business context leaking into non-MW user sessions.
                    localStorage.removeItem('currentBusinessId');
                    sessionStorage.removeItem('currentBusinessId');
                    localStorage.removeItem('selectedBusinessId');
                    sessionStorage.removeItem('selectedBusinessId');
                }
            } catch (e) { /* ignore */ }
        }
        if (storedBusinessId === KUBUKA_BUSINESS_ID) {
            try { window.ensureKubukaTeaBusinessProfile(); } catch (e) { /* ignore */ }
        }
    });
})();