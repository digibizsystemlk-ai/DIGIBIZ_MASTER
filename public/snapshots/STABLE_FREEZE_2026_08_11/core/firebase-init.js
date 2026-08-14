const liveConfig = {
    apiKey: "AIzaSyBLFefSjFXp84Hg7nnIfuJ18SFcM92bsno",
    authDomain: "digibiz-sys.firebaseapp.com",
    projectId: "digibiz-sys",
    storageBucket: "digibiz-sys.firebasestorage.app",
    messagingSenderId: "761278318158",
    appId: "1:761278318158:web:f4451f5cf5f8762192a51f",
    databaseURL: "https://digibiz-sys-default-rtdb.firebaseio.com"
};
window.DIGIBIZ_LIVE_CONFIG = liveConfig;

const stagingConfig = {
    apiKey: "AIzaSyCN5zyp5Hx8bQSIjipCoKLsHW523X0BwUY",
    authDomain: "digibiz-testing.firebaseapp.com",
    projectId: "digibiz-testing",
    storageBucket: "digibiz-testing.firebasestorage.app",
    messagingSenderId: "723153186300",
    appId: "1:723153186300:web:b821783c691bb57f3ed679",
    databaseURL: "https://digibiz-testing-default-rtdb.firebaseio.com"
};

const firebaseConfig = (window.location.hostname.includes('digibiz-test') || window.location.hostname.includes('digibiz-testing')) ? stagingConfig : liveConfig;

