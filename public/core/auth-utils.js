/**
 * Auth Utilities - Shared authentication and routing logic.
 */

window.AuthUI = {
    /**
     * Resolves business context and routes the user to the appropriate dashboard.
     * @param {firebase.User} user 
     */
    async routeToUniversalDashboard(user) {
        if (!user) return;
        
        try {
            // Ensure global DB is ready
            let retry = 0;
            while (!window.db && retry < 50) {
                await new Promise(r => setTimeout(r, 100));
                retry++;
            }
            
            if (!window.db) {
                console.error('[AuthUI] Firestore (window.db) not initialized');
                window.location.href = '../modules/core/dashboard.html';
                return;
            }

            if (typeof window.ensureMwTradingOwnerBizMembership === 'function') {
                await window.ensureMwTradingOwnerBizMembership(user);
            }

            const userDoc = await window.db.collection('users').doc(user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const businessId = userData.businessId || user.uid;
            
            let businessType = 'retail';
            const businessDoc = await window.db.collection('businesses').doc(businessId).get();
            if (businessDoc.exists) {
                businessType = businessDoc.data().businessType || businessType;
            }

            // Persist context
            localStorage.setItem('currentBusinessId', businessId);
            sessionStorage.setItem('currentBusinessId', businessId);
            localStorage.setItem('currentBusinessType', businessType);
            sessionStorage.setItem('currentBusinessType', businessType);

            if (window.FinalizationEngine && window.FinalizationEngine.runAutoFinalizationForCurrentUser) {
                await window.FinalizationEngine.runAutoFinalizationForCurrentUser();
            }

            if (userData.mustChangePassword === true) {
                localStorage.setItem('forcePasswordChangeNotice', 'Please change your password before continuing');
                sessionStorage.setItem('forcePasswordChangeNotice', 'Please change your password before continuing');
                window.location.href = '../modules/core/change-password.html';
                return;
            }
        } catch (error) {
            console.warn('[AuthUI] Login context resolution failed:', error);
        }
        
        window.location.href = '../modules/core/dashboard.html';
    }
};
