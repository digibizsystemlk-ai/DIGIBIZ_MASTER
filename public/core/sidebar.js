// Dynamic Sidebar Component - Retail Navbar Layout

const SIDEBAR_WIDTH = 260;
/** Only the marketing root should skip the app sidebar — not module pages named index.html */
const SHOULD_RESERVE_SIDEBAR_SPACE = (() => {
    const raw = (window.location.pathname || '').split('?')[0];
    const p = raw.replace(/\/+$/, '') || '/';
    return p !== '/' && p !== '/index.html';
})();

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
        html.digibiz-sidebar-reserved body{margin-left:${SIDEBAR_WIDTH}px;transition:margin-left .2s ease;}
        .retail-navbar{position:fixed;left:0;top:0;width:${SIDEBAR_WIDTH}px;height:100vh;background:linear-gradient(135deg,#0a2a44 0%,#1e3c72 100%);color:#fff;z-index:9999 !important;overflow-y:auto;display:flex;flex-direction:column;justify-content:space-between;font-family:'Inter',sans-serif;pointer-events:auto;}
        .retail-navbar *{pointer-events:auto;}
        .digibiz-mobile-menu-toggle{position:fixed;top:15px;left:15px;z-index:10001;width:46px;height:46px;border:none;border-radius:12px;background:rgba(15,59,44,.95);color:#fff;display:none;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(0,0,0,.35);cursor:pointer;font-size:20px;padding:0;margin:0;backdrop-filter:blur(2px);}
        .digibiz-mobile-topbar{position:fixed;top:15px;left:70px;right:15px;height:46px;background:rgba(10,42,68,.96);border-radius:12px;z-index:10000;display:none;align-items:center;padding:0 12px;box-shadow:0 10px 24px rgba(0,0,0,.28);}
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
        .logo{font-size:24px;font-weight:700;text-align:center;margin-bottom:20px;}
        .logo span{color:#ffd966;}
        .sidebar-business-name{font-size:13px;font-weight:800;text-align:center;color:#e5f3ff;margin:-12px 0 14px;text-transform:uppercase !important;letter-spacing:.4px;min-height:18px;display:block !important;visibility:visible !important;}
        .user-info-sidebar{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.1);padding:12px 14px;border-radius:12px;}
        .user-avatar-sidebar{font-size:30px;}
        .user-name-sidebar{font-size:14px;font-weight:600;}
        .user-role-sidebar{font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(0,0,0,.3);display:inline-block;}
        .sidebar-subscription-status{margin-top:8px;font-size:11px;color:#fde68a;}
        .nav-links{flex:1;padding:16px 0;}
        .menu-section-label{padding:8px 24px;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.6);font-weight:700;}
        .menu-item{padding:12px 24px;display:flex;align-items:center;gap:14px;color:rgba(255,255,255,.85);text-decoration:none;font-size:14px;transition:all .2s;}
        .menu-item:hover,.menu-item.active{background:rgba(255,255,255,.12);color:#ffd966;border-left:3px solid #ffd966;}
        .menu-icon{width:22px;text-align:center;}
        .sidebar-footer{padding:20px;}
        .logout-sidebar-btn{background:rgba(220,38,38,.8);border:none;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;width:100%;font-size:14px;}
        .logout-sidebar-btn:hover{background:#dc2626;}
        @media (max-width:768px){html.digibiz-sidebar-reserved body{margin-left:0;}html.digibiz-mobile-toggle-space body{padding-top:72px;} .digibiz-mobile-menu-toggle{display:flex;} .digibiz-mobile-topbar{display:flex;} .retail-navbar{transform:translateX(-100%);transition:transform .2s ease;} .retail-navbar .sidebar-business-name{display:block !important;visibility:hidden !important;} html.digibiz-sidebar-open .retail-navbar{transform:translateX(0);}}
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
    if (!document.querySelector('.retail-navbar.sidebar-skeleton')) {
        document.body.insertAdjacentHTML('afterbegin', `
            <div class="retail-navbar sidebar-skeleton">
                <div class="sidebar-header">
                    <div class="logo">DIGIBIZ<span>™</span></div>
                    <div class="sidebar-business-name biz-name" id="sidebarBusinessName"></div>
                    <div class="user-info-sidebar">
                        <span class="user-avatar-sidebar">👤</span>
                        <div>
                            <div class="user-name-sidebar">Loading...</div>
                            <div class="user-role-sidebar">USER</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
}

class Sidebar {
    constructor() {
        preReserveSidebarSpace();
        this.init();
    }

    async init() {
        await ensureSubscriptionManagerLoaded();
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user && SHOULD_RESERVE_SIDEBAR_SPACE) {
                await this.loadUserData(user.uid);
                this.subscriptionState = window.subscriptionManager
                    ? await window.subscriptionManager.initializeForUser(user, this.currentRole, this.businessId || user.uid)
                    : null;
                this.render();
                this.attachEvents();
            }
        });
    }

    async loadUserData(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            this.currentRole = userDoc.exists ? userDoc.data().role : 'VIEWER';
            this.ownerName = userDoc.exists ? (userDoc.data().ownerName || userDoc.data().name || '') : '';
            this.businessId = userDoc.exists ? (userDoc.data().businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId')) : null;
            if (this.businessId) {
                const businessDoc = await db.collection('businesses').doc(this.businessId).get();
                this.businessType = businessDoc.exists ? (businessDoc.data().businessType || localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || 'retail') : (localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || 'retail');
                this.businessName = businessDoc.exists ? businessDoc.data().name : 'My Business';
                if (businessDoc.exists && businessDoc.data().ownerName) this.ownerName = businessDoc.data().ownerName;
            } else {
                this.businessType = localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || 'retail';
                this.businessName = 'No Business Connected';
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.currentRole = 'VIEWER';
            this.ownerName = '';
            this.businessType = localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || 'retail';
            this.businessName = 'No Business Connected';
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
    }

    isAdminRole() {
        return ['SUPER_ADMIN', 'ADMIN'].includes(this.currentRole) || String(this.currentRole || '').includes('ADMIN');
    }

    isRepRole() {
        return String(this.currentRole || '').toUpperCase() === 'REP';
    }

    showsDistributorOwnerOrderLinks() {
        const r = String(this.businessNavRole || this.currentRole || '').toUpperCase();
        return r === 'BUSINESS_OWNER' || r === 'DISTRIBUTOR_OWNER';
    }

    getMenus() {
        if (this.isRepRole()) {
            return [
                { icon: '📝', name: 'Rep Order Form', link: '/modules/distributor/mobile/order.html' }
            ];
        }

        let menus;
        if (this.businessType === 'distributor') {
            menus = [
                { icon: '📊', name: 'Dashboard', link: '/modules/core/dashboard.html' }
            ];
            if (this.showsDistributorOwnerOrderLinks()) {
                menus.push(
                    { icon: '📑', name: 'Order Status', link: '/modules/distributor/web/index.html?tab=pending' }
                );
            }
            menus.push(
                { icon: '👥', name: 'Reps', link: '/modules/distributor/web/reps.html' },
                { icon: '📦', name: 'Products', link: '/modules/distributor/web/products.html' },
                { icon: '🏭', name: 'Warehouse', link: '/modules/distributor/web/warehouse.html' },
                { icon: '🚚', name: 'Deliveries', link: '/modules/distributor/web/deliveries.html' },
                { icon: '📈', name: 'Reports', link: '/modules/distributor/web/reports.html' },
                { icon: '🎁', name: 'Free issues log', link: '/modules/distributor/web/free-items.html' },
                { icon: '🔄', name: 'Returns log', link: '/modules/distributor/web/returns.html' }
            );
        } else if (this.businessType === 'pharmacy') {
            menus = [
                { icon: '📊', name: 'Dashboard', link: '/modules/core/dashboard.html' },
                { icon: '🛒', name: 'Point of Sale', link: '/modules/pharmacy/pos.html' },
                { icon: '💊', name: 'Inventory', link: '/modules/pharmacy/inventory.html' },
                { icon: '📈', name: 'Reports', link: '/modules/reports/index.html' }
            ];
        } else if (this.businessType === 'hardware') {
            menus = [
                { icon: '📊', name: 'Dashboard', link: '/modules/core/dashboard.html' },
                { icon: '🧾', name: 'POS / Quotation', link: '/modules/hardware/pos.html' },
                { icon: '🔧', name: 'Inventory', link: '/modules/hardware/inventory.html' },
                { icon: '📈', name: 'Reports', link: '/modules/reports/index.html' }
            ];
        } else {
            menus = [
                { icon: '📊', name: 'Dashboard', link: '/modules/core/dashboard.html' },
                { icon: '🛒', name: 'Point of Sale', link: '/modules/retail/pos.html' },
                { icon: '📦', name: 'Inventory', link: '/modules/retail/inventory.html' },
                { icon: '📥', name: 'Purchases', link: '/modules/retail/purchases.html' },
                { icon: '👥', name: 'Customers', link: '/modules/retail/customers.html' }
            ];
        }

        if (this.isAdminRole()) {
            menus.push(
                { icon: '👑', name: 'Admin Dashboard', link: '/admin/super-dashboard.html' },
                { icon: '👥', name: 'User Management', link: '/admin/super-dashboard.html#tab-users' }
            );
        }

        return menus;
    }

    isMenuActive(link, pathname) {
        if (!link) return false;
        const cleanLink = link.split('#')[0].replace(/\/+$/, '');
        const cleanPath = (pathname || '').split('#')[0].split('?')[0].replace(/\/+$/, '');
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
                    resolvedName = String(businessDoc.data().name || '').trim();
                    if (businessDoc.data().ownerName) this.ownerName = String(businessDoc.data().ownerName || '').trim();
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
        } catch (error) {
            console.warn('Business name refresh failed:', error?.message || error);
            this.renderBusinessName(this.businessName || '');
        }
    }

    render() {
        ensureSidebarStyles();
        const pathname = window.location.pathname;
        const html = `
            <div class="retail-navbar digibiz-sidebar">
                <div>
                    <div id="sidebarTrialBanner" style="display:none;" class="trial-sidebar-banner">TRIAL MODE ACTIVE</div>
                    <div class="sidebar-header">
                        <div class="logo">DIGIBIZ<span>™</span></div>
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
                        ${this.getMenus().filter((item) => !['Admin Dashboard', 'User Management'].includes(item.name)).map((item) => `<a href="${item.link}" class="menu-item ${this.isMenuActive(item.link, pathname) ? 'active' : ''}"><span class="menu-icon">${item.icon}</span><span>${item.name}</span></a>`).join('')}
                        ${this.isRepRole() ? '' : `
                        <a href="/modules/company/profile.html" class="menu-item ${this.isMenuActive('/modules/company/profile.html', pathname) ? 'active' : ''}"><span class="menu-icon">🏢</span><span>Business Profile</span></a>
                        <a href="/modules/company/staff.html" class="menu-item ${this.isMenuActive('/modules/company/staff.html', pathname) ? 'active' : ''}"><span class="menu-icon">👥</span><span>Staff</span></a>
                        <a href="/modules/accounts/advanced-accounting-dashboard.html" class="menu-item ${this.isMenuActive('/modules/accounts/advanced-accounting-dashboard.html', pathname) ? 'active' : ''}"><span class="menu-icon">📁</span><span>Accounting</span></a>
                        <a href="/modules/company/settings.html" class="menu-item ${this.isMenuActive('/modules/company/settings.html', pathname) ? 'active' : ''}"><span class="menu-icon">⚙️</span><span>Settings</span></a>
                        <a href="/modules/core/subscription.html" class="menu-item ${this.isMenuActive('/modules/core/subscription.html', pathname) ? 'active' : ''}"><span class="menu-icon">💳</span><span>Subscription</span></a>`}
                        ${this.isAdminRole() ? `<div class="menu-section-label">Admin Tools</div>
                        <a href="/admin/super-dashboard.html" class="menu-item ${pathname === '/admin/super-dashboard.html' ? 'active' : ''}"><span class="menu-icon">👑</span><span>Admin Dashboard</span></a>
                        <a href="/admin/super-dashboard.html#tab-users" class="menu-item"><span class="menu-icon">👥</span><span>User Management</span></a>` : ''}
                    </div>
                </div>
                <div class="sidebar-footer">
                    <button class="logout-sidebar-btn" id="sidebarLogoutBtn">Logout</button>
                </div>
            </div>
        `;

        const oldSidebar = document.querySelector('.retail-navbar');
        if (oldSidebar) oldSidebar.remove();
        const mountPoint = document.getElementById('sidebar-container');
        if (mountPoint) {
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
            nav.querySelectorAll('a.menu-item').forEach((link) => {
                link.addEventListener('click', () => {
                    closeMobileSidebar();
                });
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ensureMobileSidebarControls();
    preReserveSidebarSpace();
    if (SHOULD_RESERVE_SIDEBAR_SPACE) {
        window.sidebar = new Sidebar();
    }
});

console.log('✅ Sidebar Component Initialized - Retail Navbar');