/** Exposed for secondary Auth app (e.g. admin-led staff creation without signing out the owner). */
window.__DIGIBIZ_FIREBASE_CONFIG__ = firebaseConfig;

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
try {
    window.db.enablePersistence({ synchronizeTabs: true }).catch(function (err) {
        if (err.code === 'failed-precondition') {
            console.warn('[Firestore] Multi-tab persistence: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.warn('[Firestore] Browser does not support offline persistence');
        }
    });
} catch (ePersist) { }
window.auth = firebase.auth();

// Super Admin Direct Client Impersonation Auth Interceptor
(function patchFirebaseAuthForImpersonation() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const isParamImpersonate = urlParams.get('impersonate') === 'true';
        if (isParamImpersonate) {
            const paramEmail = urlParams.get('email');
            const paramBizId = urlParams.get('bizId');
            const paramBizType = urlParams.get('bizType');
            if (paramEmail) {
                localStorage.setItem('digibiz_impersonate_email', paramEmail);
                localStorage.setItem('userEmail', paramEmail);
                localStorage.setItem('activeUserEmail', paramEmail);
            }
            if (paramBizId) {
                localStorage.setItem('digibiz_impersonate_biz_id', paramBizId);
                localStorage.setItem('businessId', paramBizId);
                localStorage.setItem('currentBusinessId', paramBizId);
                sessionStorage.setItem('currentBusinessId', paramBizId);
                localStorage.setItem('activeBusinessId', paramBizId);
            }
            if (paramBizType) {
                localStorage.setItem('digibiz_impersonate_type', paramBizType);
                localStorage.setItem('currentBusinessType', paramBizType);
                sessionStorage.setItem('currentBusinessType', paramBizType);
            }
            localStorage.setItem('digibiz_impersonate_active', 'true');
            localStorage.setItem('currentUserRole', 'BUSINESS_OWNER');
            sessionStorage.setItem('currentUserRole', 'BUSINESS_OWNER');
            localStorage.setItem('currentBusinessNavRole', 'BUSINESS_OWNER');
            sessionStorage.setItem('currentBusinessNavRole', 'BUSINESS_OWNER');
        }

        const isActive = localStorage.getItem('digibiz_impersonate_active') === 'true';
        if (!isActive) return;

        function createImpersonatedUserProxy(rawUser) {
            const targetEmail = localStorage.getItem('digibiz_impersonate_email') || 'client@digibiz.lk';
            const targetBizId = localStorage.getItem('digibiz_impersonate_biz_id') || localStorage.getItem('currentBusinessId') || 'CLIENT_BIZ';
            const targetOwnerName = localStorage.getItem('digibiz_impersonate_owner_name') || localStorage.getItem('currentBusinessName') || targetEmail;
            const base = rawUser || {
                uid: targetBizId,
                email: targetEmail,
                displayName: targetOwnerName,
                isAnonymous: true,
                getIdToken: async () => 'SYNTHETIC_IMPERSONATION_TOKEN'
            };
            return new Proxy(base, {
                get(target, prop) {
                    if (prop === 'email') return targetEmail;
                    if (prop === 'uid') return targetBizId;
                    if (prop === 'displayName') return targetOwnerName;
                    if (prop === 'isImpersonated') return true;
                    if (prop === 'getIdToken') return async () => (typeof target.getIdToken === 'function' ? target.getIdToken() : 'SYNTHETIC_IMPERSONATION_TOKEN');
                    const val = target[prop];
                    if (typeof val === 'function') return val.bind(target);
                    return val;
                }
            });
        }

        // Patch firebase.auth() currentUser getter on prototype and instance
        try {
            const authInst = firebase.auth();
            const authProto = Object.getPrototypeOf(authInst);
            if (authProto) {
                const origDesc = Object.getOwnPropertyDescriptor(authProto, 'currentUser');
                Object.defineProperty(authProto, 'currentUser', {
                    get: function() {
                        if (localStorage.getItem('digibiz_impersonate_active') === 'true') {
                            const raw = origDesc && origDesc.get ? origDesc.get.call(this) : this._currentUser;
                            return createImpersonatedUserProxy(raw);
                        }
                        return origDesc && origDesc.get ? origDesc.get.call(this) : this._currentUser;
                    },
                    configurable: true
                });
            }
        } catch (eAuthGet) {
            console.warn('[Impersonation Auth Getter Patch Warn]', eAuthGet);
        }

        const origOnAuthStateChanged = firebase.auth().onAuthStateChanged;
        firebase.auth().onAuthStateChanged = function(callback, optError, optCompleted) {
            const wrappedCallback = async (user) => {
                const impersonatedUser = createImpersonatedUserProxy(user);
                return callback(impersonatedUser);
            };

            const initialSyntheticUser = createImpersonatedUserProxy(firebase.auth().currentUser);
            setTimeout(() => {
                try { callback(initialSyntheticUser); } catch (_eInitCb) {}
            }, 0);

            return origOnAuthStateChanged.call(firebase.auth(), wrappedCallback, optError, optCompleted);
        };

        // Intercept db.collection('users').doc(...).get() during impersonation to prevent unhandled promise failures
        if (firebase.firestore && firebase.firestore.prototype) {
            const origCollection = firebase.firestore.prototype.collection;
            firebase.firestore.prototype.collection = function(colName) {
                const colRef = origCollection.apply(this, arguments);
                if (colName === 'users' && localStorage.getItem('digibiz_impersonate_active') === 'true') {
                    const origDoc = colRef.doc;
                    colRef.doc = function(docId) {
                        const docRef = origDoc.apply(this, arguments);
                        const targetBizId = localStorage.getItem('digibiz_impersonate_biz_id') || localStorage.getItem('currentBusinessId') || 'CLIENT_BIZ';
                        const targetEmail = localStorage.getItem('digibiz_impersonate_email') || 'client@digibiz.lk';
                        const targetBizName = localStorage.getItem('digibiz_impersonate_biz_name') || localStorage.getItem('currentBusinessName') || 'Client Business';
                        const origGet = docRef.get;
                        docRef.get = async function(options) {
                            try {
                                const snap = await origGet.apply(this, arguments);
                                if (snap && snap.exists) {
                                    const realData = snap.data() || {};
                                    return {
                                        exists: true,
                                        id: snap.id,
                                        data: () => ({
                                            ...realData,
                                            businessId: realData.businessId || targetBizId,
                                            role: 'BUSINESS_OWNER',
                                            email: realData.email || targetEmail,
                                            businessName: realData.businessName || targetBizName,
                                            ownerName: realData.ownerName || realData.name || localStorage.getItem('digibiz_impersonate_owner_name') || targetEmail,
                                            businessType: realData.businessType || localStorage.getItem('digibiz_impersonate_type') || 'retail'
                                        })
                                    };
                                }
                            } catch (eSnap) {}
                            return {
                                exists: true,
                                id: docId || targetBizId,
                                data: () => ({
                                    businessId: targetBizId,
                                    role: 'BUSINESS_OWNER',
                                    email: targetEmail,
                                    businessName: targetBizName,
                                    ownerName: localStorage.getItem('digibiz_impersonate_owner_name') || targetEmail,
                                    businessType: localStorage.getItem('digibiz_impersonate_type') || 'retail'
                                })
                            };
                        };
                        return docRef;
                    };
                }
                return colRef;
            };
        }
    } catch (ePatch) {
        console.warn('[Impersonation Auth Patch Warn]', ePatch);
    }
})();

try {
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(e) {
        console.warn('[DigiBiz] Auth persistence error:', e);
    });
} catch(e) {}
try {
    if (typeof firebase.storage === 'function') {
        window.storage = firebase.storage();
    } else {
        console.warn('[DigiBiz] Firebase Storage SDK not loaded. Storage features disabled.');
    }
} catch (e) {
    console.warn('[DigiBiz] Firebase Storage init failed:', e);
}

const db = window.db;
const auth = window.auth;

