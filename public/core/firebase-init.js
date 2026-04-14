const firebaseConfig = {
  apiKey: "AIzaSyBLFefSjFXp84Hg7nnIfuJ18SFcM92bsno",
  authDomain: "digibiz-sys.firebaseapp.com",
  projectId: "digibiz-sys",
  storageBucket: "digibiz-sys.firebasestorage.app",
  messagingSenderId: "761278318158",
  appId: "1:761278318158:web:f4451f5cf5f8762192a51f"
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

const db = window.db;
const auth = window.auth;

(function () {
    const MW_TRADING_OWNER_EMAIL = 'mwtradingsolutions@gmail.com';
    const MW_TRADING_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';

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
            role: 'BUSINESS_OWNER',
            email: MW_TRADING_OWNER_EMAIL,
            businessId: MW_TRADING_BUSINESS_ID
        };
        try {
            await bizUserRef.set(payload, { merge: true });
            await window.db.collection('users').doc(uid).set(
                { businessId: MW_TRADING_BUSINESS_ID },
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
        if (email === MW_TRADING_OWNER_EMAIL) {
            window.__DIGIBIZ_MW_PROFILE_SYNC__ = {
                role: 'BUSINESS_OWNER',
                businessId: MW_TRADING_BUSINESS_ID,
                email: user.email
            };
            try {
                localStorage.removeItem('digibizMwDisplayName');
                localStorage.setItem('digibizMwDisplayRole', 'BUSINESS_OWNER');
                localStorage.setItem('digibizMwBusinessId', MW_TRADING_BUSINESS_ID);
                localStorage.setItem('digibizMwSyncEmail', email);
                localStorage.setItem('currentBusinessId', MW_TRADING_BUSINESS_ID);
                sessionStorage.setItem('currentBusinessId', MW_TRADING_BUSINESS_ID);
            } catch (e) { /* ignore */ }
            console.info('[DigiBiz] MW email master: BUSINESS_OWNER @', MW_TRADING_BUSINESS_ID);
        } else {
            window.__DIGIBIZ_MW_PROFILE_SYNC__ = null;
            try {
                localStorage.removeItem('digibizMwDisplayRole');
                localStorage.removeItem('digibizMwBusinessId');
                localStorage.removeItem('digibizMwSyncEmail');
                localStorage.removeItem('digibizMwDisplayName');
            } catch (e) { /* ignore */ }
        }
    });
})();