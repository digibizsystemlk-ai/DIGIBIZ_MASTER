// Dynamic Sidebar Component - Retail Navbar Layout

const SIDEBAR_WIDTH = 260;
const DIGIBIZ_UPDATE_VERSION = '2026.04.17.2';
/** Open primary nav links in a new tab (product default). */
const SIDEBAR_NAV_LINK_TARGET = '_self';
const SIDEBAR_NAV_LINK_REL = 'noopener noreferrer';
const DIGIBIZ_UPDATE_TITLE = "What's New";
const DIGIBIZ_UPDATE_POINTS = [
    'Custom SMS Header is now editable from SMS Settings.',
    'All trial accounts now receive reliable free 300 SMS seeding.',
    'Sidebar business-type locking is stabilized for correct menus on every load.',
    'Manufacturer account, reports, and SMS queue logging are restored.',
    'SMS wallet: 300 trial credits (7 days) + paid credits; Billing & Super Admin show usage (1 credit per SMS).'
];
/** Only the marketing root should skip the app sidebar — not module pages named index.html */
const SHOULD_RESERVE_SIDEBAR_SPACE = (() => {
    const raw = (window.location.pathname || '').split('?')[0];
    const p = raw.replace(/\/+$/, '') || '/';
    return p !== '/' && p !== '/index.html';
})();

function digibizSmsEffectiveTotal(w) {
    if (!w || typeof w !== 'object') return 0;
    if (window.SmsWalletCore && typeof window.SmsWalletCore.effectiveTotal === 'function') {
        return window.SmsWalletCore.effectiveTotal(w);
    }
    const paid = Math.max(0, Number(w.paidSmsBalance ?? w.paidBalance ?? 0));
    let trial = Math.max(0, Number(w.trialSmsBalance ?? w.trialBalance ?? 0));
    const exp = w.trialSmsExpiresAt || w.trialExpiresAt;
    if (exp) {
        const t = typeof exp.toDate === 'function' ? exp.toDate().getTime() : new Date(exp).getTime();
        if (!Number.isNaN(t) && Date.now() > t) trial = 0;
    }
    const sum = paid + trial;
    if (sum >= 1) return sum;
    return Math.max(0, Number(w.smsBalance || 0));
}

function ensureSubscriptionManagerLoaded() {
    return new Promise((resolve) => {
        if (window.subscriptionManager) {
            resolve();
            return;
        }
        if (document.getElementById('subscription-manager-script')) {
            document.getElementById('subscription-manager-script').addEventListener('load', () => resolve());
            return;
        }
        const script = document.createElement('script');
        script.id = 'subscription-manager-script';
        script.src = '/core/subscription-manager.js';
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
    });
}

function ensureSidebarStyles() {
    if (document.getElementById('sidebar-main-styles')) return;
    const style = document.createElement('style');
    style.id = 'sidebar-main-styles';
    style.textContent = `
        /* Body left gutter: set only in each page's first <style> (avoids duplicate margin with module CSS). */
        .retail-navbar{position:fixed;left:0;top:0;width:${SIDEBAR_WIDTH}px;height:100vh;background:linear-gradient(135deg,#0a2a44 0%,#1e3c72 100%);color:#fff;z-index:9999 !important;overflow-y:auto;display:flex;flex-direction:column;justify-content:space-between;font-family:'Inter',sans-serif;pointer-events:auto;}
        .retail-navbar *{pointer-events:auto;}
        .digibiz-mobile-menu-toggle{position:fixed;top:15px;left:15px;z-index:10001;width:46px;height:46px;border:none;border-radius:12px;background:rgba(15,59,44,.95);color:#fff;display:none;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(0,0,0,.35);cursor:pointer;font-size:20px;padding:0;margin:0;backdrop-filter:blur(2px);}
        .digibiz-mobile-topbar{position:fixed;top:15px;left:70px;right:15px;height:46px;background:rgba(10,42,68,.96);border-radius:12px;z-index:10000;display:none;align-items:center;padding:0 12px;box-shadow:0 10px 24px rgba(0,0,0,.28);gap:10px;}
        .digibiz-mobile-biz-logo{width:34px;height:34px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.2);flex-shrink:0;display:none;background:rgba(0,0,0,.15);}
        .digibiz-mobile-biz-logo.is-visible{display:block;}
        .digibiz-mobile-brand-wrap{position:relative;display:inline-flex;align-items:center;padding-right:6px;}
        .digibiz-mobile-brand{font-size:16px;font-weight:900;letter-spacing:.55px;color:#ffd966;white-space:nowrap;line-height:1;}
        .digibiz-mobile-business-name{font-size:12px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1;text-transform:uppercase;font-weight:700;letter-spacing:.35px;text-align:center;}
        .digibiz-mobile-right-spacer{width:18px;flex:0 0 18px;}
        .biz-name{text-transform:uppercase !important;}
        .digibiz-sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;opacity:0;pointer-events:none;transition:opacity .2s ease;}
        html.digibiz-sidebar-open .digibiz-sidebar-overlay{opacity:1;pointer-events:auto;}
        .trial-sidebar-banner{background:#dc2626;color:#fff;text-align:center;padding:6px 8px;font-size:11px;font-weight:700;letter-spacing:.5px;animation:pulseRed 1s infinite;border-bottom:1px solid rgba(255,255,255,.2);}
        @keyframes pulseRed{0%{background:#dc2626;}50%{background:#b91c1c;}100%{background:#dc2626;}}
        .sidebar-header{padding:16px 24px;border-bottom:1px solid rgba(255,255,255,.15);}
        .logo{font-size:24px;font-weight:700;text-align:center;margin-bottom:12px;}
        .logo span{color:#ffd966;}
        .sidebar-business-logo-wrap{display:flex;justify-content:center;align-items:center;min-height:48px;margin:0 0 10px;}
        .sidebar-business-logo-img{max-height:52px;max-width:200px;width:auto;object-fit:contain;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.12);display:none;}
        .sidebar-business-logo-img.is-visible{display:block;}
        .sidebar-business-logo-icon{font-size:38px;line-height:1;display:none;}
        .sidebar-business-logo-icon.is-visible{display:block;}
        .sidebar-business-name{font-size:13px;font-weight:800;text-align:center;color:#e5f3ff;margin:0 0 14px;text-transform:uppercase !important;letter-spacing:.4px;min-height:18px;display:block !important;visibility:visible !important;}
        .user-info-sidebar{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.1);padding:12px 14px;border-radius:12px;}
        .user-avatar-sidebar{font-size:30px;}
        .user-name-sidebar{font-size:14px;font-weight:600;}
        .user-role-sidebar{font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(0,0,0,.3);display:inline-block;}
        .sidebar-subscription-status{margin-top:8px;font-size:11px;color:#fde68a;}
        .nav-links{flex:1;padding:16px 0;}
        .menu-section-label{padding:8px 24px;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.6);font-weight:700;}
        .menu-item{padding:12px 24px;display:flex;align-items:center;gap:14px;color:rgba(255,255,255,.85);text-decoration:none;font-size:14px;transition:all .2s;}
        .menu-item:hover,.menu-item.active{background:rgba(255,255,255,.12);color:#ffd966;border-left:3px solid #ffd966;}
        .menu-dropdown-toggle{width:100%;text-align:left;background:transparent;border:none;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:14px;color:rgba(255,255,255,.85);font-size:14px;cursor:pointer;}
        .menu-dropdown-toggle:hover{background:rgba(255,255,255,.12);color:#ffd966;border-left:3px solid #ffd966;}
        .menu-dropdown-items{display:none;background:rgba(255,255,255,.06);}
        .menu-dropdown.open .menu-dropdown-items{display:block;}
        .menu-dropdown-items .menu-item{padding-left:52px;font-size:13px;}
        .menu-icon{width:22px;text-align:center;}
        .sidebar-footer{padding:20px;}
        .logout-sidebar-btn{background:rgba(220,38,38,.8);border:none;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;width:100%;font-size:14px;}
        .logout-sidebar-btn:hover{background:#dc2626;}
        @media (max-width:768px){html.digibiz-mobile-toggle-space body{padding-top:72px;} .digibiz-mobile-menu-toggle{display:flex;} .digibiz-mobile-topbar{display:flex;} .retail-navbar{transform:translateX(-100%);transition:transform .2s ease;} .retail-navbar .sidebar-business-name{display:block !important;visibility:hidden !important;} html.digibiz-sidebar-open .retail-navbar{transform:translateX(0);}}
    `;
    document.head.appendChild(style);
}