// Conditional Offline Persistence for Scrap & Retail Modules
(function() {
    const isScrapContext = window.location.pathname.includes('/scrap-') || 
                          localStorage.getItem('currentBusinessType') === 'scrap_collection_center' ||
                          sessionStorage.getItem('currentBusinessType') === 'scrap_collection_center';
    
    const isRetailContext = window.location.pathname.includes('/retail/') ||
                           window.location.pathname.includes('/reports/') ||
                           window.location.pathname.includes('/core/') ||
                           window.location.pathname.includes('/accounts/') ||
                           window.location.pathname.includes('pos.html') ||
                           window.location.pathname.includes('purchases.html') ||
                           window.location.pathname.includes('grn.html') ||
                           window.location.pathname.includes('inventory.html') ||
                           window.location.pathname.includes('receivables.html') ||
                           window.location.pathname.includes('payables.html') ||
                           window.location.pathname.includes('credit-aging.html') ||
                           window.location.pathname.includes('sales-history.html') ||
                           localStorage.getItem('currentBusinessType') === 'retail' ||
                           sessionStorage.getItem('currentBusinessType') === 'retail';

    const isStaging = window.location.hostname.includes('digibiz-test');
    if ((isScrapContext || isRetailContext) && !isStaging) {
        firebase.firestore().enablePersistence({ synchronizeTabs: true })
            .then(() => console.info('[DigiBiz] Offline persistence enabled.'))
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('[DigiBiz] Persistence failed: Multiple tabs open.');
                } else if (err.code === 'unimplemented') {
                    console.warn('[DigiBiz] Persistence not supported by this browser.');
                }
            });
    } else if (isStaging) {
        console.info('[DigiBiz] ✅ Optimized for staging environment.');
    }
})();

(function () {
    const MW_TRADING_OWNER_EMAIL = 'mwtradingsolutions@gmail.com';
    const MW_TRADING_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
    const DEFAULT_TEST_BUSINESS_ID = 'DEFAULT_TEST_BUSINESS';
    const KUBUKA_OWNER_EMAIL = 'kdkumbukaagro@gmail.com';
    const KUBUKA_BUSINESS_ID = '0Uled5estVeQVN8cChmMTNRDNIE3';
    const SPRANZA_BUSINESS_ID = 'SPRANZA_PVT_LTD';

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
     * Ensure SPRANZA business name is correct in Firestore.
     */
    window.ensureSpranzaBusinessProfile = async function () {
        if (!window.db) return;
        try {
            await window.db.collection('businesses').doc(SPRANZA_BUSINESS_ID).set(
                {
                    name: 'SPRANZA_PVT_LTD',
                    businessType: 'distributor',
                    mwTradingSolutionsTenant: true
                },
                { merge: true }
            );
        } catch (e) {
            console.warn('[DigiBiz] SPRANZA business profile bootstrap failed:', e && (e.message || e));
        }
    };

    /**
     * One-time/default demo tenant for all new registrations.
     * Keeps SPRANZA and other customer businesses fully isolated.
     */
    window.ensureDefaultTestBusinessProfile = async function () {
        if (!window.db) return;
        try {
            await window.db.collection('businesses').doc(DEFAULT_TEST_BUSINESS_ID).set(
                {
                    name: 'Demo Business',
                    businessType: 'distributor',
                    status: 'active',
                    mwTradingSolutionsTenant: true,
                    distributorModel: 'MW',
                    branchWarehousesEnabled: true
                },
                { merge: true }
            );
            await window.db.collection('settings').doc(DEFAULT_TEST_BUSINESS_ID).set({
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
        } catch (e) {
            console.warn('[DigiBiz] Default demo business bootstrap failed:', e && (e.message || e));
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

        // Automatic user access heartbeat tracking (records page visit/access on master user doc and sub-user doc)
        try {
            if (window.db && user && user.uid) {
                const now = new Date();
                const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                
                // 1. Update master users/{uid} document asynchronously without awaiting
                window.db.collection('users').doc(user.uid).set({
                    lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                    activeDates: firebase.firestore.FieldValue.arrayUnion(todayKey),
                    email: user.email || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(() => {});

                // 2. Update business membership doc if businessId exists
                const storedBid = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
                if (storedBid) {
                    window.db.collection('businesses').doc(storedBid).collection('users').doc(user.uid).set({
                        lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
                        activeDates: firebase.firestore.FieldValue.arrayUnion(todayKey),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }).catch(() => {});
                }
            }
        } catch (eActive) {
            console.warn('[DigiBiz] Active heartbeat log warn:', eActive);
        }

        const email = String(user.email || '').trim().toLowerCase();
        try { window.ensureDefaultTestBusinessProfile(); } catch (e) { /* ignore */ }
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
        } else if (email === 'biz.sirimal@gmail.com' || email === '2biz.sirimal@gmail.com') {
            // No longer forcing a test business ID. 
            // The user is now linked to their real mirrored business in the Testing project.
            console.info('[DigiBiz] Sirimal email identified. Using Firestore linked business.');
        } else {
            window.__DIGIBIZ_MW_PROFILE_SYNC__ = null;
            try {
                localStorage.removeItem('digibizMwDisplayRole');
                localStorage.removeItem('digibizMwBusinessId');
                localStorage.removeItem('digibizMwSyncEmail');
                localStorage.removeItem('digibizMwDisplayName');
            } catch (e) { /* ignore */ }
        }
        if (storedBusinessId === KUBUKA_BUSINESS_ID) {
            try { window.ensureKubukaTeaBusinessProfile(); } catch (e) { /* ignore */ }
        }
    });
})();