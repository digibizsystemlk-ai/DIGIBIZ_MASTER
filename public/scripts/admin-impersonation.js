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
            localStorage.setItem('activeBusinessId', paramBizId);
        }
        if (paramBizType) {
            localStorage.setItem('digibiz_impersonate_type', paramBizType);
        }
    }

    if (localStorage.getItem('digibiz_impersonate_active') === 'true') {
        const targetEmail = localStorage.getItem('digibiz_impersonate_email') || 'Client Business';
        const targetType = localStorage.getItem('digibiz_impersonate_type') || 'PWA App';

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
                    <span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">👑 SUPER ADMIN IMPERSONATION</span>
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
    }
})();