function closeMobileSidebar() {
    document.documentElement.classList.remove('digibiz-sidebar-open');
}

function ensureMobileSidebarControls() {
    ensureSidebarStyles();
    document.documentElement.classList.add('digibiz-mobile-toggle-space');
    if (!document.getElementById('digibizMobileMenuToggle')) {
        const toggle = document.createElement('button');
        toggle.id = 'digibizMobileMenuToggle';
        toggle.className = 'digibiz-mobile-menu-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Open menu');
        toggle.innerHTML = '☰';
        document.body.appendChild(toggle);
        toggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('digibiz-sidebar-open');
        });
    }
    if (!document.getElementById('digibizSidebarOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'digibizSidebarOverlay';
        overlay.className = 'digibiz-sidebar-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', closeMobileSidebar);
        overlay.addEventListener('touchstart', closeMobileSidebar, { passive: true });
    }
    if (!document.getElementById('digibizMobileTopbar')) {
        const topbar = document.createElement('div');
        topbar.id = 'digibizMobileTopbar';
        topbar.className = 'digibiz-mobile-topbar';
        topbar.innerHTML = `
            <img id="digibizMobileBusinessLogoImg" class="digibiz-mobile-biz-logo" alt="" decoding="async" />
            <div class="digibiz-mobile-brand-wrap"><div class="digibiz-mobile-brand">DIGIBIZ</div></div>
            <div class="digibiz-mobile-business-name biz-name" id="digibizMobileBusinessName"></div>
            <div class="digibiz-mobile-right-spacer"></div>
        `;
        document.body.appendChild(topbar);
    }
    if (!document.body.dataset.sidebarOutsideCloseBound) {
        const outsideCloseHandler = (event) => {
            if (!document.documentElement.classList.contains('digibiz-sidebar-open')) return;
            const sidebar = document.querySelector('.retail-navbar.digibiz-sidebar');
            const toggle = document.getElementById('digibizMobileMenuToggle');
            const target = event.target;
            if (sidebar && sidebar.contains(target)) return;
            if (toggle && toggle.contains(target)) return;
            closeMobileSidebar();
        };
        document.addEventListener('click', outsideCloseHandler, true);
        document.addEventListener('touchstart', outsideCloseHandler, true);
        document.body.dataset.sidebarOutsideCloseBound = 'true';
    }
}

function preReserveSidebarSpace() {
    if (!SHOULD_RESERVE_SIDEBAR_SPACE) return;
    ensureSidebarStyles();
    document.documentElement.classList.add('digibiz-sidebar-reserved');
}

class Sidebar {
    constructor() {
        preReserveSidebarSpace();
        this.mwBusinessId = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
        this.spranzaBusinessId = 'SPRANZA_PVT_LTD';
        this.kduTeaBusinessId = '0Uled5estVeQVN8cChmMTNRDNIE3';
        this.scrapOwnerUid = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
        this.superAdmin = false;
        this.businessLogoUrl = '';
        if (SHOULD_RESERVE_SIDEBAR_SPACE) {
            // Paint cached sidebar immediately at bootstrap (no auth/db wait).
            this.bootCachedSidebarNow();
        }
        this.init();
    }

    getStoredBusinessType() {
        return this.normalizeBusinessType(localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || '');
    }

    normalizeBusinessType(typeRaw) {
        const raw = String(typeRaw || '').trim().toLowerCase();
        if (!raw) return '';
        const compact = raw.replace(/[\s\-_]+/g, '');
        if (compact === 'teafactory') return 'manufacturer';
        if (compact === 'scrapcollectioncenter') return 'scrap_collection_center';
        if (compact === 'distributor') return 'distributor';
        if (compact === 'manufacturer') return 'manufacturer';
        if (compact === 'pharmacy') return 'pharmacy';
        if (compact === 'hardware') return 'hardware';
        if (compact === 'service') return 'service';
        if (compact === 'retail') return 'retail';
        return raw;
    }

    shouldForceManufacturerMode() {
        const path = String(window.location.pathname || '').toLowerCase();
        return this.getStoredBusinessType() === 'manufacturer' || path.includes('/modules/manufacturer/');
    }

    primeFromCache(userId) {
        const storedType = this.getStoredBusinessType();
        const storedBusinessId = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || null;
        const storedBusinessName = localStorage.getItem('currentBusinessName') || sessionStorage.getItem('currentBusinessName') || 'Business';
        const storedRole = localStorage.getItem('currentUserRole')
            || sessionStorage.getItem('currentUserRole')
            || window.__DIGIBIZ_LOCAL_ROLE__
            || 'VIEWER';
        const storedBizRole = localStorage.getItem('currentBusinessNavRole')
            || sessionStorage.getItem('currentBusinessNavRole')
            || storedRole;

        this.currentUserId = userId;
        this.currentRole = String(storedRole || 'VIEWER');
        this.businessNavRole = String(storedBizRole || this.currentRole || 'VIEWER');
        this.businessId = storedBusinessId;
        const pathIsManufacturer = String(window.location.pathname || '').toLowerCase().includes('/modules/manufacturer/');
        if (pathIsManufacturer && storedType !== 'scrap_collection_center') {
            this.businessType = 'manufacturer';
        } else {
            this.businessType = storedType || (this.shouldForceManufacturerMode() ? 'manufacturer' : 'retail');
        }
        this.businessName = storedBusinessName || 'Business';
        this.businessLogoUrl = localStorage.getItem('digibizBusinessLogoUrl') || sessionStorage.getItem('digibizBusinessLogoUrl') || '';
        this.ownerName = this.ownerName || '';
        this.manufacturerDueAlert = null;
        this.smsLowBalanceAlert = null;
    }

    bootCachedSidebarNow() {
        try {
            this.primeFromCache(this.currentUserId || null);
            this.render();
            this.attachEvents();
        } catch (e) {
            // ignore bootstrap paint errors; async init will still recover
        }
    }

