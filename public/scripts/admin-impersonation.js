// DIGIBIZ Super Admin Direct Client Impersonation & Debug Suite
(function initSuperAdminImpersonation() {
    const urlParams = new URLSearchParams(window.location.search);
    const isParamImpersonate = urlParams.get('impersonate') === 'true';

    if (isParamImpersonate) {
        const paramEmail = urlParams.get('email');
        const paramBizId = urlParams.get('bizId');
        const paramBizType = urlParams.get('bizType');

        if (paramEmail) {
            localStorage.setItem('digibiz_impersonate_active', 'true');
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
    }

    const isActive = localStorage.getItem('digibiz_impersonate_active') === 'true';
    if (!isActive) return;

    const targetEmail = localStorage.getItem('digibiz_impersonate_email') || 'Client Business';
    const targetBizId = localStorage.getItem('digibiz_impersonate_biz_id') || 'CLIENT_BIZ';
    const targetType = String(localStorage.getItem('digibiz_impersonate_type') || 'retail').toLowerCase();

    // Ensure business context keys are set in Local and Session storage
    localStorage.setItem('currentBusinessId', targetBizId);
    sessionStorage.setItem('currentBusinessId', targetBizId);
    localStorage.setItem('businessId', targetBizId);
    sessionStorage.setItem('businessId', targetBizId);

    localStorage.setItem('currentBusinessType', targetType);
    sessionStorage.setItem('currentBusinessType', targetType);

    // Auto-authenticate unauthenticated Incognito sessions via Anonymous Auth to prevent landing page redirects
    const ensureImpersonatedAuth = async () => {
        if (window.firebase && window.firebase.auth) {
            try {
                const authInst = window.firebase.auth();
                if (!authInst.currentUser) {
                    await authInst.signInAnonymously().catch(e => console.warn('[Impersonation] Anonymous auth warn:', e));
                }
            } catch (err) {
                console.warn('[Impersonation] Auth init warn:', err);
            }
        }
    };

    ensureImpersonatedAuth();

    // If currently on Landing Page (index.html), redirect ONCE to target module page
    const path = window.location.pathname.toLowerCase();
    if (path === '/' || path === '/index.html') {
        let dest = '/modules/retail/workbench.html';
        if (targetType.includes('tire')) dest = '/modules/tire_centre/workbench.html';
        else if (targetType.includes('attendance') || targetType.includes('payroll')) dest = '/modules/attendance_payroll/employees.html';
        else if (targetType.includes('distributor')) dest = '/modules/distributor/orders.html';
        else if (targetType.includes('pharmacy')) dest = '/modules/pharmacy/inventory.html';
        else if (targetType.includes('hardware')) dest = '/modules/hardware/inventory.html';

        // Only redirect if not already on the destination
        if (!window.location.href.includes(dest)) {
            window.location.href = dest;
            return;
        }
    }

    const setupBanner = () => {
        const existingBanner = document.getElementById('super-admin-impersonation-banner');
        if (existingBanner) return;

        const banner = document.createElement('div');
        banner.id = 'super-admin-impersonation-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 999999;
            background: linear-gradient(90deg, #d97706 0%, #b45309 100%);
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.35);
            font-size: 13px;
            font-weight: 700;
            box-sizing: border-box;
        `;

        banner.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">👑 SUPER ADMIN IMPERSONATION MODE</span>
                <span>Viewing Live Client: <strong>${targetEmail}</strong> (${targetType})</span>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <button id="exit-impersonation-btn" style="background:#ffffff; color:#b45309; border:none; padding:5px 14px; border-radius:6px; font-size:12px; font-weight:800; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);" type="button">
                    ❌ Exit & Close Tab
                </button>
            </div>
        `;

        document.body.prepend(banner);
        document.body.style.marginTop = '42px';

        const exitBtn = document.getElementById('exit-impersonation-btn');
        if (exitBtn) {
            exitBtn.onclick = () => {
                localStorage.removeItem('digibiz_impersonate_active');
                localStorage.removeItem('digibiz_impersonate_email');
                localStorage.removeItem('digibiz_impersonate_biz_id');
                localStorage.removeItem('digibiz_impersonate_type');
                try {
                    window.close();
                } catch (_e) {}
                window.location.href = '/admin/business-management.html';
            };
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupBanner);
    } else {
        setupBanner();
    }
})();
