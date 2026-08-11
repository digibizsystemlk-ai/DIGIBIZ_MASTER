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
        
        let businessType = 'retail';
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
            const emailNorm = String(user.email || '').trim().toLowerCase();
            
            let businessId = userData.businessId || user.uid;
            
            // 1. Staff Discovery Override
            if (emailNorm) {
                // Try registry first
                const regDoc = await window.db.collection('staff_registry').doc(emailNorm).get();
                if (regDoc.exists && regDoc.data().businessId) {
                    businessId = regDoc.data().businessId;
                } else {
                    // Try direct bypasses
                    if (emailNorm === 'biz.himeshi@gmail.com' || emailNorm === 'biz.sirimal@gmail.com' || emailNorm === '2biz.sirimal@gmail.com') {
                        businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
                    }
                }
            }

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
            // Check Subscription Status for Google Play → Web Access Sync
            const subStatus = userData.subscriptionStatus || (businessDoc.exists ? businessDoc.data().subscriptionStatus : 'ACTIVE');
            if (subStatus === 'EXPIRED' || subStatus === 'INACTIVE') {
                alert('Your DigiBiz Retail Subscription is currently inactive. Please renew via Google Play App or Contact Support.');
                window.location.href = 'https://play.google.com/store/account/subscriptions';
                return;
            }
        } catch (error) {
            console.warn('[AuthUI] Login context resolution failed:', error);
        }
        
        const targetUrl = (window.dashboardCore && window.dashboardCore.getVerticalDashboardUrl)
            ? window.dashboardCore.getVerticalDashboardUrl(businessType)
            : (businessType === 'distributor' ? '/modules/distributor/web/dashboard.html' : `/modules/${businessType}/dashboard.html`);
        window.location.href = targetUrl;
    }
};