    async init() {
        // Load subscription manager in background so sidebar can paint immediately.
        const subscriptionReady = ensureSubscriptionManagerLoaded();
        firebase.auth().onAuthStateChanged(async (user) => {
            const cachedTypeBeforeLoad = String(localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || '').toLowerCase();
            if (user && SHOULD_RESERVE_SIDEBAR_SPACE) {
                document.querySelectorAll('.retail-navbar').forEach((el) => el.remove());
                const mountPoint = document.getElementById('sidebar-container');
                if (mountPoint) mountPoint.innerHTML = '';
                // First paint using cached context to avoid delayed sidebar on every navigation.
                this.primeFromCache(user.uid);
                this.render();
                this.attachEvents();

                await this.loadUserData(user.uid);
                try {
                    const token = await user.getIdTokenResult(true);
                    this.superAdmin = !!(token && token.claims && (token.claims.admin === true || token.claims.superAdmin === true));
                } catch (e) {
                    this.superAdmin = false;
                }
                if (!this.superAdmin && String(this.currentRole || '').toUpperCase() === 'SUPER_ADMIN') {
                    this.superAdmin = true;
                }
                if (this.businessType === 'manufacturer') {
                    const reloadKey = 'digibiz_sidebar_mfg_reload_once';
                    if (cachedTypeBeforeLoad && cachedTypeBeforeLoad !== 'manufacturer' && sessionStorage.getItem(reloadKey) !== '1') {
                        sessionStorage.setItem(reloadKey, '1');
                        window.location.reload();
                        return;
                    }
                    sessionStorage.removeItem(reloadKey);
                }
                if (this.shouldForceManufacturerMode() && this.businessType !== 'manufacturer') {
                    this.businessType = 'manufacturer';
                    localStorage.setItem('currentBusinessType', 'manufacturer');
                    sessionStorage.setItem('currentBusinessType', 'manufacturer');
                }
                // First paint sidebar immediately (without waiting on optional fetches).
                this.render();
                this.attachEvents();
                // Non-critical tasks continue after first paint.
                Promise.resolve().then(() => this.maybeShowUpdateAnnouncement(user)).catch(() => {});
                Promise.resolve(subscriptionReady).then(async () => {
                    this.subscriptionState = window.subscriptionManager
                        ? await window.subscriptionManager.initializeForUser(user, this.currentRole, this.businessId || user.uid)
                        : null;
                    this.updateUserInfo();
                }).catch(() => {});
            }
        });
    }

    parseVersion(v) {
        return String(v || '0').split('.').map((x) => Number(x) || 0);
    }

    isVersionNewer(current, seen) {
        const a = this.parseVersion(current);
        const b = this.parseVersion(seen);
        const len = Math.max(a.length, b.length);
        for (let i = 0; i < len; i += 1) {
            const x = a[i] || 0;
            const y = b[i] || 0;
            if (x > y) return true;
            if (x < y) return false;
        }
        return false;
    }

    async maybeShowUpdateAnnouncement(user) {
        if (!user) return;
        const lsKey = `digibiz_last_seen_update_${user.uid}`;
        const localSeen = localStorage.getItem(lsKey) || '0';
        let cloudSeen = '0';
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            cloudSeen = userDoc.exists ? String((userDoc.data() || {}).lastSeenUpdateVersion || '0') : '0';
        } catch (e) {
            cloudSeen = localSeen;
        }
        const seen = this.isVersionNewer(localSeen, cloudSeen) ? localSeen : cloudSeen;
        if (!this.isVersionNewer(DIGIBIZ_UPDATE_VERSION, seen)) return;
        if (document.getElementById('digibizUpdateBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'digibizUpdateBanner';
        banner.style.position = 'fixed';
        banner.style.left = '50%';
        banner.style.top = '50%';
        banner.style.transform = 'translate(-50%, -50%)';
        banner.style.margin = '0';
        banner.style.maxWidth = '380px';
        banner.style.width = 'calc(100% - 32px)';
        banner.style.zIndex = '10002';
        banner.style.background = '#ffffff';
        banner.style.color = '#0f172a';
        banner.style.border = '1px solid #dbe2ea';
        banner.style.borderRadius = '14px';
        banner.style.boxShadow = '0 12px 28px rgba(15,23,42,.2)';
        banner.style.padding = '14px';
        banner.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <b>${DIGIBIZ_UPDATE_TITLE}</b>
                <span style="font-size:11px;color:#475569;">v${DIGIBIZ_UPDATE_VERSION}</span>
            </div>
            <ul style="margin:8px 0 0 18px;padding:0;font-size:13px;line-height:1.4;">
                ${DIGIBIZ_UPDATE_POINTS.map((p) => `<li>${p}</li>`).join('')}
            </ul>
            <div style="margin-top:10px;text-align:right;">
                <button id="digibizUpdateOkBtn" style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:7px 12px;cursor:pointer;">Got it</button>
            </div>
        `;
        document.body.appendChild(banner);
        const markSeen = async () => {
            localStorage.setItem(lsKey, DIGIBIZ_UPDATE_VERSION);
            try {
                await db.collection('users').doc(user.uid).set({
                    lastSeenUpdateVersion: DIGIBIZ_UPDATE_VERSION,
                    lastSeenUpdateAt: new Date()
                }, { merge: true });
            } catch (e) { /* ignore */ }
            banner.remove();
        };
        const okBtn = document.getElementById('digibizUpdateOkBtn');
        if (okBtn) okBtn.addEventListener('click', markSeen);
    }

    async loadUserData(userId) {
        const storedType = this.getStoredBusinessType();
        try {
            this.currentUserId = userId;
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? (userDoc.data() || {}) : {};
            this.currentRole = userData.role || 'VIEWER';
            this.currentUserEmail = String((userData.email || (firebase.auth().currentUser && firebase.auth().currentUser.email) || '')).trim().toLowerCase();
            this.ownerName = userData.ownerName || userData.name || '';
            const mustChangePassword = userData.mustChangePassword === true;
            this.businessId = userData.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || null;
            if (!this.businessId && window.dashboardCore && typeof window.dashboardCore.getContext === 'function' && firebase.auth().currentUser) {
                try {
                    const ctx = await window.dashboardCore.getContext(firebase.auth().currentUser);
                    this.businessId = ctx && ctx.businessId ? ctx.businessId : this.businessId;
                } catch (ctxErr) { /* ignore */ }
            }
            if (this.businessId) {
                const businessDoc = await db.collection('businesses').doc(this.businessId).get();
                if (businessDoc.exists) {
                    this.businessType = this.normalizeBusinessType(businessDoc.data().businessType || userData.businessType || 'retail');
                } else {
                    this.businessType = this.normalizeBusinessType(userData.businessType || 'retail');
                }
                this.businessName = businessDoc.exists ? businessDoc.data().name : 'My Business';
                if (businessDoc.exists && businessDoc.data().ownerName) this.ownerName = businessDoc.data().ownerName;
                const logoFromDoc = businessDoc.exists ? String((businessDoc.data() || {}).logoUrl || '').trim() : '';
                this.businessLogoUrl = logoFromDoc;
                try {
                    if (logoFromDoc) {
                        localStorage.setItem('digibizBusinessLogoUrl', logoFromDoc);
                        sessionStorage.setItem('digibizBusinessLogoUrl', logoFromDoc);
                    } else {
                        localStorage.removeItem('digibizBusinessLogoUrl');
                        sessionStorage.removeItem('digibizBusinessLogoUrl');
                    }
                } catch (e) { /* ignore */ }
                if (businessDoc.exists) {
                    localStorage.setItem('currentBusinessType', this.businessType);
                    sessionStorage.setItem('currentBusinessType', this.businessType);
                }
                if (this.businessId === 'YRMbB6aq4CMevSrLWkQvoVMtc8b2' && this.businessType !== 'scrap_collection_center') {
                    this.businessType = 'distributor';
                    localStorage.setItem('currentBusinessType', 'distributor');
                    sessionStorage.setItem('currentBusinessType', 'distributor');
                }
            } else {
                this.businessType = storedType || (this.shouldForceManufacturerMode() ? 'manufacturer' : 'retail');
                this.businessName = 'No Business Connected';
                this.businessLogoUrl = '';
                try {
                    localStorage.removeItem('digibizBusinessLogoUrl');
                    sessionStorage.removeItem('digibizBusinessLogoUrl');
                } catch (e) { /* ignore */ }
            }
            const p = String(window.location.pathname || '').toLowerCase();
            if (mustChangePassword && !p.includes('/modules/core/change-password.html') && !p.includes('/auth/login.html')) {
                try {
                    localStorage.setItem('forcePasswordChangeNotice', 'Please change your password before continuing');
                    sessionStorage.setItem('forcePasswordChangeNotice', 'Please change your password before continuing');
                } catch (e) { /* ignore */ }
                window.location.href = '/modules/core/change-password.html';
                return;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.currentRole = 'VIEWER';
            this.ownerName = '';
            this.businessType = storedType || (this.shouldForceManufacturerMode() ? 'manufacturer' : 'retail');
            this.businessName = 'No Business Connected';
            this.businessLogoUrl = '';
        }
        if (this.shouldForceManufacturerMode()) {
            this.businessType = 'manufacturer';
            localStorage.setItem('currentBusinessType', 'manufacturer');
            sessionStorage.setItem('currentBusinessType', 'manufacturer');
        }
        this.businessNavRole = String(this.currentRole || '').toUpperCase();
        if (this.businessId && userId) {
            try {
                const bizUser = await db.collection('businesses').doc(this.businessId).collection('users').doc(userId).get();
                if (bizUser.exists && bizUser.data().role) {
                    this.businessNavRole = String(bizUser.data().role).toUpperCase();
                }
            } catch (e) {
                console.warn('Sidebar business role lookup failed:', e?.message || e);
            }
        }
        this.manufacturerDueAlert = null;
        this.smsLowBalanceAlert = null;
        if (this.businessId) {
            try {
                const settingsDoc = await db.collection('settings').doc(this.businessId).get();
                const smsWallet = settingsDoc.exists ? ((settingsDoc.data() || {}).smsWallet || {}) : {};
                const bal = digibizSmsEffectiveTotal(smsWallet);
                const threshold = Number(smsWallet.lowBalanceThreshold || 50);
                if (bal < threshold) {
                    this.smsLowBalanceAlert = { bal, threshold };
                }
            } catch (e) {
                console.warn('SMS wallet lookup failed:', e?.message || e);
            }
        }
        if (this.businessType === 'manufacturer' && this.businessId) {
            try {
                const [payables, receivables] = await Promise.all([
                    db.collection('manufacturer_raw_material_history')
                        .where('businessId', '==', this.businessId)
                        .where('paymentStatus', 'in', ['PENDING', 'PENDING_CLEARANCE'])
                        .limit(40).get().catch(() => ({ docs: [] })),
                    db.collection('manufacturer_sales')
                        .where('businessId', '==', this.businessId)
                        .where('paymentStatus', 'in', ['PENDING', 'PENDING_CLEARANCE'])
                        .limit(40).get().catch(() => ({ docs: [] }))
                ]);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const overdue = (payables.docs || []).concat(receivables.docs || []).reduce((n, doc) => {
                    const row = doc.data() || {};
                    const dueStr = row.dueDate || row.chequeClearanceDate;
                    if (!dueStr) return n;
                    const due = new Date(dueStr);
                    if (Number.isNaN(due.getTime())) return n;
                    due.setHours(0, 0, 0, 0);
                    return due < now ? n + 1 : n;
                }, 0);
                const pendingCount = (payables.size || 0) + (receivables.size || 0);
                if (pendingCount > 0) {
                    this.manufacturerDueAlert = {
                        pendingCount,
                        overdue
                    };
                    if (window.eventBus && typeof window.eventBus.publish === 'function') {
                        window.eventBus.publish('MANUFACTURER_DUE_ALERT', {
                            businessId: this.businessId,
                            pendingCount,
                            overdue
                        });
                    }
                }
            } catch (e) {
                console.warn('Manufacturer due alert check failed:', e?.message || e);
            }
        }

        // Cache resolved identity/context for instant sidebar paint on next page load.
        try {
            localStorage.setItem('currentUserRole', String(this.currentRole || 'VIEWER'));
            sessionStorage.setItem('currentUserRole', String(this.currentRole || 'VIEWER'));
            localStorage.setItem('currentBusinessNavRole', String(this.businessNavRole || this.currentRole || 'VIEWER'));
            sessionStorage.setItem('currentBusinessNavRole', String(this.businessNavRole || this.currentRole || 'VIEWER'));
            if (this.businessName) {
                localStorage.setItem('currentBusinessName', String(this.businessName));
                sessionStorage.setItem('currentBusinessName', String(this.businessName));
            }
            if (this.currentUserEmail) {
                localStorage.setItem('digibizSidebarUserEmail', this.currentUserEmail);
                sessionStorage.setItem('digibizSidebarUserEmail', this.currentUserEmail);
            }
        } catch (e) { /* ignore */ }
    }

    isAdminRole() {
        return ['SUPER_ADMIN', 'ADMIN'].includes(this.currentRole) || String(this.currentRole || '').includes('ADMIN');
    }

    isSuperAdminUser() {
        return this.superAdmin === true || String(this.currentRole || '').toUpperCase() === 'SUPER_ADMIN';
    }

    isRepRole() {
        return String(this.currentRole || '').toUpperCase() === 'REP';
    }

    isMwTradingContext() {
        return this.businessId === this.mwBusinessId;
    }

    isSpranzaContext() {
        return String(this.businessId || '') === this.spranzaBusinessId;
    }

    isStrictMwTradingBusiness() {
        return String(this.businessId || '') === this.mwBusinessId;
    }

    isPilotTenant(email, businessId) {
        const em = String(email || '').trim().toLowerCase();
        // Pilot gate requested by product owner: email-scoped.
        return em === 'bdkariyapperuma@gmail.com';
    }

    isBdkAccountingTenant() {
        const authEmail = (firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.email) || '';
        const fromStorage = localStorage.getItem('digibizMwSyncEmail') || sessionStorage.getItem('digibizMwSyncEmail') || '';
        const cached = localStorage.getItem('digibizSidebarUserEmail') || sessionStorage.getItem('digibizSidebarUserEmail') || '';
        const email = String(authEmail || fromStorage || cached || this.currentUserEmail || '').trim().toLowerCase();
        return email === 'bdkariyapperuma@gmail.com';
    }

    isKdkumbukaTenant() {
        return String(this.businessId || '') === this.kduTeaBusinessId;
    }

    isCommissionPilotEnabled() {
        const authEmail = (firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.email) || '';
        const fromStorage = localStorage.getItem('digibizMwSyncEmail') || sessionStorage.getItem('digibizMwSyncEmail') || '';
        const email = String(authEmail || fromStorage || '').trim().toLowerCase();
        const bid = String(this.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || '').trim();
        const activeResult = !!(window.DigiBizDistributorLorryStock
            && window.DigiBizDistributorLorryStock.activeForSession(email, bid));
        const pilotByEmail = this.isPilotTenant(email, bid);
        console.log('isPilotTenant:', pilotByEmail);
        console.log('activeForSession result:', activeResult);
        const bidTenant = bid === this.mwBusinessId || bid === this.spranzaBusinessId;
        return pilotByEmail || activeResult || bidTenant;
    }

    isWarehouseDisabledForCurrentTenant() {
        const authEmail = (firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.email) || '';
        const fromStorage = localStorage.getItem('digibizMwSyncEmail') || sessionStorage.getItem('digibizMwSyncEmail') || '';
        const email = String(authEmail || fromStorage || '').trim().toLowerCase();
        const bid = String(this.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || '').trim();
        return this.isPilotTenant(email, bid);
    }

    getDistributorPermissionProfile() {
        const P = window.DigibizDistributorPermissions;
        const roleRaw = this.businessNavRole || this.currentRole || '';
        if (!P) {
            return {
                canViewAccounting: true,
                canViewReportsFull: true,
                canViewFinancialsProfit: true,
                canInvoiceCreateEdit: true,
                canManageRepsWeb: true
            };
        }
        return P.permissionsForRole(roleRaw);
    }

    getDistributorWebMenuBase() {
        const base = [
            { icon: '🛒', name: 'New sales order', link: '/modules/distributor/web/new-order.html' },
            { icon: '🏪', name: 'Shops', link: '/modules/distributor/web/my-shops.html' },
            { icon: '📑', name: 'Orders', link: '/modules/distributor/web/index.html?tab=pending' },
            { icon: '💰', name: 'Sales', link: '/modules/distributor/web/sales.html' },
            { icon: '🧾', name: 'Invoices', link: '/modules/distributor/web/invoices.html' },
            { icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
            { icon: '🧾', name: 'GRN', link: '/modules/distributor/web/grn.html' },
            { icon: '📦', name: 'Products', link: '/modules/distributor/web/products.html' },
            { icon: '👥', name: 'Reps', link: '/modules/distributor/web/reps.html' },
            { icon: '🏭', name: 'Warehouse', link: '/modules/distributor/web/warehouse.html' },
            { icon: '🚚', name: 'Deliveries', link: '/modules/distributor/web/deliveries.html' },
            { icon: '🎁', name: 'Free issues log', link: '/modules/distributor/web/free-items.html' },
            { icon: '🔄', name: 'Returns log', link: '/modules/distributor/web/returns.html' },
            { icon: '📈', name: 'Distributor Reports', link: '/modules/distributor/web/reports.html' }
        ];
        if (String(this.businessId || '') === this.spranzaBusinessId) {
            base.splice(base.length - 1, 0,
                { icon: '🏬', name: 'Branches', link: '/modules/distributor/web/branches.html' },
                { icon: '🔁', name: 'Stock Transfers', link: '/modules/distributor/web/branches.html#transfers' },
                { icon: '📊', name: 'Branch Reports', link: '/modules/distributor/web/branches.html#reports' }
            );
        }
        if (this.isBdkAccountingTenant()) {
            base.splice(base.length - 1, 0, { icon: '📊', name: 'Accounting', link: '/modules/distributor/web/accounting.html' });
        }
        if (this.isWarehouseDisabledForCurrentTenant()) {
            return base.filter((item) => item.link !== '/modules/distributor/web/warehouse.html');
        }
        if (this.isCommissionPilotEnabled()) {
            base.splice(base.length - 1, 0,
                { icon: '🏦', name: 'Cheques', link: '/modules/distributor/web/cheques.html' },
                { icon: '📉', name: 'Credit Aging', link: '/modules/distributor/web/credit-aging.html' },
                { icon: '⚙️', name: 'Commission Config', link: '/modules/distributor/web/commission-config.html' },
                { icon: '💸', name: 'Rep Commission', link: '/modules/distributor/web/rep-commission-report.html' }
            );
        }
        return base;
    }

    buildDistributorMenusForCurrentRole() {
        const perms = this.getDistributorPermissionProfile();
        let tail = this.getSharedCrosscutMenus().filter((m) => {
            if (m.name === 'Accounting') return !!perms.canViewAccounting;
            if (m.name === 'Reports') return !!perms.canViewReportsFull;
            if (m.name === 'Finance') return !!perms.canViewFinancialsProfit;
            return true;
        });
        let menus = this.getDistributorWebMenuBase().filter((m) => {
            if (m.name === 'Finance') return !!perms.canViewFinancialsProfit;
            // Any distributor staff with stock visibility can open HQ orders; workflow buttons stay RBAC-gated on the page.
            if (m.name === 'Orders') return !!(perms.canStockView || perms.canInvoiceCreateEdit);
            if (m.name === 'New sales order') return !!perms.canInvoiceCreateEdit;
            if (m.name === 'Reps') return !!perms.canManageRepsWeb;
            return true;
        });
        if (this.isStrictMwTradingBusiness()) {
            const blockedLinks = new Set([
                '/modules/distributor/web/invoices.html',
                '/modules/distributor/web/warehouse.html',
                '/modules/distributor/web/deliveries.html',
                '/modules/distributor/web/commission-config.html',
                '/modules/distributor/web/reports.html',
                '/modules/core/finance-ledger.html'
            ]);
            menus = menus.filter((m) => !blockedLinks.has(String((m && m.link) || '')));
            tail = tail.filter((m) => String((m && m.link) || '') !== '/modules/core/finance-ledger.html');
        }
        return this.assembleSidebarMenus(menus, tail);
    }

    isScrapMasterOwner() {
        return this.currentUserId === this.scrapOwnerUid;
    }

    isScrapSuiteContext() {
        return this.isScrapMasterOwner() && this.isAdminRole() && this.businessType === 'scrap_collection_center';
    }

    getDashboardMenu() {
        return [{ icon: '📊', name: 'Dashboard', link: '/modules/core/dashboard.html' }];
    }

    /** Customers + Accounting + Reports — always last block after business-specific links. */
    getSharedCrosscutMenus() {
        const accountingLink = this.isBdkAccountingTenant()
            ? '/modules/distributor/web/accounting.html'
            : '/modules/accounts/advanced-accounting-dashboard.html';
        const menus = [
            { icon: '👥', name: 'Customers', link: '/modules/core/customers.html' },
            { icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
            { icon: '📁', name: 'Accounting', link: accountingLink },
            { icon: '📈', name: 'Reports', link: '/modules/reports/index.html' }
        ];
        if (this.isSuperAdminUser()) {
            menus.splice(1, 0, { icon: '💸', name: 'Loans', link: '/modules/core/loans.html' });
        }
        return menus;
    }

    getSharedModuleMenus() {
        return [...this.getDashboardMenu(), ...this.getSharedCrosscutMenus()];
    }

    /**
     * Order: Dashboard → coreMenus → tail (default: Customers, Accounting, Reports).
     * Drops duplicates from core that match dashboard or any tail item (same name+link).
     */
    assembleSidebarMenus(coreMenus, tailMenus) {
        const tail = Array.isArray(tailMenus) && tailMenus.length ? tailMenus : this.getSharedCrosscutMenus();
        const key = (m) => `${m.name}|${m.link}`;
        const tailKeys = new Set(tail.map(key));
        const dash = this.getDashboardMenu();
        const dashKeys = new Set(dash.map(key));
        const core = (coreMenus || []).filter((m) => !tailKeys.has(key(m)) && !dashKeys.has(key(m)));
        return [...dash, ...core, ...tail];
    }

    /**
     * Keep only first occurrence of exact same menu (name+link).
     * This removes accidental duplicate blocks while preserving top-first order.
     */
    dedupeMenus(menuItems) {
        const seen = new Set();
        const seenLinks = new Set();
        const out = [];
        (menuItems || []).forEach((m) => {
            const k = `${String((m && m.name) || '')}|${String((m && m.link) || '')}`;
            if (seen.has(k)) return;
            // KUBUKA manufacturer: keep only first menu per canonical link (prevents duplicate Raw Materials/inbound entry).
            if (this.businessId === this.kduTeaBusinessId) {
                const canonicalLink = String((m && m.link) || '').split('?')[0].replace(/\/+$/, '');
                if (canonicalLink) {
                    if (seenLinks.has(canonicalLink)) return;
                    seenLinks.add(canonicalLink);
                }
            }
            seen.add(k);
            out.push(m);
        });
        return out;
    }

    getMenus() {
        const pathLower = String(window.location.pathname || '').toLowerCase();
        const onManufacturerModule = pathLower.includes('/modules/manufacturer/');
        const normalizedBusinessType = this.normalizeBusinessType(this.businessType || '');
        const menuBusinessType = (onManufacturerModule && this.businessType !== 'scrap_collection_center')
            ? 'manufacturer'
            : normalizedBusinessType;

        if (this.isScrapSuiteContext()) {
            const scrapCore = [
                { icon: '🧾', name: 'BILL', link: '/modules/admin/scrap-buying.html' },
                { icon: '📈', name: 'REVENUE', link: '/modules/admin/scrap-revenue.html' },
                { icon: '📉', name: 'EXPENSES', link: '/modules/admin/scrap-expenses.html' },
                { icon: '💸', name: 'SELL', link: '/modules/admin/scrap-sell.html' },
                { icon: '📲', name: 'Scrap SMS', link: '/modules/admin/scrap-sms-settings.html' },
                { icon: '📦', name: 'STOCK', link: '/modules/admin/scrap-workbench.html?view=STOCK' },
                { icon: '📚', name: 'BUY', link: '/modules/admin/scrap-workbench.html?view=BUY' },
                { icon: '📜', name: 'HISTORY', link: '/modules/admin/scrap-selling-history.html' },
                { icon: '🏦', name: 'ADVANCE', link: '/modules/admin/scrap-advance.html' },
                { icon: '📘', name: 'DAILYTR', link: '/modules/admin/scrap-workbench.html?view=DAILYTR' }
            ];
            return this.assembleSidebarMenus(scrapCore);
        }

        if (this.isRepRole()) {
            const repMenus = [
                ...this.getDashboardMenu(),
                { icon: '🛒', name: 'New sales order', link: '/modules/distributor/web/new-order.html' },
                { icon: '🏪', name: 'Shops', link: '/modules/distributor/web/my-shops.html' },
                { icon: '📦', name: 'Products', link: '/modules/distributor/web/products.html' },
                { icon: '📜', name: 'Order history', link: '/modules/distributor/mobile/history.html' },
                { icon: '📑', name: 'HQ orders', link: '/modules/distributor/web/index.html?tab=pending' }
            ];
            if (this.isCommissionPilotEnabled()) {
                repMenus.push(
                    { icon: '🏦', name: 'Cheques', link: '/modules/distributor/web/cheques.html' },
                    { icon: '📉', name: 'Credit Aging', link: '/modules/distributor/web/credit-aging.html' },
                    { icon: '💸', name: 'Rep Commission', link: '/modules/distributor/web/rep-commission-report.html' }
                );
            }
            return repMenus;
        }

        if (!onManufacturerModule && ((this.isMwTradingContext() || this.isSpranzaContext()) || normalizedBusinessType === 'distributor')) {
            return this.buildDistributorMenusForCurrentRole();
        }

        let menus;
        if (menuBusinessType === 'pharmacy') {
            menus = [
                { icon: '🛒', name: 'Point of Sale', link: '/modules/pharmacy/pos.html' },
                { icon: '💊', name: 'Inventory', link: '/modules/pharmacy/inventory.html' }
            ];
        } else if (menuBusinessType === 'hardware') {
            menus = [
                { icon: '🧾', name: 'POS / Quotation', link: '/modules/hardware/pos.html' },
                { icon: '🔧', name: 'Inventory', link: '/modules/hardware/inventory.html' }
            ];
        } else if (menuBusinessType === 'manufacturer') {
            if (this.businessId === this.kduTeaBusinessId) {
                const roleNorm = String(this.businessNavRole || this.currentRole || '')
                    .trim()
                    .toUpperCase()
                    .replace(/\s+/g, '_');
                if (this.isKdkumbukaTenant() && roleNorm === 'TEA_LEAFER') {
                    menus = [{ icon: '🧱', name: 'Raw Materials', link: '/modules/manufacturer/inbound.html' }];
                } else if (this.isKdkumbukaTenant()) {
                    menus = [
                        { icon: '📊', name: 'Dashboard', link: '/modules/core/dashboard.html' },
                        { icon: '🧱', name: 'Raw Materials', link: '/modules/manufacturer/inbound.html' },
                        { icon: '📦', name: 'Inventory', link: '/modules/retail/inventory.html' },
                        { icon: '🛒', name: 'Point of Sale', link: '/modules/retail/pos.html' },
                        { icon: '🧾', name: 'Expenses', link: '/modules/retail/expenses.html' },
                        { icon: '📁', name: 'Accounting Dashboard', link: '/modules/accounts/advanced-accounting-dashboard.html' },
                        { icon: '👥', name: 'Customers', link: '/modules/core/customers.html' },
                        { icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
                        { icon: '📈', name: 'Reports', link: '/modules/reports/index.html' }
                    ];
                } else {
                    menus = [
                        { icon: '🧱', name: 'Raw Materials', link: '/modules/manufacturer/inbound.html' },
                        { icon: '🛍️', name: 'Sales', link: '/modules/manufacturer/sales.html' },
                        { icon: '🏭', name: 'Products', link: '/modules/manufacturer/outbound.html' },
                        { icon: '📦', name: 'Finished Goods', link: '/modules/manufacturer/stock.html' },
                        { icon: '🧪', name: 'Quality Control', link: '/modules/manufacturer/stock.html' },
                        { icon: '🧾', name: 'Expenses', link: '/modules/manufacturer/expenses.html' },
                        { icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
                        { icon: '📚', name: 'History', link: '/modules/manufacturer/history.html' }
                    ];
                }
            } else {
                menus = [
                    { icon: '🧱', name: 'Raw Materials', link: '/modules/manufacturer/inbound.html' },
                    { icon: '🛍️', name: 'Sales', link: '/modules/manufacturer/sales.html' },
                    { icon: '🏭', name: 'Production / Manufacturing', link: '/modules/manufacturer/outbound.html' },
                    { icon: '📦', name: 'Finished Goods', link: '/modules/manufacturer/stock.html' },
                    { icon: '🧪', name: 'Quality Control', link: '/modules/manufacturer/stock.html' },
                    { icon: '🚛', name: 'Supplier Management', link: '/modules/manufacturer/inbound.html' },
                    { icon: '🧾', name: 'Expenses', link: '/modules/manufacturer/expenses.html' },
                    { icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
                    { icon: '📚', name: 'History', link: '/modules/manufacturer/history.html' }
                ];
            }
        } else {
            menus = [
                { icon: '🛒', name: 'Point of Sale', link: '/modules/retail/pos.html' },
                { icon: '📦', name: 'Inventory', link: '/modules/retail/inventory.html' },
                { icon: '📥', name: 'Purchases', link: '/modules/retail/purchases.html' }
            ];
        }
        const isKduManufacturer = menuBusinessType === 'manufacturer' && this.businessId === this.kduTeaBusinessId;
        if (isKduManufacturer) {
            const roleNorm = String(this.businessNavRole || this.currentRole || '')
                .trim()
                .toUpperCase()
                .replace(/\s+/g, '_');
            if (roleNorm !== 'TEA_LEAFER') {
                menus = this.dedupeMenus(menus);
            }
        } else {
            menus = this.assembleSidebarMenus(menus);
        }

        if (this.isSuperAdminUser()) {
            menus.push(
                { icon: '👑', name: 'Super Admin', link: '/admin/super-dashboard.html' },
                { icon: '👥', name: 'User Management', link: '/admin/super-dashboard.html#tab-users' }
            );
        }

        // Final KUBUKA hard guard: never show supplier menu entries.
        if (this.businessId === this.kduTeaBusinessId) {
            menus = (menus || []).filter((m) => {
                const text = String((m && (m.text || m.name)) || '').toLowerCase();
                const link = String((m && m.link) || '').toLowerCase();
                if (text.includes('supplier')) return false;
                if (link.includes('supplier')) return false;
                return true;
            });
        }
        return this.dedupeMenus(menus);
    }

    isMenuActive(link, pathname) {
        if (!link) return false;
        const [linkNoHash] = link.split('#');
        const [linkPathRaw, linkQueryRaw = ''] = linkNoHash.split('?');
        const cleanLink = (linkPathRaw || '').replace(/\/+$/, '');
        const cleanPath = (pathname || '').split('#')[0].split('?')[0].replace(/\/+$/, '');
        const currentQuery = window.location.search || '';
        const linkQuery = linkQueryRaw ? `?${linkQueryRaw}` : '';
        if (linkQuery && cleanPath === cleanLink) {
            return currentQuery === linkQuery;
        }
        let tab = '';
        try {
            tab = new URLSearchParams(window.location.search).get('tab') || '';
        } catch (e) {
            tab = '';
        }
        const distributorOrderStatusPath = '/modules/distributor/web/index.html';
        if (cleanLink.split('?')[0].replace(/\/+$/, '') === distributorOrderStatusPath) {
            if (cleanPath.endsWith(distributorOrderStatusPath)) return true;
            return false;
        }
        if (cleanLink.includes('/modules/distributor/web/pending-orders.html')) {
            if (cleanPath.endsWith('pending-orders.html')) return true;
            if (cleanPath.endsWith(distributorOrderStatusPath) && tab === 'pending') return true;
            return false;
        }
        if (cleanLink.includes('/modules/distributor/web/orders.html')) {
            if (cleanPath.endsWith('orders.html')) return true;
            if (cleanPath.endsWith(distributorOrderStatusPath) && ['approved', 'dispatched', 'rejected', 'delivered', 'all'].includes(tab)) {
                return true;
            }
            return false;
        }
        if (cleanLink.includes('/modules/distributor/web/new-order.html')) {
            return cleanPath.endsWith('new-order.html');
        }
        if (cleanLink.includes('/modules/admin/scrap-sms-settings.html')) {
            return cleanPath.endsWith('scrap-sms-settings.html');
        }
        if (cleanPath === cleanLink) return true;
        if (cleanLink.endsWith('/index.html')) {
            const linkDir = cleanLink.replace(/\/index\.html$/, '');
            return cleanPath === linkDir;
        }
        return cleanPath.startsWith(`${cleanLink}/`);
    }

    formatBusinessName(name) {
        return String(name || '').trim().toUpperCase();
    }

    renderBusinessName(name) {
        const businessNameUpper = this.formatBusinessName(name);
        const sidebarBizEl = document.getElementById('sidebarBusinessName');
        if (sidebarBizEl) {
            sidebarBizEl.textContent = businessNameUpper;
            sidebarBizEl.title = businessNameUpper;
        }
        const mobileBizEl = document.getElementById('digibizMobileBusinessName');
        if (mobileBizEl) {
            mobileBizEl.textContent = businessNameUpper;
            mobileBizEl.title = businessNameUpper;
        }
        this.renderBusinessLogo();
    }

    renderBusinessLogo() {
        const url = String(this.businessLogoUrl || '').trim();
        const img = document.getElementById('sidebarBusinessLogoImg');
        const icon = document.getElementById('sidebarBusinessLogoIcon');
        const mimg = document.getElementById('digibizMobileBusinessLogoImg');
        if (img) {
            if (url) {
                img.src = url;
                img.alt = 'Business logo';
                img.classList.add('is-visible');
            } else {
                img.removeAttribute('src');
                img.alt = '';
                img.classList.remove('is-visible');
            }
        }
        if (icon) {
            if (url) icon.classList.remove('is-visible');
            else icon.classList.add('is-visible');
        }
        if (mimg) {
            if (url) {
                mimg.src = url;
                mimg.alt = 'Business logo';
                mimg.classList.add('is-visible');
            } else {
                mimg.removeAttribute('src');
                mimg.alt = '';
                mimg.classList.remove('is-visible');
            }
        }
    }

    async refreshBusinessNameFromProfile() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            this.ownerName = String(userData.ownerName || userData.name || this.ownerName || '').trim();
            const resolvedBusinessId = userData.businessId || this.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || user.uid;
            let resolvedName = '';
            if (resolvedBusinessId) {
                const businessDoc = await db.collection('businesses').doc(resolvedBusinessId).get();
                if (businessDoc.exists) {
                    const bd = businessDoc.data() || {};
                    resolvedName = String(bd.name || '').trim();
                    if (bd.ownerName) this.ownerName = String(bd.ownerName || '').trim();
                    const logo = String(bd.logoUrl || '').trim();
                    this.businessLogoUrl = logo;
                    try {
                        if (logo) {
                            localStorage.setItem('digibizBusinessLogoUrl', logo);
                            sessionStorage.setItem('digibizBusinessLogoUrl', logo);
                        } else {
                            localStorage.removeItem('digibizBusinessLogoUrl');
                            sessionStorage.removeItem('digibizBusinessLogoUrl');
                        }
                    } catch (e) { /* ignore */ }
                }
            }
            if (!resolvedName) {
                resolvedName = String(this.businessName || '').trim();
            }
            this.businessId = resolvedBusinessId;
            this.businessName = resolvedName;
            const ownerEl = document.getElementById('sidebarUserName');
            if (ownerEl) ownerEl.textContent = this.ownerName;
            this.renderBusinessName(resolvedName);
            this.renderBusinessLogo();
        } catch (error) {
            console.warn('Business name refresh failed:', error?.message || error);
            this.renderBusinessName(this.businessName || '');
            this.renderBusinessLogo();
        }
    }

    render() {
        ensureSidebarStyles();
        const pathname = window.location.pathname;
        const settingsItemsBase = [
            { icon: '🏢', name: 'Business Profile', link: '/modules/company/profile.html' },
            { icon: '👥', name: 'Staff', link: '/modules/company/staff.html' },
            { icon: '🔐', name: 'Change Password', link: '/modules/core/change-password.html' },
            { icon: '⚙️', name: 'Settings', link: '/modules/company/settings.html' },
            { icon: '📲', name: 'SMS Settings', link: '/modules/company/sms-settings.html' },
            { icon: '🧾', name: 'SMS Log', link: '/modules/company/sms-log.html' },
            { icon: '💳', name: 'Billing & Charges', link: '/modules/core/billing.html' }
        ];
        let settingsItems = this.isRepRole() ? [] : settingsItemsBase.slice();
        if (this.businessType === 'distributor' && window.DigibizDistributorPermissions && !this.isRepRole()) {
            const p = window.DigibizDistributorPermissions.permissionsForRole(this.businessNavRole || this.currentRole || '');
            const rb = p.roleBand;
            const smsLogOk = rb === 'OWNER' || rb === 'SALES_COORDINATOR' || rb === 'AREA_MANAGER';
            settingsItems = settingsItems.filter((item) => {
                if (item.name === 'Business Profile') return !!p.canBusinessInfoEdit;
                if (item.name === 'Staff') return !!p.canStaffMutate;
                if (item.name === 'Settings') return !!p.canSettingsChange;
                if (item.name === 'SMS Settings') return !!p.canSettingsChange;
                if (item.name === 'SMS Log') return smsLogOk;
                if (item.name === 'Billing & Charges') return !!p.canViewFinancialsProfit;
                return true;
            });
        }
        const settingsActive = settingsItems.some((item) => this.isMenuActive(item.link, pathname));
        const loanItems = [
            { icon: '🏠', name: 'Loan Hub', link: '/modules/core/loans.html' },
            { icon: '🤝', name: 'Hand Loans', link: '/modules/core/hand-loans.html' },
            { icon: '🟢', name: 'No-interest Loan', link: '/modules/core/loan-no-interest.html' },
            { icon: '📈', name: 'Interest Loan (10%)', link: '/modules/core/loan-interest.html' },
            { icon: '🏦', name: 'Advanced Loan', link: '/modules/core/loan-advanced-investor.html' },
            { icon: '👤', name: 'Investor', link: '/modules/core/investor.html' }
        ];
        const loansActive = loanItems.some((item) => this.isMenuActive(item.link, pathname));
        const menuItems = this.getMenus().filter((item) => !['Super Admin', 'User Management', 'Loans'].includes(item.name));
        const html = `
            <div class="retail-navbar digibiz-sidebar">
                <div>
                    <div id="sidebarTrialBanner" style="display:none;" class="trial-sidebar-banner">TRIAL MODE ACTIVE</div>
                    <div class="sidebar-header">
                        <div class="logo">DIGIBIZ<span>™</span></div>
                        <div class="sidebar-business-logo-wrap">
                            <img id="sidebarBusinessLogoImg" class="sidebar-business-logo-img" alt="" decoding="async" />
                            <span id="sidebarBusinessLogoIcon" class="sidebar-business-logo-icon is-visible" aria-hidden="true">🏢</span>
                        </div>
                        <div class="sidebar-business-name biz-name" id="sidebarBusinessName"></div>
                        <div class="user-info-sidebar">
                            <span class="user-avatar-sidebar">👤</span>
                            <div>
                                <div class="user-name-sidebar" id="sidebarUserName">Loading...</div>
                                <div class="user-role-sidebar" id="sidebarUserRole">USER</div>
                                <div class="sidebar-subscription-status" id="sidebarSubscriptionStatus">Checking plan...</div>
                            </div>
                        </div>
                    </div>
                    <div class="nav-links" id="sidebarNavLinks">
                        ${menuItems.map((item) => `<a href="${item.link}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(item.link, pathname) ? 'active' : ''}"><span class="menu-icon">${item.icon}</span><span>${item.name}</span></a>`).join('')}
                        ${this.isSuperAdminUser() ? `<div class="menu-dropdown ${loansActive ? 'open' : ''}" id="loansDropdown">
                            <button type="button" class="menu-dropdown-toggle ${loansActive ? 'active' : ''}" id="loansDropdownToggle">
                                <span><span class="menu-icon">💸</span><span>Loans</span></span><span>${loansActive ? '▾' : '▸'}</span>
                            </button>
                            <div class="menu-dropdown-items">
                                ${loanItems.map((item) => `<a href="${item.link}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(item.link, pathname) ? 'active' : ''}"><span class="menu-icon">${item.icon}</span><span>${item.name}</span></a>`).join('')}
                            </div>
                        </div>` : ''}
                        ${settingsItems.length ? `<div class="menu-dropdown ${settingsActive ? 'open' : ''}" id="settingsDropdown">
                            <button type="button" class="menu-dropdown-toggle ${settingsActive ? 'active' : ''}" id="settingsDropdownToggle">
                                <span><span class="menu-icon">⚙️</span><span>Settings</span></span><span>${settingsActive ? '▾' : '▸'}</span>
                            </button>
                            <div class="menu-dropdown-items">
                                ${settingsItems.map((item) => `<a href="${item.link}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(item.link, pathname) ? 'active' : ''}"><span class="menu-icon">${item.icon}</span><span>${item.name}</span></a>`).join('')}
                            </div>
                        </div>` : ''}
                        ${this.isSuperAdminUser() ? `<div class="menu-section-label">Super Admin</div>
                        <a href="/admin/super-dashboard.html" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${pathname === '/admin/super-dashboard.html' ? 'active' : ''}"><span class="menu-icon">👑</span><span>Super Admin</span></a>
                        <a href="/admin/super-dashboard.html#tab-users" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item"><span class="menu-icon">👥</span><span>User Management</span></a>` : ''}
                    </div>
                </div>
                <div class="sidebar-footer">
                    <button class="logout-sidebar-btn" id="sidebarLogoutBtn">Logout</button>
                </div>
            </div>
        `;

        document.querySelectorAll('.retail-navbar').forEach((el) => el.remove());
        const mountPoint = document.getElementById('sidebar-container');
        if (mountPoint) {
            mountPoint.innerHTML = '';
            mountPoint.innerHTML = html;
        } else {
            document.body.insertAdjacentHTML('afterbegin', html);
        }
        this.updateUserInfo();
    }

    updateUserInfo() {
        const user = firebase.auth().currentUser;
        const nameEl = document.getElementById('sidebarUserName');
        const roleEl = document.getElementById('sidebarUserRole');
        if (nameEl) nameEl.textContent = '';
        if (nameEl && this.ownerName) nameEl.textContent = this.ownerName;
        this.renderBusinessName('');
        this.refreshBusinessNameFromProfile();
        if (roleEl) {
            const role = String(this.currentRole || 'USER').replace(/_/g, ' ');
            roleEl.textContent = role;
        }
        const subEl = document.getElementById('sidebarSubscriptionStatus');
        if (subEl) {
            const text = this.subscriptionState ? this.subscriptionState.statusText : 'Free';
            subEl.textContent = text;
            if (this.manufacturerDueAlert) {
                const extra = document.createElement('div');
                extra.style.fontSize = '11px';
                extra.style.marginTop = '4px';
                extra.style.color = this.manufacturerDueAlert.overdue > 0 ? '#fecaca' : '#fde68a';
                extra.textContent = `Due alerts: ${this.manufacturerDueAlert.pendingCount} pending, ${this.manufacturerDueAlert.overdue} overdue`;
                subEl.appendChild(extra);
            }
            if (this.smsLowBalanceAlert) {
                const low = document.createElement('div');
                low.style.fontSize = '11px';
                low.style.marginTop = '4px';
                low.style.color = '#fecaca';
                low.textContent = `Low SMS balance: ${this.smsLowBalanceAlert.bal} left`;
                subEl.appendChild(low);
            }
        }
    }

    attachEvents() {
        const logoutBtn = document.getElementById('sidebarLogoutBtn');
        if (!logoutBtn) return;
        logoutBtn.onclick = () => {
            firebase.auth().signOut().then(() => {
                window.location.href = '/index.html';
            });
        };
        const nav = document.getElementById('sidebarNavLinks');
        if (nav) {
            const loanToggle = document.getElementById('loansDropdownToggle');
            const loanDd = document.getElementById('loansDropdown');
            if (loanToggle && loanDd) {
                loanToggle.addEventListener('click', () => {
                    loanDd.classList.toggle('open');
                    const marker = loanToggle.querySelector('span:last-child');
                    if (marker) marker.textContent = loanDd.classList.contains('open') ? '▾' : '▸';
                });
            }
            const ddToggle = document.getElementById('settingsDropdownToggle');
            const dd = document.getElementById('settingsDropdown');
            if (ddToggle && dd) {
                ddToggle.addEventListener('click', () => {
                    dd.classList.toggle('open');
                    const marker = ddToggle.querySelector('span:last-child');
                    if (marker) marker.textContent = dd.classList.contains('open') ? '▾' : '▸';
                });
            }
            nav.querySelectorAll('a.menu-item').forEach((link) => {
                link.addEventListener('click', () => {
                    closeMobileSidebar();
                });
            });
        }
        if (!window.__DIGIBIZ_PROFILE_SYNC_BOUND__) {
            const refreshSidebar = () => this.refreshBusinessNameFromProfile();
            window.addEventListener('digibiz-profile-updated', refreshSidebar);
            if (window.eventBus && typeof window.eventBus.subscribe === 'function') {
                window.eventBus.subscribe('BUSINESS_UPDATED', refreshSidebar);
            }
            window.__DIGIBIZ_PROFILE_SYNC_BOUND__ = true;
        }
    }
}

function bootstrapSidebarImmediate() {
    if (window.__DIGIBIZ_SIDEBAR_BOOTSTRAPPED__) return;
    if (!SHOULD_RESERVE_SIDEBAR_SPACE) return;
    if (!document.body) {
        // Do not wait for full DOMContentLoaded; start as soon as body exists.
        setTimeout(bootstrapSidebarImmediate, 0);
        return;
    }
    window.__DIGIBIZ_SIDEBAR_BOOTSTRAPPED__ = true;
    ensureMobileSidebarControls();
    preReserveSidebarSpace();
    window.sidebar = new Sidebar();
}

// Primary path: run immediately at script evaluation time.
bootstrapSidebarImmediate();
// Safety fallback for unusual parser timing.
document.addEventListener('DOMContentLoaded', bootstrapSidebarImmediate);

console.log('✅ Sidebar Component Initialized - Retail Navbar');