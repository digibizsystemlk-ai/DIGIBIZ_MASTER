// Dynamic Sidebar Component - Retail Navbar Layout

// TWA (Android App) Environment Detection
if (window.location.search.includes('platform=android') || document.referrer.startsWith('android-app://') || sessionStorage.getItem('is_android_app') === 'true') {
    sessionStorage.setItem('is_android_app', 'true');
}

window.i18n = function(key) {
    const isApp = sessionStorage.getItem('is_android_app') === 'true';
    const lang = isApp ? 'en' : (localStorage.getItem('preferredLanguage') || 'en');
    const translations = {
        si: {
            "Dashboard": "Dashboard (ප්‍රධාන පුවරුව)",
            "Job Cards": "Job Cards (රැකියා කාඩ්පත්)",
            "Inspections": "Inspections (වාහන පරීක්ෂාවන්)",
            "Estimations": "Estimations (ඇස්තමේන්තු / මිල ගණන්)",
            "Invoicing": "Invoicing (ඉන්වොයිස්)",
            "Spare Parts Stock": "Spare Parts Stock (අමතර කොටස් තොගය)",
            "Customers & History": "Customers & History (පාරිභෝගිකයින් සහ සේවා ඉතිහාසය)",
            "SMS Alerts": "SMS Alerts (කෙටි පණිවිඩ සේවා)",
            "Point of Sale": "Point of Sale (විකුණුම් පර්යන්තය)",
            "Stock purchases": "Stock purchases (මිලදී ගැනීම්)",
            "Stock": "Stock (තොගය)",
            "Customers": "Customers (පාරිභෝගිකයින්)",
            "Finance": "Finance (මූල්‍ය)",
            "Accounting": "Accounting (ගිණුම්කරණය)",
            "Reports": "Reports (වාර්තා)",
            "Settings": "Settings (සැකසුම්)",
            "අපිට එන්න තියන ණය": "අපිට එන්න තියන ණය",
            "අපි ගෙවන්න තියන ණය": "අපි ගෙවන්න තියන ණය",
            
            // Receivables & Payables Pages
            "Receivables & Loans Given": "අපිට එන්න තියන ණය (Receivables & Loans Given)",
            "Payables & Loans Received": "අපි ගෙවන්න තියන ණය (Payables & Loans Received)",
            "Record Hand Loan Given": "අතමාරු ණයක් සටහන් කරන්න",
            "Record Hand Loan Received": "අතමාරු ණයක් ලබාගන්න",
            "Customer Outstandings": "මුළු පාරිභෝගික ණය (Customer Outstandings)",
            "Hand Loans Given": "මුළු අතමාරු ණය (Hand Loans Given)",
            "Total Receivables": "මුළු ලැබීමට ඇති ණය (Total Receivables)",
            "Supplier Outstandings": "සැපයුම්කරුවන්ගේ ණය (Supplier Outstandings)",
            "Hand Loans Received": "ලබාගත් අතමාරු ණය (Hand Loans Received)",
            "Total Payables": "මුළු ගෙවීමට ඇති ණය (Total Payables)",
            "Customer Debts Tab": "පාරිභෝගික ණය (Customer Debts)",
            "Hand Loans Given Tab": "අතමාරු ණය දීම් (Hand Loans Given)",
            "Supplier Debts Tab": "සැපයුම්කරුවන්ගේ ණය (Supplier Debts)",
            "Hand Loans Received Tab": "ලබාගත් අතමාරු ණය (Hand Loans Received)",
            "Customer Debts List Title": "පාරිභෝගික ණය ලැයිස්තුව",
            "Supplier Debts List Title": "සැපයුම්කරුවන්ගේ ණය ඇණවුම් ලැයිස්තුව",
            "Hand Loans Given List Title": "අප විසින් ලබා දුන් අතමාරු ණය ලැයිස්තුව",
            "Hand Loans Received List Title": "ලබාගත් අතමාරු ණය ලැයිස්තුව",
            
            // Tables
            "Invoice No": "Invoice No",
            "PO No": "PO No",
            "Customer Name": "පාරිභෝගිකයාගේ නම",
            "Supplier Name": "සැපයුම්කරුගේ නම",
            "Phone Number": "දුරකථන අංකය",
            "Total Amount": "මුළු මුදල",
            "Paid Amount": "ගෙවූ මුදල",
            "Outstanding": "ණය මුදල",
            "Due Date": "ගෙවිය යුතු දිනය",
            "Actions": "ක්‍රියාකාරකම්",
            "Date": "දිනය",
            "Person Name": "පුද්ගලයාගේ නම",
            "Description": "විස්තරය",
            "Amount": "මුදල",
            "Payment Method": "ගෙවීම් ක්‍රමය",
            "Status": "තත්ත්වය",
            "Receive Payment Button": "මුදල් ලබාගන්න",
            "Pay Supplier Button": "මුදල් ගෙවන්න",
            "Settle Loan Button": "ණය පියවන්න",
            
            // Modals
            "Receive Payment Modal Title": "මුදල් අයකර ගැනීම (Receive Payment)",
            "Pay Supplier Modal Title": "සැපයුම්කරුට මුදල් ගෙවීම (Pay Supplier)",
            "Add Hand Loan Given Title": "අතමාරු ණයක් සටහන් කිරීම (Add Hand Loan Given)",
            "Add Hand Loan Received Title": "අතමාරු ණයක් සටහන් කිරීම (Add Hand Loan Received)",
            "Outstanding Balance": "ණය මුදල (Outstanding Balance)",
            "Outstanding Amount": "ගෙවීමට ඇති මුදල (Outstanding Amount)",
            "Amount Received": "ලැබුණු මුදල (Amount Received)",
            "Amount Paid": "ගෙවන මුදල (Amount Paid)",
            "Person Name Label": "පුද්ගලයාගේ නම (Person Name)",
            "Amount Label": "මුදල (Amount Rs.)",
            "Date Label": "දිනය (Date)",
            "Payment Method Label": "ගෙවීම් ක්‍රමය (Payment Method)",
            "Description Label": "විස්තරය (Description)",
            "Cancel": "Cancel",
            "Save Payment": "Save Payment",
            "Settle Payment": "Settle Payment",
            "Confirm & Save": "Confirm & Save",
            
            // Statuses & Empty States
            "Unpaid Badge": "ණය පියවා නැත",
            "Paid Badge": "පියවා ඇත",
            "Loading...": "පූරණය වෙමින්...",
            "No customer credit": "ලැබීමට ඇති පාරිභෝගික ණය කිසිවක් නැත. (No customer credit)",
            "No hand loans given": "ලබාදුන් අතමාරු ණය කිසිවක් නැත. (No hand loans given)",
            "No supplier payables": "ගෙවීමට ඇති සැපයුම්කරුවන්ගේ ණය කිසිවක් නැත. (No supplier payables)",
            "No hand loans received": "ලබාගත් අතමාරු ණය කිසිවක් නැත. (No hand loans received)",
            
            // Toasts & Alerts
            "Payment saved successfully!": "ගෙවීම සාර්ථකව සටහන් කරගන්නා ලදී!",
            "Hand loan recorded successfully!": "අතමාරු ණය සාර්ථකව සටහන් කරන ලදී!",
            "Hand loan settled successfully!": "අතමාරු ණය පියවීම සාර්ථකව සටහන් කරන ලදී!",
            "Configure Selling Unit": "විකුණුම් ඒකකය තෝරන්න (Configure Selling Unit)",
            "Select default unit description": "මෙම භාණ්ඩය විකුණන පෙරනිමි ආකාරය තෝරන්න:",
            "Confirm unit change description": "මෙම භාණ්ඩය සඳහා තෝරාගත් පෙරනිමි ඒකකය සුරැකීමට තහවුරු කරන්න?",
            "Pcs Unit Option": "ගණන් කර (Pcs)",
            "Weight Unit Option": "කිරා මැන (Kg/g)",
            "Double click to change default unit": "පෙරනිමි ඒකකය වෙනස් කිරීමට ඩබල් ක්ලික් කරන්න"
        }
    };
    if (lang === 'si' && translations.si[key]) {
        return translations.si[key];
    }
    const englishNames = {
        "අපිට එන්න තියන ණය": "Debts to be received by us",
        "අපි ගෙවන්න තියන ණය": "Debts to be paid by us"
    };
    if (lang === 'en' && englishNames[key]) {
        return englishNames[key];
    }
    return key;
};

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

/** 
 * Comprehensive pool of all available menus for Distributor.
 * IDs are used for persistence in sidebarConfig.
 */
const DISTRIBUTOR_MENU_POOL = [
    { id: 'dashboard', permissionId: 'canViewDashboard', icon: '📊', name: 'Dashboard', link: '/modules/core/dashboard.html' },
    { id: 'grn', permissionId: 'canStockEdit', icon: '🧾', name: 'GRN', link: '/modules/distributor/web/grn.html' },
    { id: 'new_sales_order', permissionId: 'canInvoiceCreateEdit', icon: '🛒', name: 'New sales order', link: '/modules/distributor/web/new-order.html' },
    { id: 'orders', permissionId: 'canOrderWorkflowApprove', icon: '📑', name: 'All Orders', link: '/modules/distributor/web/index.html?tab=pending' },
    { id: 'product_sales_history', permissionId: 'canSalesView', icon: '📊', name: 'Product Sales History', link: '/modules/distributor/web/sales-history.html' },
    { id: 'invoices', permissionId: 'canInvoiceCreateEdit', icon: '🧾', name: 'Invoices', link: '/modules/distributor/web/invoices.html' },
    { id: 'order_history', permissionId: 'canSalesView', icon: '📜', name: 'Order history', link: '/modules/distributor/mobile/history.html' },
    { id: 'products', permissionId: 'canProductView', icon: '📦', name: 'Products', link: '/modules/distributor/web/products.html' },
    { id: 'free_issues', permissionId: 'canStockView', icon: '🎁', name: 'Free issues log', link: '/modules/distributor/web/free-items.html' },
    { id: 'returns', permissionId: 'canStockView', icon: '🔄', name: 'Returns log', link: '/modules/distributor/web/returns.html' },
    { id: 'warehouse', permissionId: 'canStockView', icon: '🏭', name: 'Warehouse', link: '/modules/distributor/web/warehouse.html' },
    { id: 'deliveries', permissionId: 'canDeliveriesManage', icon: '🚚', name: 'Deliveries', link: '/modules/distributor/web/deliveries.html' },
    { id: 'shops', permissionId: 'canCustomerView', icon: '🏪', name: 'Shops', link: '/modules/distributor/web/my-shops.html' },
    { id: 'customers', permissionId: 'canCustomerView', icon: '👥', name: 'Customers', link: '/modules/core/customers.html' },
    { id: 'reps', permissionId: 'canManageRepsWeb', icon: '👥', name: 'Reps', link: '/modules/distributor/web/reps.html' },
    { id: 'distributor_revenue', permissionId: 'canViewFinancialsProfit', icon: '📈', name: 'Revenue', link: '/modules/distributor/web/revenue.html' },
    { id: 'finance', permissionId: 'canViewFinancialsProfit', icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
    { id: 'accounting', permissionId: 'canViewAccounting', icon: '📁', name: 'Accounting', link: '/modules/accounts/advanced-accounting-dashboard.html' },
    { id: 'cheques', permissionId: 'canChequesManage', icon: '🏦', name: 'Cheques', link: '/modules/distributor/web/cheques.html' },
    { id: 'credit_aging', permissionId: 'canCreditAgingView', icon: '📉', name: 'Credit Aging', link: '/modules/distributor/web/credit-aging.html' },
    { id: 'commission_config', permissionId: 'canSettingsChange', icon: '⚙️', name: 'Commission Config', link: '/modules/distributor/web/commission-config.html' },
    { id: 'rep_commission', permissionId: 'canRepCommissionView', icon: '💸', name: 'Rep Commission', link: '/modules/distributor/web/rep-commission-report.html' },
    { id: 'distributor_reports', permissionId: 'canViewReportsFull', icon: '📊', name: 'Distributor Reports', link: '/modules/distributor/web/reports.html' },
    { id: 'reports', permissionId: 'canViewReportsFull', icon: '📈', name: 'Reports', link: '/modules/reports/index.html' }
];
/** Only the marketing root should skip the app sidebar — not module pages named index.html */
const SHOULD_RESERVE_SIDEBAR_SPACE = (() => {
    const raw = (window.location.pathname || '').split('?')[0];
    const p = raw.replace(/\/+/g, '') || '/';
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
        /* Body left gutter: set only in each page\'s first <style> (avoids duplicate margin with module CSS). */
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
        .user-info-sidebar{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(255,255,255,.1);padding:14px 12px 28px 12px;border-radius:12px;position:relative;overflow:hidden;width:100%;box-sizing:border-box;}
        .connection-status-sidebar{position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:9px;font-weight:800;letter-spacing:.6px;}
        .user-avatar-sidebar{display:none;}
        .user-name-sidebar{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;word-break:break-word;text-align:center;}
        .user-role-sidebar{font-size:8.5px;padding:3px 10px;border-radius:20px;background:rgba(0,0,0,.35);display:inline-block;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.2px;box-sizing:border-box;}
        .sidebar-subscription-status{margin-top:8px;font-size:11px;color:#fde68a;}
        .nav-links{flex:1;padding:16px 0;}
        .menu-section-label{padding:8px 24px;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.6);font-weight:700;}
        .menu-item{padding:12px 24px;display:flex;align-items:center;gap:14px;color:rgba(255,255,255,.85);text-decoration:none;font-size:14px;transition:all .2s;border-left:3px solid transparent;}
        .menu-item:hover,.menu-item.active{background:rgba(255,255,255,.12);color:#ffd966;border-left:3px solid #ffd966;}
        .menu-badge-new{background:#10b981;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:6px;margin-left:auto;text-transform:uppercase;animation:pulseGreen 2s infinite;}
        @keyframes pulseGreen{0%{box-shadow:0 0 0 0 rgba(16,185,129,0.7);}70%{box-shadow:0 0 0 6px rgba(16,185,129,0);}100%{box-shadow:0 0 0 0 rgba(16,185,129,0);}}
        .menu-dropdown-toggle{width:100%;text-align:left;background:transparent;border:none;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:14px;color:rgba(255,255,255,.85);font-size:14px;cursor:pointer;border-left:3px solid transparent;}
        .menu-dropdown-toggle:hover{background:rgba(255,255,255,.12);color:#ffd966;border-left:3px solid #ffd966;}
        .menu-dropdown-items{display:none;background:rgba(255,255,255,.06);}
        .menu-dropdown.open .menu-dropdown-items{display:block;}
        .menu-dropdown-items .menu-item{padding-left:52px;font-size:13px;}
        .menu-icon{width:22px;text-align:center;}
        .sidebar-footer{padding:20px;}
        .logout-sidebar-btn{background:rgba(220,38,38,.8);border:none;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;width:100%;font-size:14px;}
        .logout-sidebar-btn:hover{background:#dc2626;}
        .ledger-section-title{padding:8px 24px 4px 24px;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:#38bdf8;font-weight:700;}
        .ledger-sub-item{padding:10px 24px 10px 52px;display:flex;align-items:center;justify-content:space-between;color:rgba(255,255,255,.75);text-decoration:none;font-size:13px;transition:all .2s;border-left:3px solid transparent;}
        .ledger-sub-item:hover{background:rgba(255,255,255,.1);color:#ffd966;}
        .ledger-balance-badge{font-size:11px;font-weight:700;}
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
        this.sidebarConfig = null; // Stores array of menu IDs and visibility Base
        // Instant cached boot to render connection status instantly offline
        this.bootCachedSidebarNow();
        this.init();
        window.addEventListener('online', () => this.updateConnectionStatusText());
        window.addEventListener('offline', () => this.updateConnectionStatusText());
        setInterval(() => this.updateConnectionStatusText(), 1500); // Polling status check every 1.5 seconds

        // ULTIMATE CACHE BUSTER: Clear all permission caches on every load/refresh for staff sync
        try {
            const bid = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
            if (bid) {
                sessionStorage.removeItem(`digibiz_perms_v2_${bid}`);
                sessionStorage.removeItem(`digibiz_perm_v_${bid}`);
                sessionStorage.removeItem(`digibiz_sidebar_cache_v2`);
                localStorage.removeItem(`digibiz_sidebar_cache_${this.currentUserId}`);
            }
        } catch (e) { }
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
        if (compact === 'attendancepayroll') return 'attendance_payroll';
        if (compact === 'attendance_payroll') return 'attendance_payroll';
        if (compact === 'retail') return 'retail';
        if (compact === 'autocare' || compact === 'vehiclerepair' || compact === 'auto_care') return 'auto_care';
        return raw;
    }

    isMobileView() {
        return window.innerWidth <= 768;
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
                /* 
                 * Disable pre-auth cache priming for distributor staff to avoid ghost menus.
                 * Forced to wait for loadUserData and refreshBusinessNameFromProfile.
                 */
                // this.primeFromCache(user.uid);
                // this.render();
                // ULTIMATE CACHE BUSTER: Clear all permission caches on every load/refresh for staff sync
                try {
                    const bid = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
                    if (bid) {
                        sessionStorage.removeItem(`digibiz_perms_v2_${bid}`);
                        sessionStorage.removeItem(`digibiz_perm_v_${bid}`);
                        localStorage.removeItem(`digibiz_sidebar_cache_${user.uid}`);
                    }
                } catch (e) { }

                // Paint sidebar immediately to prevent any load delay
                this.render();
                this.attachEvents();

                // Load database profile details asynchronously in the background
                (async () => {
                    try {
                        await this.loadUserData(user.uid);
                        await this.refreshBusinessNameFromProfile();
                        this.render();
                        this.attachEvents();
                    } catch (e) {
                        console.warn('[Sidebar] Async background load failed:', e);
                    }
                })();
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
                Promise.resolve().then(() => this.maybeShowUpdateAnnouncement(user)).catch(() => { });
                // Promise.resolve().then(() => this.showNewFeatureAnnouncement(user)).catch(() => { });
                Promise.resolve(subscriptionReady).then(async () => {
                    this.subscriptionState = window.subscriptionManager
                        ? await window.subscriptionManager.initializeForUser(user, this.currentRole, this.businessId || user.uid)
                        : null;
                    this.updateUserInfo();
                    this.checkOnboardingStatus(user);
                }).catch(() => { });
            }
        });
    }

    injectOnboardingStyles() {
        if (document.getElementById('onboardingStyles')) return;
        const style = document.createElement('style');
        style.id = 'onboardingStyles';
        style.textContent = `
            #onboardingBanner {
                background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%);
                color: #f8fafc;
                padding: 12px 24px;
                font-family: 'Inter', sans-serif;
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                z-index: 9999;
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                border-bottom: 2px solid #10b981;
            }
            #onboardingBanner .progress-wrap {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            #onboardingBanner .progress-bar-bg {
                background: #475569;
                border-radius: 8px;
                width: 150px;
                height: 8px;
                overflow: hidden;
            }
            #onboardingBanner .progress-bar-fill {
                background: #10b981;
                height: 100%;
                width: 20%;
                transition: width 0.3s ease;
            }
            #onboardingBanner .btn-setup {
                background: #10b981;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 700;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            #onboardingBanner .btn-setup:hover {
                background: #059669;
            }
        `;
        document.head.appendChild(style);
    }

    async checkOnboardingStatus(user) {
        if (!user) return;
        const bizType = localStorage.getItem('currentBusinessType') || '';
        const isRetail = bizType === 'retail' || window.location.pathname.includes('/retail/') || window.location.pathname.includes('pos.html') || window.location.pathname.includes('inventory.html') || window.location.pathname.includes('purchases.html') || window.location.pathname.includes('grn.html') || window.location.pathname.includes('credit-aging.html') || window.location.pathname.includes('sales-history.html');
        if (!isRetail) return;

        try {
            const opt = navigator.onLine ? {} : { source: 'cache' };
            const bizDoc = await db.collection('businesses').doc(this.businessId || user.uid).get(opt);
            if (!bizDoc.exists) return;
            const bizData = bizDoc.data();
            
            // Check if user registered after July 10, 2026
            let isNewUser = false;
            if (bizData.createdAt) {
                const createdDate = bizData.createdAt.toDate ? bizData.createdAt.toDate() : new Date(bizData.createdAt);
                if (createdDate >= new Date('2026-07-10')) {
                    isNewUser = true;
                }
            }

            // Show setup to anyone who has not completed onboarding and is registered after July 10, 2026
            if (bizData.onboardingCompleted !== true && isNewUser) {
                this.injectOnboardingStyles();
                this.showOnboardingBanner(user, bizData);
            }
        } catch (e) {
            console.error('[Onboarding] Error checking status:', e);
        }
    }

    showOnboardingBanner(user, bizData) {
        if (document.getElementById('onboardingBanner')) return;
        
        const completed = bizData.onboardingStepsCompleted || {};
        let completedCount = 0;
        if (completed.cash) completedCount++;
        if (completed.bank) completedCount++;
        if (completed.receivables) completedCount++;
        if (completed.payables) completedCount++;
        const pct = Math.round((completedCount / 4) * 100);
        
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        const bannerText = lang === 'si' ? "ව්‍යාපාර ආරම්භක සැකසුම් (Shop Initial Setup):" : "Shop Initial Setup:";
        const btnText = lang === 'si' ? "සැකසුම් මෙනුව →" : "Setup Menu →";
        
        const banner = document.createElement('div');
        banner.id = 'onboardingBanner';
        banner.innerHTML = `
            <div class="progress-wrap">
                <span style="font-weight:700; font-size:14px; letter-spacing:0.02em;">🔧 ${bannerText}</span>
                <div class="progress-bar-bg"><div class="progress-bar-fill" id="bannerProgressFill" style="width: ${pct}%;"></div></div>
                <span style="font-size:12px; font-weight:700; color:#10b981;" id="bannerProgressPct">${pct}%</span>
            </div>
            <button class="btn-setup" onclick="window.sidebar.openOnboardingWizard()">${btnText}</button>
        `;
        
        document.body.prepend(banner);
    }

    openOnboardingWizard(user = null) {
        if (!user) user = firebase.auth().currentUser;
        const businessId = this.businessId || (user ? user.uid : localStorage.getItem('currentBusinessId'));
        let modal = document.getElementById('onboardingWizardModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'onboardingWizardModal';
            modal.className = 'modal';
            modal.style.cssText = "display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:100000; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(4px);";
            
            modal.innerHTML = `
                <div class="modal-content" style="background:white; border-radius:24px; padding:30px; width:100%; max-width:480px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                    <h3 id="wizardTitle" style="font-family:'Outfit', sans-serif; font-size:20px; font-weight:800; color:#0f3b2c; margin-bottom:12px;">Initial Shop Setup</h3>
                    
                    <div style="background:#f1f5f9; border-radius:10px; height:6px; overflow:hidden; margin-bottom:20px; position:relative;">
                        <div id="wizardProgressFill" style="background:#10b981; height:100%; width:0%; transition:width 0.3s;"></div>
                    </div>
                    
                    <div id="wizardStepContent" style="margin-bottom:24px; font-size:14px; color:#334155; line-height:1.6; min-height:150px;"></div>
                    
                    <div class="modal-buttons" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;" id="wizardButtonsArea">
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'flex';
        
        let wizardState = {
            onboardingBalances: { cash: 0, bank: 0, receivables: 0, payables: 0 },
            onboardingStepsCompleted: { cash: false, bank: false, receivables: false, payables: false }
        };
        
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        
        const loadStateAndRender = async () => {
            try {
                const opt = navigator.onLine ? {} : { source: 'cache' };
                const doc = await db.collection('businesses').doc(businessId).get(opt);
                if (doc.exists) {
                    const data = doc.data();
                    wizardState.onboardingBalances = data.onboardingBalances || { cash: 0, bank: 0, receivables: 0, payables: 0 };
                    wizardState.onboardingStepsCompleted = data.onboardingStepsCompleted || { cash: false, bank: false, receivables: false, payables: false };
                }
            } catch (e) {
                console.error(e);
            }
            renderMenu();
        };

        const renderMenu = () => {
            const titleH = document.getElementById('wizardTitle');
            const contentDiv = document.getElementById('wizardStepContent');
            const progressFill = document.getElementById('wizardProgressFill');
            const buttonsArea = document.getElementById('wizardButtonsArea');
            
            titleH.textContent = lang === 'si' ? "ආරම්භක සැකසුම් මෙනුව" : "Initial Shop Setup";
            
            const completed = wizardState.onboardingStepsCompleted || {};
            let completedCount = 0;
            if (completed.cash) completedCount++;
            if (completed.bank) completedCount++;
            if (completed.receivables) completedCount++;
            if (completed.payables) completedCount++;
            
            const pct = Math.round((completedCount / 4) * 100);
            progressFill.style.width = `${pct}%`;
            
            const bannerFill = document.getElementById('bannerProgressFill');
            const bannerPct = document.getElementById('bannerProgressPct');
            if (bannerFill) bannerFill.style.width = `${pct}%`;
            if (bannerPct) bannerPct.style.width = `${pct}%`;
            
            const formatLkr = (val) => 'Rs. ' + Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 });
            
            const getStatusBadge = (isDone, val) => {
                if (isDone) {
                    return `<span style="background:#d1fae5; color:#059669; font-weight:700; font-size:11px; padding:2px 8px; border-radius:30px;">✓ ${formatLkr(val)}</span>`;
                } else {
                    return `<span style="background:#f1f5f9; color:#64748b; font-weight:700; font-size:11px; padding:2px 8px; border-radius:30px;">${lang === 'si' ? 'අසම්පූර්ණයි' : 'Pending'}</span>`;
                }
            };
            
            const allCompleted = completed.cash && completed.bank && completed.receivables && completed.payables;
            const noticeHtml = allCompleted 
                ? '' 
                : `<div style="background:#fff1f2; border:1px solid #ffe4e6; color:#b91c1c; border-radius:10px; padding:10px; font-size:12px; font-weight:600; margin-bottom:12px; line-height:1.4;">
                      ⚠️ ${lang === 'si' ? 'සියලුම පියවර සම්පූර්ණ කිරීම අනිවාර්ය වේ. ඔබ සතුව ආරම්භක ශේෂයන් (මුදල්/ණය) නොමැති නම්, එම පියවරට ගොස් 0 ඇතුළත් කර සුරකින්න.' : 'All steps are mandatory. If you have no starting balance for a step, enter 0 and save.'}
                   </div>`;

            contentDiv.innerHTML = `
                ${noticeHtml}
                <p style="margin-bottom:15px; font-weight:500;">${lang === 'si' ? 'කරුණාකර පහත පියවර තෝරා ආරම්භක මුදල් සහ ණය ප්‍රමාණයන් සටහන් කරන්න:' : 'Please configure each parameter below. You can complete them in any order:'}</p>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                        <div>
                            <strong style="display:block;">${lang === 'si' ? 'පියවර 1: අත ඇති මුදල' : 'Step 1: Cash in Hand'}</strong>
                            ${getStatusBadge(completed.cash, wizardState.onboardingBalances.cash)}
                        </div>
                        <button class="btn-setup" style="padding:6px 12px; font-size:12px;" onclick="window.sidebar.enterSetupStep('cash')">${lang === 'si' ? 'සකසන්න' : 'Configure'}</button>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                        <div>
                            <strong style="display:block;">${lang === 'si' ? 'පියවර 2: බැංකු මුදල්' : 'Step 2: Bank Balance'}</strong>
                            ${getStatusBadge(completed.bank, wizardState.onboardingBalances.bank)}
                        </div>
                        <button class="btn-setup" style="padding:6px 12px; font-size:12px;" onclick="window.sidebar.enterSetupStep('bank')">${lang === 'si' ? 'සකසන්න' : 'Configure'}</button>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                        <div>
                            <strong style="display:block;">${lang === 'si' ? 'පියවර 3: ලැබීමට ඇති ණය' : 'Step 3: Receivables'}</strong>
                            ${getStatusBadge(completed.receivables, wizardState.onboardingBalances.receivables)}
                        </div>
                        <button class="btn-setup" style="padding:6px 12px; font-size:12px;" onclick="window.sidebar.enterSetupStep('receivables')">${lang === 'si' ? 'සකසන්න' : 'Configure'}</button>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                        <div>
                            <strong style="display:block;">${lang === 'si' ? 'පියවර 4: ගෙවීමට ඇති ණය' : 'Step 4: Payables'}</strong>
                            ${getStatusBadge(completed.payables, wizardState.onboardingBalances.payables)}
                        </div>
                        <button class="btn-setup" style="padding:6px 12px; font-size:12px;" onclick="window.sidebar.enterSetupStep('payables')">${lang === 'si' ? 'සකසන්න' : 'Configure'}</button>
                    </div>
                </div>
            `;
            
            if (allCompleted) {
                buttonsArea.innerHTML = `
                    <button class="btn-cancel" onclick="window.sidebar.closeOnboardingWizard()" style="padding:10px 20px; border-radius:10px; cursor:pointer;">${lang === 'si' ? 'පසුව කරන්න' : 'Setup Later'}</button>
                    <button class="btn-setup" onclick="window.sidebar.completeOnboardingSetup()" style="padding:10px 20px; border-radius:10px; cursor:pointer;">${lang === 'si' ? 'සැකසුම අවසන් කරන්න' : 'Finish Setup'}</button>
                `;
            } else {
                const alertMsg = lang === 'si' 
                    ? 'කරුණාකර සියලුම පියවර සම්පූර්ණ කරන්න. ඔබ සතුව ආරම්භක ශේෂයන් නොමැති නම්, එම පියවරට ගොස් 0 ඇතුළත් කර සුරකින්න.' 
                    : 'Please complete all steps. If you have no initial balances, go to each step, enter 0 and save.';
                buttonsArea.innerHTML = `
                    <button class="btn-cancel" onclick="window.sidebar.closeOnboardingWizard()" style="padding:10px 20px; border-radius:10px; cursor:pointer;">${lang === 'si' ? 'පසුව කරන්න' : 'Setup Later'}</button>
                    <button class="btn-setup" style="padding:10px 20px; border-radius:10px; cursor:not-allowed; opacity:0.5;" onclick="alert('${alertMsg}')">${lang === 'si' ? 'සැකසුම අවසන් කරන්න' : 'Finish Setup'}</button>
                `;
            }
        };
        
        window.sidebar.enterSetupStep = (stepKey) => {
            const titleH = document.getElementById('wizardTitle');
            const contentDiv = document.getElementById('wizardStepContent');
            const buttonsArea = document.getElementById('wizardButtonsArea');
            
            let label = '', desc = '';
            if (stepKey === 'cash') {
                label = lang === 'si' ? "අත ඇති මුදල (Cash in Hand)" : "Cash in Hand";
                desc = lang === 'si' ? "ව්‍යාපාරය ආරම්භ කරන විට ලාච්චුවේ හෝ අතේ ඇති මුළු මුදල ඇතුළත් කරන්න:" : "Enter the initial cash amount in your drawer or hand:";
            } else if (stepKey === 'bank') {
                label = lang === 'si' ? "බැංකු මුදල් (Bank Balance)" : "Bank Balance";
                desc = lang === 'si' ? "ව්‍යාපාරික බැංකු ගිණුමේ ඇති මුදල ඇතුළත් කරන්න:" : "Enter your business bank account balance:";
            } else if (stepKey === 'receivables') {
                label = lang === 'si' ? "පිටින් ලැබීමට ඇති ණය (Receivables)" : "Receivables Balance";
                desc = lang === 'si' ? "ලැබීමට ඇති ණය වෙන වෙනම ඇතුළත් කරන්න. (නැතහොත් 0 දමා සුරකින්න):" : "Enter individual outstanding balances others owe you (or leave empty & save):";
            } else if (stepKey === 'payables') {
                label = lang === 'si' ? "අප විසින් පිටට ගෙවීමට ඇති ණය (Payables)" : "Payables Balance";
                desc = lang === 'si' ? "ගෙවීමට ඇති ණය වෙන වෙනම ඇතුළත් කරන්න. (නැතහොත් 0 දමා සුරකින්න):" : "Enter individual outstanding debts you owe (or leave empty & save):";
            }
            
            titleH.textContent = label;
            
            if (stepKey === 'cash' || stepKey === 'bank') {
                contentDiv.innerHTML = `
                    <p style="margin-bottom:12px;">${desc}</p>
                    <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">LKR Amount</label>
                    <input type="number" id="wizardInputVal" value="${wizardState.onboardingBalances[stepKey] || 0}" style="width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:16px; font-weight:700;" min="0">
                `;
            } else {
                this.wizardTempRows = [{ name: '', amount: '' }];
                const btnLabel = stepKey === 'receivables' 
                    ? (lang === 'si' ? "+ පාරිභෝගිකයෙකු එක් කරන්න" : "+ Add Customer")
                    : (lang === 'si' ? "+ සැපයුම්කරුවෙකු එක් කරන්න" : "+ Add Supplier");
                
                contentDiv.innerHTML = `
                    <p style="margin-bottom:12px;">${desc}</p>
                    <div style="max-height: 200px; overflow-y: auto; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 5px; background: #f8fafc;">
                        <table style="width:100%; border-collapse:collapse; font-size:13px;">
                            <thead>
                                <tr style="border-bottom:1px solid #cbd5e1; text-align:left; color:#64748b; font-weight:700;">
                                    <th style="padding:6px 4px;">Name</th>
                                    <th style="padding:6px 4px; text-align:right;">Amount (Rs.)</th>
                                    <th style="padding:6px 4px; text-align:center;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="wizardTableRows">
                            </tbody>
                        </table>
                    </div>
                    <button type="button" onclick="window.sidebar.addWizardTableRow()" style="background:#0f3b2c; color:white; border:none; padding:8px 14px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">
                        ${btnLabel}
                    </button>
                `;
                
                window.sidebar.addWizardTableRow = () => {
                    this.wizardTempRows.push({ name: '', amount: '' });
                    this.renderWizardTableRows();
                };
                window.sidebar.removeWizardTableRow = (idx) => {
                    this.wizardTempRows.splice(idx, 1);
                    this.renderWizardTableRows();
                };
                window.sidebar.updateWizardRow = (idx, key, val) => {
                    this.wizardTempRows[idx][key] = val;
                };
                
                this.renderWizardTableRows = () => {
                    const body = document.getElementById('wizardTableRows');
                    if (!body) return;
                    if (this.wizardTempRows.length === 0) {
                        body.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:#94a3b8;">No rows added yet. (සියල්ල 0 ලෙස සලකා සුරැකේ)</td></tr>`;
                        return;
                    }
                    body.innerHTML = this.wizardTempRows.map((row, idx) => {
                        return `
                            <tr>
                                <td style="padding:4px;"><input type="text" value="${row.name}" oninput="window.sidebar.updateWizardRow(${idx}, 'name', this.value)" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;" placeholder="Name"></td>
                                <td style="padding:4px;"><input type="number" value="${row.amount}" oninput="window.sidebar.updateWizardRow(${idx}, 'amount', this.value)" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; text-align:right;" placeholder="0.00" min="0"></td>
                                <td style="padding:4px; text-align:center;"><button type="button" onclick="window.sidebar.removeWizardTableRow(${idx})" style="background:#fee2e2; color:#ef4444; border:none; padding:4px 8px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:700;">X</button></td>
                            </tr>
                        `;
                    }).join('');
                };
                
                this.renderWizardTableRows();
            }
            
            buttonsArea.innerHTML = `
                <button class="btn-cancel" onclick="window.sidebar.returnToWizardMenu()" style="padding:10px 20px; border-radius:10px; cursor:pointer;">${lang === 'si' ? 'පසුපසට' : 'Back'}</button>
                <button class="btn-setup" id="saveStepBtn" onclick="window.sidebar.saveSetupStepValue('${stepKey}')" style="padding:10px 20px; border-radius:10px; cursor:pointer;">${lang === 'si' ? 'සුරකින්න' : 'Save Balance'}</button>
            `;
        };
        
        window.sidebar.returnToWizardMenu = () => {
            renderMenu();
        };
        
        window.sidebar.saveSetupStepValue = async (stepKey) => {
            const btn = document.getElementById('saveStepBtn');
            btn.disabled = true;
            btn.textContent = lang === 'si' ? "සුරකිමින්..." : "Saving...";
            
            try {
                let val = 0;
                let rows = [];
                
                if (stepKey === 'cash' || stepKey === 'bank') {
                    const input = document.getElementById('wizardInputVal');
                    val = Math.max(0, parseFloat(input.value) || 0);
                } else {
                    rows = (this.wizardTempRows || []).filter(r => r.name.trim() !== '' && parseFloat(r.amount) > 0);
                    val = rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
                }
                
                const updatePayload = {};
                updatePayload[`onboardingBalances.${stepKey}`] = val;
                updatePayload[`onboardingStepsCompleted.${stepKey}`] = true;
                
                await db.collection('businesses').doc(businessId).update(updatePayload);
                
                // Clear existing onboarding entries for this step
                const entriesRef = db.collection('journal').doc(businessId).collection('entries');
                const snap = await entriesRef.where('refType', '==', 'ONBOARDING').get();
                const batch = db.batch();
                snap.forEach(doc => {
                    const ref = doc.data().ref || '';
                    if (ref === `onboarding_${stepKey}` || ref.startsWith(`onboarding_${stepKey}_`)) {
                        batch.delete(doc.ref);
                    }
                });
                await batch.commit();
                
                if (stepKey === 'cash' || stepKey === 'bank') {
                    if (val > 0) {
                        let journalEntries = [];
                        if (stepKey === 'cash') {
                            journalEntries = [
                                { accountId: '1-1010-01', amount: val, type: 'debit' },
                                { accountId: '3-3010-01', amount: val, type: 'credit' }
                            ];
                        } else {
                            journalEntries = [
                                { accountId: '1-1020-01', amount: val, type: 'debit' },
                                { accountId: '3-3010-01', amount: val, type: 'credit' }
                            ];
                        }
                        
                        const journalDoc = {
                            date: new Date(),
                            memo: `Opening Balance Initialization - ${stepKey.toUpperCase()}`,
                            entries: journalEntries,
                            ref: `onboarding_${stepKey}`,
                            refType: 'ONBOARDING',
                            businessId: businessId,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        await entriesRef.add(journalDoc);
                    }
                } else if (stepKey === 'receivables') {
                    // Loop debtors and save
                    for (const r of rows) {
                        const amt = parseFloat(r.amount);
                        const custRef = await db.collection('customers').add({
                            businessId: businessId,
                            fullName: r.name.trim(),
                            mobile: '0700000000',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        const journalDoc = {
                            date: new Date(),
                            memo: `Opening Balance Customer - ${r.name.trim()}`,
                            entries: [
                                { accountId: '1-1030-01', amount: amt, type: 'debit' },
                                { accountId: '3-3010-01', amount: amt, type: 'credit' }
                            ],
                            ref: `onboarding_receivables_${custRef.id}`,
                            refType: 'ONBOARDING',
                            businessId: businessId,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        await entriesRef.add(journalDoc);
                    }
                } else if (stepKey === 'payables') {
                    // Loop creditors and save
                    for (const r of rows) {
                        const amt = parseFloat(r.amount);
                        const supplierRef = db.collection('suppliers').doc(businessId).collection('list').doc();
                        await supplierRef.set({
                            id: supplierRef.id,
                            name: r.name.trim(),
                            mobile: '0700000000',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        const journalDoc = {
                            date: new Date(),
                            memo: `Opening Balance Supplier - ${r.name.trim()}`,
                            entries: [
                                { accountId: '3-3010-01', amount: amt, type: 'debit' },
                                { accountId: '2-2010-01', amount: amt, type: 'credit' }
                            ],
                            ref: `onboarding_payables_${supplierRef.id}`,
                            refType: 'ONBOARDING',
                            businessId: businessId,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        await entriesRef.add(journalDoc);
                    }
                }
                
                wizardState.onboardingBalances[stepKey] = val;
                wizardState.onboardingStepsCompleted[stepKey] = true;
                
                const noticeMsg = lang === 'si'
                    ? `ආරම්භක ශේෂයන් සාර්ථකව සුරැකුණා!\n\n(සටහන: ඔබට මෙම ආරම්භක ගනුදෙනු මකා දැමීමට හෝ වෙනස් කිරීමට අවශ්‍ය වුවහොත්, "Daily Transactions (දෛනික ගනුදෙනු)" පිටුවට ගොස් ඒවා මකා දැමිය හැක.)`
                    : `Starting balance saved successfully!\n\n(Note: If you need to remove or change this starting balance, you can go to the "Daily Transactions" page, select the transaction, and delete/reverse it.)`;
                alert(noticeMsg);
                
                renderMenu();
            } catch (err) {
                console.error(err);
                alert('Error saving step: ' + err.message);
                btn.disabled = false;
                btn.textContent = lang === 'si' ? "සුරකින්න" : "Save Balance";
            }
        };
        
        window.sidebar.closeOnboardingWizard = () => {
            const modal = document.getElementById('onboardingWizardModal');
            if (modal) modal.style.display = 'none';
        };
        
        window.sidebar.completeOnboardingSetup = async () => {
            const btn = document.querySelector('button[onclick="window.sidebar.completeOnboardingSetup()"]');
            btn.disabled = true;
            btn.textContent = lang === 'si' ? "අවසන් කරමින්..." : "Completing...";
            
            try {
                await db.collection('businesses').doc(businessId).update({
                    onboardingCompleted: true
                });
                
                modal.style.display = 'none';
                const banner = document.getElementById('onboardingBanner');
                if (banner) banner.remove();
                
                alert(lang === 'si' ? "ආරම්භක සැකසුම් සාර්ථකව නිම කරන ලදී!" : "Onboarding setup completed successfully!");
                window.location.reload();
            } catch (err) {
                console.error(err);
                alert('Error completing setup: ' + err.message);
                btn.disabled = false;
                btn.textContent = lang === 'si' ? "සැකසුම අවසන් කරන්න" : "Finish Setup";
            }
        };

        loadStateAndRender();
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

    showNewFeatureAnnouncement(user) {
        if (!user) return;

        const roleNorm = String(this.currentRole || '').toUpperCase();
        const isOwner = this.isSuperAdminUser() || roleNorm === 'DISTRIBUTOR_OWNER' || roleNorm === 'BUSINESS_OWNER';

        // ONLY show these announcements to Owners/Admins
        if (!isOwner) return;

        const menus = this.getMenus();
        let hasNewFeatures = menus.some(m => m.isNew);

        if (!hasNewFeatures) {
            const isDistributor = this.businessType === 'distributor' || this.isMwTradingContext();
            if (isDistributor) {
                hasNewFeatures = true;
            }
        }

        if (!hasNewFeatures) return;

        const countKey = `new_feature_announce_count_${user.uid}`;
        const hideKey = `new_feature_announce_hide_${user.uid}`;

        if (localStorage.getItem(hideKey) === 'true') return;

        let count = parseInt(localStorage.getItem(countKey) || '0');
        if (count >= 50) return;

        if (window.location.pathname.includes('sidebar-config.html') || window.location.pathname.includes('permissions-config.html')) return;

        const modalId = 'newFeatureAnnouncementModal';
        if (document.getElementById(modalId)) return;

        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); display: flex; align-items: center;
            justify-content: center; z-index: 10005; backdrop-filter: blur(4px); padding: 20px;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: #fff; padding: 30px; border-radius: 20px; max-width: 450px;
            width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
            animation: fadeInScale 0.3s ease-out;
        `;

        content.innerHTML = `
            <div style="font-size: 50px; margin-bottom: 15px;">🚀</div>
            <h2 style="color: #0f172a; margin-bottom: 15px; font-size: 20px; font-weight: 800;">අලුත් පහසුකම් කිහිපයක් එක් කර ඇත!</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                ඔබගේ ව්‍යාපාරික කටයුතු වඩාත් පහසු කිරීම සඳහා <b>Staff Permissions</b> (සේවක අවසරයන්) සහ <b>Sidebar Config</b> (මෙනු සකස් කිරීමේ) පහසුකම් දැන් එක් කර ඇත. <br><br>
                මේවා සයිඩ්බාර් එකේ <b>"NEW"</b> ලේබලය සමඟ ඔබට දැක ගත හැකියි. සැකසුම් සිදු කිරීමට පද්ධති සැකසුම් (Settings) වෙත පිවිසෙන්න.
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="goConfigBtn" style="background: #2563eb; color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer;">සැකසුම් වෙත යන්න →</button>
                <button id="hideAnnounceBtn" style="background: #f1f5f9; color: #475569; border: none; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">මීට පසු පෙන්වන්න එපා</button>
                <button id="closeAnnounceBtn" style="background: transparent; color: #94a3b8; border: none; font-size: 13px; cursor: pointer; margin-top: 5px;">පසුව බලන්න</button>
            </div>
            <style>
                @keyframes fadeInScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
            </style>
        `;

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        document.getElementById('goConfigBtn').onclick = () => {
            window.location.href = '/modules/core/sidebar-config.html';
        };

        document.getElementById('hideAnnounceBtn').onclick = () => {
            localStorage.setItem(hideKey, 'true');
            overlay.remove();
        };

        document.getElementById('closeAnnounceBtn').onclick = () => {
            overlay.remove();
        };

        localStorage.setItem(countKey, (count + 1).toString());
    }

    async maybeShowUpdateAnnouncement(user) {
        return; // Disabled update announcement popup as requested
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
            const opt = navigator.onLine ? {} : { source: 'cache' };
            const userDoc = await db.collection('users').doc(userId).get(opt);
            const userData = userDoc.exists ? (userDoc.data() || {}) : {};
        if (!firebase.auth().currentUser) {
            await new Promise(resolve => {
                const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                    unsubscribe();
                    resolve(user);
                });
                setTimeout(() => { unsubscribe(); resolve(null); }, 5000); // 5s safety timeout
            });
        }
        
        const user = firebase.auth().currentUser;
        const userEmail = String(user && user.email || '').toLowerCase();
        console.log('[Sidebar Debug] Resolved Email:', userEmail);

        const isStaging = window.location.hostname.includes('digibiz-test');
        const currentBid = localStorage.getItem('currentBusinessId');
        const isSirimal = (userId === 'oDhSDYHQ2dV1DP33koysmZAqaY13' || 
                           userEmail === 'biz.sirimal@gmail.com' ||
                           userEmail === '2biz.sirimal@gmail.com' ||
                           userEmail === 'scrap@chinthaka.com' ||
                           (isStaging && (currentBid === 'STAGING_TEST_SCRAP_BIZ' || currentBid === '8KlnS39HmqYwtcNzM0NZMkq6om63')));
        this.currentRole = isSirimal ? 'SUPER_ADMIN' : (userData.role || 'VIEWER');
            this.currentUserEmail = String((userData.email || (firebase.auth().currentUser && firebase.auth().currentUser.email) || '')).trim().toLowerCase();
            this.ownerName = userData.ownerName || userData.name || '';
            const mustChangePassword = userData.mustChangePassword === true;
            if (userEmail === 'biz.sirimal@gmail.com' || userEmail === '2biz.sirimal@gmail.com' || userEmail === 'scrap@chinthaka.com') {
                this.businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
                this.businessType = 'scrap_collection_center';
                localStorage.setItem('currentBusinessId', 'oDhSDYHQ2dV1DP33koysmZAqaY13');
                sessionStorage.setItem('currentBusinessId', 'oDhSDYHQ2dV1DP33koysmZAqaY13');
                localStorage.setItem('currentBusinessType', 'scrap_collection_center');
            } else {
                this.businessId = userData.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || null;
            }

            if (!this.businessId && window.dashboardCore && typeof window.dashboardCore.getContext === 'function' && firebase.auth().currentUser) {
                try {
                    const ctx = await window.dashboardCore.getContext(firebase.auth().currentUser);
                    this.businessId = ctx && ctx.businessId ? ctx.businessId : this.businessId;
                } catch (ctxErr) { /* ignore */ }
            }
            if (this.businessId && String(this.businessId).trim()) {
                const opt = navigator.onLine ? {} : { source: 'cache' };
                const businessDoc = await db.collection('businesses').doc(String(this.businessId).trim()).get(opt);
                if (businessDoc.exists) {
                    const bData = businessDoc.data() || {};
                    this.businessType = this.normalizeBusinessType(bData.businessType || bData.type || userData.businessType || userData.type || 'retail');
                    console.log(`[Sidebar] Detected BusinessType: ${this.businessType} for BID: ${this.businessId}`);
                    this.sidebarConfig = bData.sidebarConfig || null;

                    // RE-POPULATE SESSION CACHE WITH LATEST RBAC CONFIG FOR AUTH-ROLES
                    console.log('[Sidebar RBAC] Checking for rbacConfig in business doc:', this.businessId);
                    if (bData.rbacConfig) {
                        try {
                            const configStr = JSON.stringify(bData.rbacConfig);
                            sessionStorage.setItem(`digibiz_perms_v2_${this.businessId}`, configStr);
                            console.log('[Sidebar RBAC] Injected rbacConfig into session storage.');
                        } catch (e) { console.warn('[Sidebar RBAC] Could not populate rbac session cache', e); }
                    } else {
                        console.warn('[Sidebar RBAC] No rbacConfig found in business document.');
                    }
                } else {
                    this.businessType = this.normalizeBusinessType(userData.businessType || 'retail');
                    this.sidebarConfig = null;
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
                const bData = businessDoc.exists ? (businessDoc.data() || {}) : {};
                const isDistributorTenant = bData.businessType === 'distributor' || this.businessId === this.mwBusinessId || this.businessId === this.spranzaBusinessId;
                if (isDistributorTenant && this.businessType !== 'scrap_collection_center') {
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
                const opt = navigator.onLine ? {} : { source: 'cache' };
                const bizUser = await db.collection('businesses').doc(this.businessId).collection('users').doc(userId).get(opt);
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
                const opt = navigator.onLine ? {} : { source: 'cache' };
                const settingsDoc = await db.collection('settings').doc(this.businessId).get(opt);
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
        const role = String(this.currentRole || '').toUpperCase();
        return this.superAdmin === true || role === 'SUPER_ADMIN' || role === 'ADMIN';
    }

    isRepRole() {
        return String(this.currentRole || '').toUpperCase() === 'REP';
    }

    isMwTradingContext() {
        const bid = String(this.businessId || '').trim().toUpperCase();
        return bid === String(this.mwBusinessId || '').toUpperCase() || bid === String(this.spranzaBusinessId || '').toUpperCase();
    }

    isStrictMwTradingBusiness() {
        return this.businessType === 'distributor';
    }

    isPilotTenant(email, businessId) {
        return false;
    }

    isBdkAccountingTenant() {
        return false;
    }

    isKdkumbukaTenant() {
        return String(this.businessId || '') === this.kduTeaBusinessId;
    }

    isCommissionPilotEnabled() {
        const authEmail = (firebase.auth && firebase.auth.currentUser && firebase.auth.currentUser.email) || '';
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
        const authEmail = (firebase.auth && firebase.auth.currentUser && firebase.auth.currentUser.email) || '';
        const fromStorage = localStorage.getItem('digibizMwSyncEmail') || sessionStorage.getItem('digibizMwSyncEmail') || '';
        const email = String(authEmail || fromStorage || '').trim().toLowerCase();
        const bid = String(this.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || '').trim();
        return this.isPilotTenant(email, bid);
    }

    getDistributorPermissionProfile() {
        const P = window.DigibizDistributorPermissions;
        const roleRaw = this.businessNavRole || this.currentRole || '';
        const roleNorm = String(roleRaw).toUpperCase().replace(/\s+/g, '_');
        
        const isOwnerOrAdmin = !roleNorm || ['OWNER', 'BUSINESS_OWNER', 'DISTRIBUTOR_OWNER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'BUSINESS_STAFF'].includes(roleNorm) || (roleNorm !== 'REP');

        if (isOwnerOrAdmin || !P) {
            return {
                canViewDashboard: true,
                canViewAccounting: true,
                canViewReportsFull: true,
                canViewFinancialsProfit: true,
                canInvoiceCreateEdit: true,
                canManageRepsWeb: true,
                canCustomerView: true,
                canOrderWorkflowApprove: true,
                canSalesView: true,
                canStockEdit: true,
                canProductView: true,
                canStockView: true,
                canDeliveriesManage: true,
                canChequesManage: true,
                canCreditAgingView: true,
                canSettingsChange: true,
                canRepCommissionView: true,
                canScrapBillCreate: true,
                canScrapRevenueView: true,
                canScrapExpensesManage: true,
                canScrapSellCreate: true,
                canScrapStockView: true,
                canScrapBuyingHistoryView: true,
                canScrapSellingHistoryView: true,
                canScrapAdvanceManage: true,
                canScrapLoansManage: true
            };
        }
        return P.permissionsForRole(roleRaw, this.businessId);
    }

    getDistributorWebMenuBase() {
        const base = [
            { icon: '🧾', name: 'GRN', link: '/modules/distributor/web/grn.html' },
            { icon: '🛒', name: 'New sales order', link: '/modules/distributor/web/new-order.html' },
            { icon: '📑', name: 'All Orders', link: '/modules/distributor/web/index.html?tab=pending' },
            { icon: '📊', name: 'Product Sales History', link: '/modules/distributor/web/sales-history.html' },
            { icon: '🧾', name: 'Invoices', link: '/modules/distributor/web/invoices.html' },
            { icon: '📦', name: 'Products', link: '/modules/distributor/web/products.html' },
            { icon: '🎁', name: 'Free issues log', link: '/modules/distributor/web/free-items.html' },
            { icon: '🔄', name: 'Returns log', link: '/modules/distributor/web/returns.html' },
            { icon: '🏭', name: 'Warehouse', link: '/modules/distributor/web/warehouse.html' },
            { icon: '🚚', name: 'Deliveries', link: '/modules/distributor/web/deliveries.html' },
            { icon: '🏪', name: 'Shops', link: '/modules/distributor/web/my-shops.html' },
            { icon: '👥', name: 'Reps', link: '/modules/distributor/web/reps.html' },
            { icon: '📈', name: 'Revenue', link: '/modules/distributor/web/revenue.html' },
            { icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
            { icon: '📊', name: 'Distributor Reports', link: '/modules/distributor/web/reports.html' }
        ];
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

        // 1. Filter the comprehensive pool based on granular RBAC
        let menus = DISTRIBUTOR_MENU_POOL.filter(item => {
            const pid = item.permissionId;
            if (!pid) return true; // Public menus if any
            return !!perms[pid];
        });

        // 2. Filter crosscut menus (Accounting, Reports, etc.)
        let tail = this.getSharedCrosscutMenus().filter(m => {
            if (m.name === 'Accounting') return !!perms.canViewAccounting;
            if (m.name === 'Reports') return !!perms.canViewReportsFull;
            if (m.name === 'Finance') return !!perms.canViewFinancialsProfit;
            return true;
        });

        return this.assembleSidebarMenus(menus, tail);
    }

    isScrapMasterOwner() {
        return this.currentUserId === this.scrapOwnerUid;
    }

    isScrapSuiteContext() {
        const isScrapType = this.businessType === 'scrap_collection_center' || window.location.pathname.includes('/scrap-');
        const roleNorm = String(this.currentRole || '').toUpperCase();
        const isOwnerOrStaff = this.isScrapMasterOwner() || 
                              ['ACCOUNTANT', 'MANAGER', 'BUSINESS_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(roleNorm);
        return isScrapType && isOwnerOrStaff;
    }

    getDashboardMenu() {
        const link = (this.businessType === 'scrap_collection_center' || window.location.pathname.includes('/scrap-'))
            ? '/modules/core/dashboard.html?no-redirect=1'
            : '/modules/core/dashboard.html';
        return [{ icon: '📊', name: 'Dashboard', link: link }];
    }





    /** Customers + Accounting + Reports — always last block after business-specific links. */
    getSharedCrosscutMenus() {
        const accountingLink = this.isBdkAccountingTenant()
            ? '/modules/distributor/web/accounting.html'
            : '/modules/accounts/advanced-accounting-dashboard.html';
        const expensesLink = this.businessType === 'tire_centre' ? '/modules/tire_centre/expenses.html' : (this.businessType === 'manufacturer' ? '/modules/manufacturer/expenses.html' : '/modules/retail/expenses.html');
        const revenueLink = this.businessType === 'tire_centre' ? '/modules/tire_centre/revenue.html' : (this.businessType === 'manufacturer' ? '/modules/manufacturer/sales.html' : '/modules/retail/revenue.html');
        const workbenchLink = this.businessType === 'tire_centre' ? '/modules/tire_centre/workbench.html' : (this.businessType === 'manufacturer' ? '/modules/manufacturer/history.html' : '/modules/retail/workbench.html');
        const isCoreBusinessWithFullSuite = this.businessType === 'retail' || this.businessType === 'tire_centre' || this.businessType === 'manufacturer';
        
        const menus = [
            { icon: '👥', name: 'Customers', link: '/modules/core/customers.html' },
            ...(isCoreBusinessWithFullSuite ? [
                { icon: '💸', name: 'Expenses', link: expensesLink },
                { icon: '📖', name: 'Ledger', link: '/modules/core/ledgers.html' },
                { icon: '💰', name: 'Revenue', link: revenueLink },
                { icon: '📋', name: 'Daily Transactions', link: workbenchLink }
            ] : []),
            ...(isCoreBusinessWithFullSuite ? [] : [{ icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' }]),
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
            if (!m || !m.link) return;
            const name = String(m.name || '').trim();
            const link = String(m.link || '').trim();
            const k = `${name}|${link}`;
            if (seen.has(k)) return;

            // Keep only first menu per canonical URL link (prevents multiple active menu highlights for same page)
            let canonicalLink = link.split('#')[0].replace(/\/+/g, '');
            if (link.includes('?')) {
                const parts = link.split('?');
                const path = parts[0].replace(/\/+/g, '');
                const query = parts[1] || '';
                // If it contains a view= parameter, include it in the canonical check to avoid merging different views of the same page
                if (query.includes('view=')) {
                    const match = query.match(/view=([^&]+)/);
                    if (match) {
                        canonicalLink = `${path}?view=${match[1]}`;
                    }
                } else {
                    canonicalLink = path;
                }
            }
            if (canonicalLink) {
                if (seenLinks.has(canonicalLink)) return;
                seenLinks.add(canonicalLink);
            }

            seen.add(k);
            out.push(m);
        });
        return out;
    }

    getMenus() {
        const user = firebase.auth && firebase.auth.currentUser;
        const authEmail = (user && user.email) || '';
        const storedEmail = localStorage.getItem('digibizMwSyncEmail') || sessionStorage.getItem('digibizMwSyncEmail') || '';
        const emailNorm = String(authEmail || storedEmail || '').trim().toLowerCase();

        // ULTIMATE TOP-LEVEL OVERRIDE FOR RASIKA
        const isRasikaIdentity = emailNorm === 'biz.himeshi@gmail.com' || 
                               (this.ownerName && this.ownerName.includes('Rasika')) || 
                               (document.getElementById('sidebarUserName') && document.getElementById('sidebarUserName').textContent.includes('Rasika'));

        if (isRasikaIdentity) {
            const path = window.location.pathname;
            // If on landing/dashboard OR on the Owner-only Buying Bill page, force redirect to expenses
            if (path.includes('dashboard.html') || path === '/' || path.includes('index.html') || path.includes('scrap-vba') || path.includes('scrap-buying')) {
                window.location.href = '/modules/admin/scrap-expenses.html';
                return [];
            }
            return [
                { icon: '📉', name: 'EXPENSES', link: '/modules/admin/scrap-expenses.html' },
                { id: 'scrap_cash_counting', icon: '🏧', name: 'Cash Counting', link: '/modules/admin/cash-counting.html' }
            ];
        }
        
        console.log('[Sidebar] Menus for:', emailNorm, 'Identity:', isRasikaIdentity);

        const pathLower = String(window.location.pathname || '').toLowerCase();
        const onManufacturerModule = pathLower.includes('/modules/manufacturer/');
        const onAutoCareModule = pathLower.includes('/modules/auto_care/');
        const onTireCentreModule = pathLower.includes('/modules/tire_centre/');
        const normalizedBusinessType = this.normalizeBusinessType(this.businessType || '');
        const menuBusinessType = (onManufacturerModule && this.businessType !== 'scrap_collection_center')
            ? 'manufacturer'
            : (onAutoCareModule ? 'auto_care' : (onTireCentreModule ? 'tire_centre' : normalizedBusinessType));

        if (this.isScrapSuiteContext()) {
            const scrapPool = [
                { id: 'scrap_bill', permissionId: 'canScrapBillCreate', icon: '🧾', name: 'Bill', link: '/modules/admin/scrap-buying.html?v=102' },
                { id: 'scrap_leads', icon: '📍', name: 'DUST TO CASH', link: '/modules/admin/scrap-leads.html' },
                { id: 'scrap_revenue', permissionId: 'canScrapRevenueView', icon: '📈', name: 'Revenue', link: '/modules/admin/scrap-revenue.html' },
                { id: 'scrap_revenue_mgmt', permissionId: 'canScrapRevenueView', icon: '🗓️', name: 'Revenue Mgmt', link: '/modules/admin/scrap-revenue-management.html' },
                { id: 'scrap_expenses', permissionId: 'canScrapExpensesManage', icon: '📉', name: 'Expenses', link: '/modules/admin/scrap-expenses.html' },
                { id: 'scrap_banking', permissionId: 'canViewAccounting', icon: '🏛️', name: 'Banking', link: '/modules/admin/scrap-banking.html' },
                { id: 'scrap_income', permissionId: 'canViewFinancialsProfit', icon: '💰', name: 'Income', link: '/modules/admin/scrap-income.html' },
                { id: 'scrap_sell', permissionId: 'canScrapSellCreate', icon: '💸', name: 'Sell', link: '/modules/admin/scrap-sell.html' },
                { id: 'mobile_sell', permissionId: 'canScrapSellCreate', icon: '📱', name: 'Mobile Sell', link: '/modules/admin/mobile-sell.html' },
                { id: 'scrap_sms', permissionId: 'canSettingsChange', icon: '📲', name: 'Scrap SMS', link: '/modules/admin/scrap-sms-settings.html' },
                { id: 'scrap_stock', permissionId: 'canScrapStockView', icon: '📦', name: 'Stock', link: '/modules/admin/scrap-workbench.html?view=STOCK' },
                { id: 'scrap_buy', permissionId: 'canScrapBuyingHistoryView', icon: '📚', name: 'Buying History', link: '/modules/admin/scrap-workbench.html?view=BUY' },
                { id: 'scrap_history', permissionId: 'canScrapSellingHistoryView', icon: '📜', name: 'Selling History', link: '/modules/admin/scrap-selling-history.html' },
                { id: 'scrap_advance', permissionId: 'canScrapAdvanceManage', icon: '🏦', name: 'Advance', link: '/modules/admin/scrap-advance.html?v=102' },
                { id: 'scrap_vehicles', permissionId: 'canScrapStockView', icon: '🚛', name: 'Vehicles', link: '/modules/admin/scrap-vehicles.html' },
                { id: 'scrap_dailytr', permissionId: 'canScrapRevenueView', icon: '📘', name: 'Daily Transactions', link: '/modules/admin/scrap-workbench.html?view=DAILYTR' },
                { id: 'shared_customers', permissionId: 'canCustomerView', icon: '👥', name: 'Customers', link: '/modules/core/customers.html' },
                { id: 'shared_finance', permissionId: 'canViewFinancialsProfit', icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
                { id: 'shared_accounting', permissionId: 'canViewAccounting', icon: '📁', name: 'Accounting', link: this.isBdkAccountingTenant() ? '/modules/distributor/web/accounting.html' : '/modules/accounts/advanced-accounting-dashboard.html' },
                { id: 'shared_reports', permissionId: 'canViewReportsFull', icon: '📈', name: 'Reports', link: '/modules/reports/index.html' },
                { id: 'shared_loans', permissionId: 'canScrapLoansManage', icon: '💸', name: 'Loans', link: '/modules/core/loans.html' }
            ];
            let finalMenus = [];
            if (this.sidebarConfig && Array.isArray(this.sidebarConfig)) {
                const configMap = new Map();
                this.sidebarConfig.forEach((item, index) => {
                    if (typeof item === 'string') configMap.set(item, { visible: true, order: index });
                    else if (item && item.id) configMap.set(item.id, { visible: item.visible !== false, order: index });
                });

                if (!configMap.has('scrap_revenue_mgmt') && configMap.has('scrap_revenue')) {
                    configMap.set('scrap_revenue_mgmt', { visible: true, order: configMap.get('scrap_revenue').order + 0.5 });
                }

                const perms = this.getDistributorPermissionProfile();
                const ordered = [];
                const newItems = [];
                scrapPool.forEach(m => {
                    // RBAC Hard Filter
                    if (m.permissionId && !perms[m.permissionId]) return;

                    if (configMap.has(m.id)) {
                        const cfg = configMap.get(m.id);
                        if (cfg.visible) ordered.push({ ...m, order: cfg.order });
                    } else {
                        newItems.push({ ...m, isNew: true, order: 999 });
                    }
                });
                ordered.sort((a, b) => a.order - b.order);
                finalMenus = [...ordered, ...newItems];
            } else {
                const perms = this.getDistributorPermissionProfile();
                finalMenus = scrapPool.filter(m => !m.permissionId || !!perms[m.permissionId]);
            }

            // FORCE RESTORATION OF CRITICAL SCRAP LINKS (Bypassing permission/config filters for urgency)
            const scrapForced = [
                { id: 'scrap_master', icon: '⚙️', name: 'Scrap Master', link: '/modules/admin/scrap-master.html' },
                { id: 'scrap_buy', icon: '📚', name: 'Buying History', link: '/modules/admin/scrap-workbench.html?view=BUY' },
                { id: 'scrap_history', icon: '📜', name: 'Selling History', link: '/modules/admin/scrap-selling-history.html' },
                { id: 'shared_loans', icon: '💸', name: 'Loans', link: '/modules/core/loans.html' }
            ];

            const scrapMenus = this.dedupeMenus([ ...this.getDashboardMenu(), ...finalMenus, ...scrapForced ]);
            
            // ABSOLUTE OVERRIDE FOR HIMESHI - EXPENSES & CASH COUNTING ONLY + REDIRECT
            const email = (firebase.auth && firebase.auth.currentUser && firebase.auth.currentUser.email) || '';
            if (String(email).trim().toLowerCase() === 'biz.himeshi@gmail.com') {
                const himeshiMenus = [
                    { id: 'scrap_expenses', icon: '💸', name: 'EXPENSES', link: '/modules/admin/scrap-expenses.html' },
                    { id: 'scrap_cash_counting', icon: '🏧', name: 'Cash Counting', link: '/modules/admin/cash-counting.html' }
                ];
                
                // If on dashboard or anywhere else (except allowed pages), force redirect to expenses
                const path = window.location.pathname;
                const allowedPaths = ['/modules/admin/scrap-expenses.html', '/modules/admin/cash-counting.html'];
                if (path.includes('dashboard.html') || path === '/' || path.includes('index.html')) {
                    setTimeout(() => {
                        window.location.href = '/modules/admin/scrap-expenses.html';
                    }, 500);
                }
                return himeshiMenus;
            }

            if (this.isSuperAdminUser()) {
                scrapMenus.push(
                    { icon: '👑', name: 'Super Admin', link: '/admin/super-dashboard.html' },
                    { icon: '👥', name: 'User Management', link: '/admin/super-dashboard.html#tab-users' }
                );
            }
            return scrapMenus;
        }



        if (!onManufacturerModule && (this.isMwTradingContext() || normalizedBusinessType === 'distributor')) {
            const pool = DISTRIBUTOR_MENU_POOL;
            const perms = this.getDistributorPermissionProfile();
            const isMobile = this.isMobileView();

            const availableMenus = pool.filter(m => {
                if (!isMobile && String(m.link || '').includes('/mobile/')) {
                    return false;
                }
                if (m.permissionId) {
                    return !!perms[m.permissionId];
                }
                return true;
            });

            return availableMenus;
        }

        // 1. Try dynamic configuration from BUSINESS_TYPES
        const dynamicConfig = window.BUSINESS_TYPES ? window.BUSINESS_TYPES[menuBusinessType] : null;
        if (dynamicConfig && dynamicConfig.menus && this.businessId !== this.kduTeaBusinessId && menuBusinessType !== 'distributor') {
            const role = this.currentRole || 'VIEWER';
            let menus = dynamicConfig.menus.filter(m => {
                if (menuBusinessType === 'attendance_payroll' || menuBusinessType === 'auto_care') return true;
                if (!m.role) return true;
                return m.role.includes(role);
            });
            if (menuBusinessType === 'manufacturer') {
                return [...this.getDashboardMenu(), ...menus];
            }
            if (menuBusinessType === 'attendance_payroll' || menuBusinessType === 'auto_care') {
                return this.dedupeMenus(menus);
            }
            return this.assembleSidebarMenus(menus);
        }

        // 2. Fallback to legacy hardcoded logic for special tenants (like KUBUKA)
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
                        { icon: '📜', name: 'Sales History', link: '/modules/retail/sales-history.html' },
                        { icon: '🧾', name: 'Expenses', link: '/modules/retail/expenses.html' },
                        { icon: '📁', name: 'Accounting Dashboard', link: '/modules/accounts/advanced-accounting-dashboard.html' },
                        { icon: '👥', name: 'Customers', link: '/modules/core/customers.html' },
                        { icon: '💳', name: 'Finance', link: '/modules/core/finance-ledger.html' },
                        { icon: '📈', name: 'Reports', link: '/modules/reports/index.html' }
                    ];
                } else {
                    menus = [
                        { icon: '🧱', name: 'Raw Materials', link: '/modules/manufacturer/inbound.html' },
                        { icon: '🏭', name: 'Production / Manufacturing', link: '/modules/manufacturer/outbound.html' },
                        { icon: '📦', name: 'Finished Goods', link: '/modules/manufacturer/stock.html' },
                        { icon: '🛍️', name: 'Sales', link: '/modules/manufacturer/sales.html' },
                        { icon: '🧾', name: 'Expenses', link: '/modules/manufacturer/expenses.html' },
                        { icon: '📚', name: 'History', link: '/modules/manufacturer/history.html' }
                    ];
                }
            } else {
                menus = [
                    { icon: '🧱', name: 'Raw Materials', link: '/modules/manufacturer/inbound.html' },
                    { icon: '🏭', name: 'Production / Manufacturing', link: '/modules/manufacturer/outbound.html' },
                    { icon: '📦', name: 'Finished Goods', link: '/modules/manufacturer/stock.html' },
                    { icon: '🗑️', name: 'Wasted Goods Log', link: '/modules/manufacturer/wastage.html' },
                    { icon: '🛍️', name: 'Sales', link: '/modules/manufacturer/sales.html' },
                    { icon: '🗺️', name: 'Sales Route Plan', link: '/modules/manufacturer/route-plan.html' },
                    { icon: '🧾', name: 'Expenses', link: '/modules/manufacturer/expenses.html' },
                    { icon: '📚', name: 'History', link: '/modules/manufacturer/history.html' }
                ];
            }
        } else {
            menus = [
                { icon: '🛒', name: 'Point of Sale', link: '/modules/retail/pos.html' },
                { icon: '📦', name: 'Inventory', link: '/modules/retail/inventory.html' },
                { icon: '📥', name: 'GRN', link: '/modules/retail/grn.html' }
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
        const cleanLink = (linkPathRaw || '').replace(/\/+/g, '');
        const cleanPath = (pathname || '').split('#')[0].split('?')[0].replace(/\/+/g, '');
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
        const cleanDistPath = distributorOrderStatusPath.replace(/\/+/g, '');
        if (cleanLink === cleanDistPath) {
            if (cleanPath.endsWith(cleanDistPath)) return true;
            return false;
        }
        if (cleanLink.includes('pending-orders.html')) {
            if (cleanPath.endsWith('pending-orders.html')) return true;
            if (cleanPath.endsWith(cleanDistPath) && tab === 'pending') return true;
            return false;
        }
        if (cleanLink.includes('orders.html')) {
            if (cleanPath.endsWith('orders.html')) return true;
            if (cleanPath.endsWith(cleanDistPath) && ['approved', 'dispatched', 'rejected', 'delivered', 'all'].includes(tab)) {
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
            const opt = navigator.onLine ? {} : { source: 'cache' };
            const userDoc = await window.db.collection('users').doc(user.uid).get(opt);
            const userData = userDoc.exists ? userDoc.data() : {};
            this.ownerName = String(userData.ownerName || userData.name || this.ownerName || '').trim();
            const resolvedBusinessId = userData.businessId || this.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || user.uid;
            let resolvedName = '';

            if (resolvedBusinessId) {
                this.businessId = resolvedBusinessId;

                // Fetch Business Info & Permissions Bridge
                try {
                    const opt = navigator.onLine ? {} : { source: 'cache' };
                    const businessDoc = await window.db.collection('businesses').doc(resolvedBusinessId).get(opt);
                    if (businessDoc.exists) {
                        const bd = businessDoc.data() || {};
                        resolvedName = String(bd.name || bd.businessName || '').trim();

                        // Sync Permissions from Bridge (Staff Path) with Version Tracking
                        const cachedVersion = sessionStorage.getItem(`digibiz_perm_v_${resolvedBusinessId}`);
                        const remoteVersion = String(bd.permVersion || '0');

                        if (bd.rbacConfig) {
                            if (cachedVersion !== remoteVersion) {
                                console.log('[Sidebar] Permission version changed, refreshing bridge...');
                                sessionStorage.setItem(`digibiz_perms_v2_${resolvedBusinessId}`, JSON.stringify(bd.rbacConfig));
                                sessionStorage.setItem(`digibiz_perm_v_${resolvedBusinessId}`, remoteVersion);
                                setTimeout(() => this.render(), 100);
                            }
                        } else {
                            // Fallback: Fetch direct config
                            if (cachedVersion !== remoteVersion || !sessionStorage.getItem(`digibiz_perms_v2_${resolvedBusinessId}`)) {
                                console.log('[Sidebar] Refreshing direct permissions...');
                                try {
                                    const opt = navigator.onLine ? {} : { source: 'cache' };
                                    const snap = await window.db.collection('businesses').doc(resolvedBusinessId).collection('configs').doc('permissions').get(opt);
                                    if (snap.exists) {
                                        sessionStorage.setItem(`digibiz_perms_v2_${resolvedBusinessId}`, JSON.stringify(snap.data()));
                                        sessionStorage.setItem(`digibiz_perm_v_${resolvedBusinessId}`, remoteVersion);
                                        setTimeout(() => this.render(), 100);
                                    }
                                } catch (eDirect) { /* ignore */ }
                            }
                        }

                        if (bd.ownerName) this.ownerName = String(bd.ownerName || '').trim();
                        const logo = String(bd.logoUrl || '').trim();
                        if (logo) {
                            this.businessLogoUrl = logo;
                            try { localStorage.setItem('digibizBusinessLogoUrl', logo); } catch (e) { }
                        }
                    }
                } catch (eBiz) { console.warn('Sidebar biz lookup failed:', eBiz); }
            }

            if (!resolvedName) resolvedName = String(this.businessName || 'No Business Connected').trim();

            this.businessId = resolvedBusinessId;
            this.businessName = resolvedName;

            const ownerEl = document.getElementById('sidebarUserName');
            if (ownerEl) ownerEl.textContent = this.ownerName;

            this.renderBusinessName(resolvedName);
            this.renderBusinessLogo();
        } catch (error) {
            console.error('refreshBusinessNameFromProfile failed:', error);
        }
    }

    render() {
        ensureSidebarStyles();
        const pathname = window.location.pathname;
        const settingsItemsBase = [
            { icon: '🏢', name: 'Business Profile', link: '/modules/company/profile.html' },
            { icon: '👥', name: 'Staff Management', link: '/modules/company/staff.html' },
            { icon: '🔑', name: 'Staff Permissions', link: '/modules/core/permissions-config.html', isNew: true },
            { icon: '🎨', name: 'Sidebar Config', link: '/modules/core/sidebar-config.html', isNew: true },
            { icon: '🔐', name: 'Change Password', link: '/modules/core/change-password.html' },
            { icon: '⚙️', name: 'Settings', link: '/modules/company/settings.html' },
            { icon: '🖨️', name: 'Print Settings', link: '/modules/company/print-settings.html', isNew: true },
            { icon: '📲', name: 'SMS Settings', link: '/modules/company/sms-settings.html' },
            { icon: '🧾', name: 'SMS Log', link: '/modules/company/sms-log.html' },
            { icon: '💳', name: 'Billing & Charges', link: '/modules/core/billing.html' },
            { icon: '📄', name: 'Document Settings', link: '/modules/core/document-settings.html' }
        ];
        const user = firebase.auth && firebase.auth.currentUser;
        const authEmail = (user && user.email) || '';
        const storedEmail = localStorage.getItem('digibizMwSyncEmail') || sessionStorage.getItem('digibizMwSyncEmail') || '';
        const emailNorm = String(authEmail || storedEmail || '').trim().toLowerCase();
        const isRasika = emailNorm === 'biz.himeshi@gmail.com' || (this.ownerName && this.ownerName.includes('Rasika'));

        let settingsItems = (this.isRepRole() || isRasika) ? [] : settingsItemsBase.slice();
        if (this.businessType === 'distributor' && window.DigibizDistributorPermissions && !this.isRepRole()) {
            const p = window.DigibizDistributorPermissions.permissionsForRole(this.businessNavRole || this.currentRole || '');
            const rb = p.roleBand;
            const smsLogOk = rb === 'OWNER' || rb === 'SALES_COORDINATOR' || rb === 'AREA_MANAGER';
            settingsItems = settingsItems.filter((item) => {
                if (item.name === 'Business Profile') return !!p.canBusinessInfoEdit;
                if (item.name === 'Staff' || item.name === 'Staff Management') return true;
                if (item.name === 'Staff Permissions') return rb === 'OWNER';
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
            { icon: '📅', name: 'Weekly Loan', link: '/modules/admin/scrap-weekly-loans.html' },
            { icon: '📆', name: 'Daily Loan', link: '/modules/core/loan-daily.html' },
            { icon: '🤝', name: 'Hand Loans', link: '/modules/core/hand-loans.html' },
            { icon: '🟢', name: 'No-interest Loan', link: '/modules/core/loan-no-interest.html' },
            { icon: '📈', name: 'Interest Loan (10%)', link: '/modules/core/loan-interest.html' },
            { icon: '🏦', name: 'Advanced Loan', link: '/modules/core/loan-advanced-investor.html' },
            { icon: '👤', name: 'Investor', link: '/modules/core/investor.html' },
            { icon: '🛡️', name: 'Risk Management', link: '/modules/core/loan-risk-management.html' }
        ];
        const loansActive = loanItems.some((item) => this.isMenuActive(item.link, pathname));
        const financeActive = pathname.includes('receivables.html') || pathname.includes('payables.html') || pathname.includes('credit-aging.html');
        const menuItems = this.getMenus().filter((item) => !['Super Admin', 'User Management', 'Loans'].includes(item.name));
        const html = `
            <div class="retail-navbar digibiz-sidebar">
                <div>
                    <div id="sidebarTrialBanner" style="display:none;" class="trial-sidebar-banner">TRIAL MODE ACTIVE</div>
                    <div class="sidebar-header" style="position: relative;">
                        <div class="logo">DIGIBIZ<span>™</span></div>
                        <div class="sidebar-business-logo-wrap">
                            <img id="sidebarBusinessLogoImg" class="sidebar-business-logo-img" alt="" decoding="async" />
                            <span id="sidebarBusinessLogoIcon" class="sidebar-business-logo-icon is-visible" aria-hidden="true">🏢</span>
                        </div>
                        <div class="sidebar-business-name biz-name" id="sidebarBusinessName"></div>
                        <div class="user-info-sidebar" style="display:flex !important; flex-direction:column !important; align-items:center !important; text-align:center !important; background:rgba(255,255,255,.1) !important; padding:14px 10px 28px 10px !important; border-radius:12px !important; position:relative !important; overflow:hidden !important; width:100% !important; box-sizing:border-box !important;">
                            <div style="width:100%; text-align:center; box-sizing:border-box;">
                                <div class="user-name-sidebar" id="sidebarUserName" style="font-size:14px; font-weight:700; color:#fff; margin-bottom:4px; text-align:center;">Loading...</div>
                                <div class="user-role-sidebar" id="sidebarUserRole" style="font-size:8.5px; padding:3px 10px; border-radius:20px; background:rgba(0,0,0,.35); display:inline-block; white-space:nowrap; max-width:100%; overflow:hidden; text-overflow:ellipsis; letter-spacing:0.2px; box-sizing:border-box;">USER</div>
                                <div class="sidebar-subscription-status" id="sidebarSubscriptionStatus">Checking plan...</div>
                            </div>
                            <div id="sidebarConnectionStatus" style="position:absolute !important; bottom:6px !important; left:0 !important; right:0 !important; text-align:center !important; font-size:9.5px !important; font-weight:800 !important; letter-spacing:0.6px !important; text-transform:uppercase !important; display:block !important; visibility:visible !important;">Checking connection...</div>
                        </div>
                    </div>
                    <div class="nav-links" id="sidebarNavLinks">
                        ${menuItems.map((item) => {
                            const isDashboard = String(item.name).toLowerCase() === 'dashboard' || String(item.link).toLowerCase().includes('dashboard.html');
                            const isExpenses = item.name === 'EXPENSES';
                            const isScrapPage = window.location.pathname.includes('/scrap-');
                            const showScrapBadge = isDashboard && (this.businessType === 'scrap_collection_center' || isScrapPage);
                            const bTypeCurrent = String(this.businessType || localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || '').toLowerCase().trim();
                            const showRetailRevenueBadge = isDashboard && (['retail', 'tire_centre'].includes(bTypeCurrent) || window.location.pathname.includes('/tire_centre/') || window.location.pathname.includes('/retail/'));
                            const showDistributorRevenueBadge = isDashboard && (bTypeCurrent === 'distributor' || window.location.pathname.includes('/distributor/'));
                            
                            let html = `
                            <a href="${item.link}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(item.link, pathname) ? 'active' : ''}" style="position: relative;">
                                <span class="menu-icon">${item.icon}</span>
                                <span>${window.i18n(item.name)}</span>
                                ${item.isNew ? '<span class="menu-badge-new">NEW</span>' : ''}
                                ${showScrapBadge ? '<span id="sidebarScrapPoolBadge" style="position: absolute; right: 10px; top: -15px; font-size: 10px; font-weight: 900; color: #34d399; display: none;"></span>' : ''}
                                ${showRetailRevenueBadge ? `
                                    <span id="sidebarRetailRevenueBadge" style="position: absolute; right: 10px; top: -15px; font-size: 10px; font-weight: 900; display: none; padding: 2px 6px; border-radius: 4px;"></span>
                                    <span id="sidebarLiveCashBadge" style="position: absolute; left: 10px; top: -15px; font-size: 10px; font-weight: 900; display: none; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: #60a5fa;"></span>
                                ` : ''}
                                ${showDistributorRevenueBadge ? `
                                    <span id="sidebarDistributorProfitBadge" style="position: absolute; right: 10px; top: -15px; font-size: 10px; font-weight: 900; display: none; padding: 2px 6px; border-radius: 4px;"></span>
                                ` : ''}
                            </a>
                            `;
                            
                            const bTypeNorm = String(this.businessType || localStorage.getItem('currentBusinessType') || '').toLowerCase();
                            const isFullSuiteBiz = bTypeNorm === 'retail' || bTypeNorm === 'tire_centre' || bTypeNorm === 'manufacturer' || window.location.pathname.includes('/tire_centre/');
                            if (item.name === 'Customers' && isFullSuiteBiz) {
                                const bTypeModule = (bTypeNorm === 'manufacturer' || (!bTypeNorm && !window.location.pathname.includes('/tire_centre/'))) ? 'retail' : (window.location.pathname.includes('/tire_centre/') ? 'tire_centre' : bTypeNorm);
                                const agingLink = `/modules/${bTypeModule}/credit-aging.html`;
                                const receivablesLink = `/modules/${bTypeModule}/receivables.html`;
                                const payablesLink = `/modules/${bTypeModule}/payables.html`;
                                html += `
                                <div class="menu-dropdown ${financeActive ? 'open' : ''}" id="financeDropdown">
                                    <button type="button" class="menu-dropdown-toggle ${financeActive ? 'active' : ''}" id="financeDropdownToggle">
                                        <span style="display: flex; align-items: center; gap: 14px;"><span class="menu-icon">💳</span><span>${window.i18n('Finance')}</span></span><span>${financeActive ? '▾' : '▸'}</span>
                                    </button>
                                    <div class="menu-dropdown-items">
                                        <a href="${receivablesLink}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(receivablesLink, pathname) ? 'active' : ''}"><span class="menu-icon">📈</span><span>Receivables</span></a>
                                        <a href="${payablesLink}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(payablesLink, pathname) ? 'active' : ''}"><span class="menu-icon">📉</span><span>Payables</span></a>
                                        <a href="${agingLink}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(agingLink, pathname) ? 'active' : ''}"><span class="menu-icon">⏳</span><span>Credit Aging</span></a>
                                    </div>
                                </div>
                                `;
                            }
                            
                            if (isExpenses && isRasika) {
                                html += `<div id="sidebarScrapPoolLabel" style="font-size: 16px; font-weight: 900; color: #34d399; padding: 15px 15px 30px 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px;">Checking pool...</div>`;
                            }
                            
                            return html;
                        }).join('')}
                        ${(this.businessType !== 'attendance_payroll' && (this.isSuperAdminUser() || this.businessType === 'scrap_collection_center')) ? `<div class="menu-dropdown ${loansActive ? 'open' : ''}" id="loansDropdown">
                            <button type="button" class="menu-dropdown-toggle ${loansActive ? 'active' : ''}" id="loansDropdownToggle">
                                <span style="display: flex; align-items: center; gap: 14px;"><span class="menu-icon">💸</span><span>Loans</span></span><span>${loansActive ? '▾' : '▸'}</span>
                            </button>
                            <div class="menu-dropdown-items">
                                ${loanItems.map((item) => `<a href="${item.link}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(item.link, pathname) ? 'active' : ''}"><span class="menu-icon">${item.icon}</span><span>${item.name}</span></a>`).join('')}
                            </div>
                        </div>` : ''}
                        ${(this.businessType !== 'attendance_payroll' && settingsItems.length > 0) ? `<div class="menu-dropdown ${settingsActive ? 'open' : ''}" id="settingsDropdown">
                            <button type="button" class="menu-dropdown-toggle ${settingsActive ? 'active' : ''}" id="settingsDropdownToggle">
                                <span style="display: flex; align-items: center; gap: 14px;"><span class="menu-icon">⚙️</span><span>Settings</span></span><span>${settingsActive ? '▾' : '▸'}</span>
                            </button>
                            <div class="menu-dropdown-items">
                                ${settingsItems.map((item) => `<a href="${item.link}" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive(item.link, pathname) ? 'active' : ''}"><span class="menu-icon">${item.icon}</span><span>${item.name}</span></a>`).join('')}
                            </div>
                        </div>` : ''}
                        ${(this.businessType !== 'attendance_payroll') ? `<a href="https://play.google.com/store/account/subscriptions" target="_blank" class="menu-item">
                            <span class="menu-icon">💳</span>
                            <span>Manage Play Subscription</span>
                        </a>` : ''}
                        ${this.isSuperAdminUser() ? `<div class="menu-section-label">Super Admin</div>
                        <a href="/admin/super-dashboard.html" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive('/admin/super-dashboard.html', pathname) ? 'active' : ''}"><span class="menu-icon">👑</span><span>Super Admin</span></a>
                        <a href="/admin/business-management.html" target="${SIDEBAR_NAV_LINK_TARGET}" rel="${SIDEBAR_NAV_LINK_REL}" class="menu-item ${this.isMenuActive('/admin/business-management.html', pathname) ? 'active' : ''}"><span class="menu-icon">💼</span><span>Business Management</span></a>` : ''}
                    </div>
                </div>
                <div class="sidebar-footer">
                    <button class="logout-sidebar-btn" id="sidebarLogoutBtn">Logout</button>
                </div>
            </div>
        `;

        const existingSidebar = document.querySelector('.retail-navbar');
        const mountPoint = document.getElementById('sidebar-container');
        if (mountPoint) {
            if (mountPoint.innerHTML !== html) {
                mountPoint.innerHTML = html;
            }
        } else {
            if (existingSidebar) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const newSidebar = tempDiv.querySelector('.retail-navbar');
                if (newSidebar && existingSidebar.innerHTML !== newSidebar.innerHTML) {
                    existingSidebar.innerHTML = newSidebar.innerHTML;
                }
            } else {
                document.body.insertAdjacentHTML('afterbegin', html);
            }
        }
        this.updateUserInfo();
        this.refreshScrapPoolBadge();
        this.initRetailRevenueBadge();
        this.initDistributorRevenueBadge();
        this.initLiveCashBadge();
        this.updateConnectionStatusText();
        this.attachEvents();
    }

    async refreshScrapPoolBadge() {
        const el = document.getElementById('sidebarScrapPoolBadge');
        if (!el) return;
        const bid = this.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
        if (!bid) return;
        
        // Context detection
        const isScrapBiz = this.businessType === 'scrap_collection_center';
        const isScrapPage = window.location.pathname.includes('/scrap-');
        if (!isScrapBiz && !isScrapPage) return;

        try {
            // Ensure core library is available
            if (!window.scrapVbaCore) {
                if (!document.getElementById('scrap-vba-core-script')) {
                    const s = document.createElement('script');
                    s.id = 'scrap-vba-core-script';
                    s.src = '/core/scrap-vba-core.js?v=78';
                    document.head.appendChild(s);
                }
                setTimeout(() => this.refreshScrapPoolBadge(), 1000);
                return;
            }

            if (!window.scrapVbaCore.getProfitPool) {
                setTimeout(() => this.refreshScrapPoolBadge(), 1000);
                return;
            }



            const bal = await window.scrapVbaCore.getProfitPool(bid);
            el.textContent = Math.floor(bal).toLocaleString();
            el.style.display = 'block';
            el.style.color = bal < 0 ? '#f87171' : '#34d399';
            el.style.background = bal < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
        } catch (e) {
            console.warn('Scrap pool badge refresh failed:', e);
        }
    }

    async initRetailRevenueBadge(retryCount = 0) {
        const u = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
        const bid = this.businessId || localStorage.getItem('selectedBusinessId') || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || (u && u.uid);
        if (!bid) {
            if (retryCount < 10) setTimeout(() => this.initRetailRevenueBadge(retryCount + 1), 300);
            return;
        }

        const bType = String(this.businessType || localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || '').toLowerCase().trim();
        const isTireOrRetail = ['retail', 'tire_centre'].includes(bType) || window.location.pathname.includes('/tire_centre/') || window.location.pathname.includes('/retail/');
        if (!isTireOrRetail) return;

        const el = document.getElementById('sidebarRetailRevenueBadge');
        if (!el) {
            if (retryCount < 10) {
                setTimeout(() => this.initRetailRevenueBadge(retryCount + 1), 300);
            }
            return;
        }

        const extractDateStr = (v) => {
            const now = new Date();
            const todayFallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            if (!v) return todayFallback;
            if (typeof v.toDate === 'function') { const d = v.toDate(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
            if (v.seconds) { const d = new Date(v.seconds * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
            if (typeof v === 'number') { const d = new Date(v); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
            if (typeof v === 'string') {
                if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
                const d = new Date(v);
                if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            return todayFallback;
        };

        // Listen in real-time to today's sales (orders)
        if (typeof this.retailRevenueUnsubscribe === 'function') {
            this.retailRevenueUnsubscribe();
        }

        try {
            const fs = (typeof db !== 'undefined' && db) ? db : (window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore()));
            
            const handleOrderSnap = () => {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                
                Promise.all([
                    fs.collection('orders').doc(bid).collection('list').get().catch(() => ({ docs: [] })),
                    fs.collection('orders').where('businessId', '==', bid).get().catch(() => ({ docs: [] }))
                ]).then(([nestedSnap, flatSnap]) => {
                    const docsMap = {};
                    [...nestedSnap.docs, ...flatSnap.docs].forEach(d => { docsMap[d.id] = d.data(); });
                    
                    let totalRevenue = 0;
                    Object.values(docsMap).forEach(d => {
                        const status = String(d.status || '').toLowerCase();
                        if (status === 'cancelled' || d.isReversed) return;
                        const dtStr = extractDateStr(d.createdAt || d.orderDate || d.date);
                        if (dtStr === todayStr) {
                            totalRevenue += parseFloat(d.total || d.totalAmount || d.netTotal || 0);
                        }
                    });

                    const val = Math.floor(totalRevenue);
                    if (val >= 0) {
                        el.textContent = `+Rs. ${val.toLocaleString()}`;
                        el.style.color = '#34d399';
                        el.style.background = 'rgba(16, 185, 129, 0.15)';
                    } else {
                        el.textContent = `-Rs. ${Math.abs(val).toLocaleString()}`;
                        el.style.color = '#f87171';
                        el.style.background = 'rgba(239, 68, 68, 0.15)';
                    }
                    el.style.display = 'inline-block';
                }).catch(() => {});
            };

            this.retailRevenueUnsubscribe = fs.collection('orders').doc(bid).collection('list').onSnapshot(handleOrderSnap);
            this.retailRevenueUnsubscribeFlat = fs.collection('orders').where('businessId', '==', bid).onSnapshot(handleOrderSnap);
            handleOrderSnap();
        } catch (e) {
            console.warn('[Sidebar] Retail revenue badge initialization failed:', e);
        }
    }

    async initDistributorRevenueBadge(retryCount = 0) {
        const bid = this.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
        if (!bid) return;
        if (String(this.businessType).toLowerCase().trim() !== 'distributor') return;

        const roleNorm = String(this.currentRole || '').toUpperCase();
        const isOwner = this.currentUserId === bid || roleNorm === 'OWNER' || roleNorm === 'BUSINESS_OWNER' || roleNorm === 'DISTRIBUTOR_OWNER' || roleNorm === 'SUPER_ADMIN';
        if (!isOwner) return;

        const el = document.getElementById('sidebarDistributorProfitBadge');
        if (!el) {
            if (retryCount < 5) {
                setTimeout(() => this.initDistributorRevenueBadge(retryCount + 1), 200);
            }
            return;
        }

        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        const endOfToday = new Date();
        endOfToday.setHours(23,59,59,999);

        try {
            const fs = (typeof db !== 'undefined' && db) ? db : (window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore()));
            if (!fs) return;

            const prodMap = {};
            try {
                const pSnap = await fs.collection('products').doc(bid).collection('list').get();
                pSnap.forEach(d => {
                    const data = d.data() || {};
                    prodMap[d.id] = data;
                    if (data.productCode) prodMap[String(data.productCode).trim()] = data;
                });
            } catch(e) {}

            const [ordersSnap, expSnap] = await Promise.all([
                fs.collection('orders').doc(bid).collection('list')
                    .where('createdAt', '>=', startOfToday)
                    .where('createdAt', '<=', endOfToday).get().catch(() => ({ docs: [] })),
                fs.collection('expenses').doc(bid).collection('list')
                    .where('createdAt', '>=', startOfToday)
                    .where('createdAt', '<=', endOfToday).get().catch(() => ({ docs: [] }))
            ]);

            let todayRevenue = 0;
            let todayCogs = 0;
            ordersSnap.docs.forEach(doc => {
                const b = doc.data() || {};
                const status = String(b.status || '').toLowerCase();
                if (status === 'rejected' || status === 'cancelled') return;
                const items = Array.isArray(b.items) ? b.items : [];
                items.forEach(line => {
                    const soldQty = Math.max(0, Number(line.orderedQty != null ? line.orderedQty : line.qty) || 0);
                    const freeQty = Math.max(0, Number(line.freeQty) || 0);
                    const returnQty = Math.max(0, Number(line.returnResellQty != null ? line.returnResellQty : line.returnQty) || 0);
                    const billedQty = Math.max(0, soldQty - returnQty);
                    const unitPrice = Number(line.unitPrice) || 0;
                    let buyPrice = Number(line.buyingPrice || line.buyingPriceRaw || line.costPrice);
                    if (isNaN(buyPrice) || buyPrice <= 0) {
                        const pRef = prodMap[line.productId] || prodMap[line.productCode];
                        buyPrice = pRef ? (Number(pRef.buyingPrice) || Number(pRef.unitPrice) * 0.93) : (unitPrice * 0.93);
                    }
                    todayRevenue += billedQty * unitPrice;
                    todayCogs += (billedQty + freeQty) * buyPrice;
                });
            });

            let todayExp = 0;
            expSnap.docs.forEach(doc => {
                const r = doc.data() || {};
                todayExp += Number(r.amount) || 0;
            });

            const netProfit = Math.floor(todayRevenue - todayCogs - todayExp);
            if (netProfit >= 0) {
                el.textContent = `Today Profit: Rs. ${netProfit.toLocaleString()}`;
                el.style.color = '#34d399';
                el.style.background = 'rgba(16, 185, 129, 0.15)';
            } else {
                el.textContent = `Today Profit: -Rs. ${Math.abs(netProfit).toLocaleString()}`;
                el.style.color = '#f87171';
                el.style.background = 'rgba(239, 68, 68, 0.15)';
            }
            el.style.display = 'inline-block';
        } catch (e) {
            console.warn('[Sidebar] Distributor profit badge failed:', e);
        }
    }

    async initLiveCashBadge(retryCount = 0) {
        const u = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
        const bid = this.businessId || localStorage.getItem('selectedBusinessId') || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || (u && u.uid);
        if (!bid) {
            if (retryCount < 10) setTimeout(() => this.initLiveCashBadge(retryCount + 1), 300);
            return;
        }

        const bType = String(this.businessType || localStorage.getItem('currentBusinessType') || sessionStorage.getItem('currentBusinessType') || '').toLowerCase().trim();
        const isTireOrRetail = ['retail', 'tire_centre'].includes(bType) || window.location.pathname.includes('/tire_centre/') || window.location.pathname.includes('/retail/');
        if (!isTireOrRetail) return;

        const el = document.getElementById('sidebarLiveCashBadge');
        if (!el) {
            if (retryCount < 10) {
                setTimeout(() => this.initLiveCashBadge(retryCount + 1), 300);
            }
            return;
        }

        const fs = (typeof db !== 'undefined' && db) ? db : (window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore()));
        
        const extractDateStr = (v) => {
            const now = new Date();
            const todayFallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            if (!v) return todayFallback;
            if (typeof v.toDate === 'function') { const d = v.toDate(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
            if (v.seconds) { const d = new Date(v.seconds * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
            if (typeof v === 'number') { const d = new Date(v); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
            if (typeof v === 'string') {
                if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
                const d = new Date(v);
                if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            return todayFallback;
        };

        try {
            let initCash = 0;
            let cashSales = 0;
            let cashExp = 0;
            let cashDep = 0;

            const updateDisplay = () => {
                const liveCash = (initCash + cashSales) - cashExp - cashDep;
                el.textContent = `💵 Rs. ${Math.max(0, Math.floor(liveCash)).toLocaleString()}`;
                el.style.display = 'inline-block';
            };

            // 1. Onboarding initial cash from businesses doc and journal entries
            if (typeof this.liveCashUnsubscribeWizard === 'function') this.liveCashUnsubscribeWizard();
            this.liveCashUnsubscribeWizard = fs.collection('businesses').doc(bid).onSnapshot(doc => {
                let foundCash = 0;
                if (doc.exists && doc.data().onboardingBalances?.cash) {
                    foundCash = Number(doc.data().onboardingBalances.cash) || 0;
                }
                if (foundCash > 0) {
                    initCash = foundCash;
                    updateDisplay();
                } else {
                    fs.collection('journal').doc(bid).collection('entries')
                        .where('refType', '==', 'ONBOARDING').get().then(snap => {
                            snap.docs.forEach(d => {
                                if (d.data().ref === 'onboarding_cash') {
                                    const entry = (d.data().entries || [])[0];
                                    if (entry) initCash = Number(entry.amount || entry.debit) || 0;
                                }
                            });
                            updateDisplay();
                        }).catch(() => updateDisplay());
                }
            });

            // 2. Cash Sales today
            if (typeof this.liveCashUnsubscribeSales === 'function') this.liveCashUnsubscribeSales();
            
            const handleCashSalesSnap = () => {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                
                Promise.all([
                    fs.collection('orders').doc(bid).collection('list').get().catch(() => ({ docs: [] })),
                    fs.collection('orders').where('businessId', '==', bid).get().catch(() => ({ docs: [] }))
                ]).then(([nestedSnap, flatSnap]) => {
                    const docsMap = {};
                    [...nestedSnap.docs, ...flatSnap.docs].forEach(d => { docsMap[d.id] = d.data(); });
                    
                    cashSales = 0;
                    Object.values(docsMap).forEach(d => {
                        const status = String(d.status || '').toLowerCase();
                        if (status === 'cancelled' || d.isReversed) return;
                        const dtStr = extractDateStr(d.createdAt || d.orderDate || d.date);
                        const pm = String(d.paymentMethod || 'cash').toLowerCase();
                        if (dtStr === todayStr && pm === 'cash') {
                            cashSales += parseFloat(d.total || d.totalAmount || d.netTotal || 0);
                        }
                    });
                    updateDisplay();
                }).catch(() => {});
            };

            this.liveCashUnsubscribeSales = fs.collection('orders').doc(bid).collection('list').onSnapshot(handleCashSalesSnap);
            this.liveCashUnsubscribeSalesFlat = fs.collection('orders').where('businessId', '==', bid).onSnapshot(handleCashSalesSnap);
            handleCashSalesSnap();

            // 3. Cash Expenses today
            if (typeof this.liveCashUnsubscribeExp === 'function') this.liveCashUnsubscribeExp();
            this.liveCashUnsubscribeExp = fs.collection('expenses').doc(bid).collection('list')
                .onSnapshot(snap => {
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    cashExp = 0;
                    snap.forEach(dDoc => {
                        const d = dDoc.data() || {};
                        const dtStr = extractDateStr(d.expenseDate || d.createdAt || d.date);
                        const pm = String(d.paymentMethod || 'cash').toLowerCase();
                        if (dtStr === todayStr && pm === 'cash') {
                            cashExp += parseFloat(d.amount || 0);
                        }
                    });
                    updateDisplay();
                });

            // 4. Cash Deposits from Drawer to Bank
            if (typeof this.liveCashUnsubscribeDep === 'function') this.liveCashUnsubscribeDep();
            this.liveCashUnsubscribeDep = fs.collection('banks').doc(bid).collection('transactions')
                .where('type', '==', 'CASH_DEPOSIT')
                .onSnapshot(snap => {
                    cashDep = 0;
                    snap.forEach(dDoc => {
                        cashDep += parseFloat(dDoc.data().amount || 0);
                    });
                    updateDisplay();
                });

        } catch (e) {
            console.warn('[Sidebar] Live cash badge failed:', e);
        }
    }

    getBusinessTypePrefix() {
        const raw = String(this.businessType || '').toLowerCase().trim();
        const map = {
            retail: 'RETAIL',
            manufacturer: 'MANUFACTURER',
            distributor: 'DISTRIBUTOR',
            tire_centre: 'TIRE CENTER',
            pharmacy: 'PHARMACY',
            restaurant: 'RESTAURANT',
            garment: 'GARMENT',
            hardware: 'HARDWARE',
            service: 'SERVICE',
            scrap_collection_center: 'SCRAP',
            tea_factory: 'TEA FACTORY'
        };
        if (map[raw]) return map[raw];
        if (!raw) return '';
        return raw.replace(/_/g, ' ').toUpperCase();
    }

    updateUserInfo() {
        const user = firebase.auth().currentUser;
        const authEmail = (user && user.email) || '';
        const emailNorm = String(authEmail).trim().toLowerCase();

        // ULTIMATE OVERRIDE FOR HIMESHI
        if (emailNorm === 'biz.himeshi@gmail.com') {
            this.businessId = 'oDhSDYHQ2dV1DP33koysmZAqaY13';
            this.businessType = 'scrap_collection_center';
            this.ownerName = 'Rasika (Accountant)';
            this.businessName = 'Scrap Business';
        }

        const nameEl = document.getElementById('sidebarUserName');
        const roleEl = document.getElementById('sidebarUserRole');
        if (nameEl) nameEl.textContent = '';
        if (nameEl && this.ownerName) nameEl.textContent = this.ownerName;
        this.renderBusinessName(this.businessName || '');
        if (roleEl) {
            const role = String(this.currentRole || 'USER').replace(/_/g, ' ');
            const prefix = this.getBusinessTypePrefix();
            let fullRoleText = role;
            if (prefix && !role.toUpperCase().startsWith(prefix.toUpperCase()) && !role.toUpperCase().includes('SUPER ADMIN')) {
                fullRoleText = `${prefix} ${role}`;
            }
            roleEl.textContent = fullRoleText;
            if (fullRoleText.length > 20) {
                roleEl.style.fontSize = '7.5px';
            } else if (fullRoleText.length > 15) {
                roleEl.style.fontSize = '8.5px';
            } else {
                roleEl.style.fontSize = '9.5px';
            }
            roleEl.style.whiteSpace = 'nowrap';
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

    updateConnectionStatusText() {
        const el = document.getElementById('sidebarConnectionStatus');
        if (el) {
            if (navigator.onLine) {
                el.style.color = '#34d399'; // green matching badge
                el.textContent = 'ONLINE SYNCHRONIZED';
            } else {
                el.style.color = '#f87171'; // red matching badge
                el.textContent = 'OFFLINE';
            }
        }
    }

    attachEvents() {
        const logoutBtn = document.getElementById('sidebarLogoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                if (typeof window.signOutUser === 'function') {
                    window.signOutUser();
                } else {
                    firebase.auth().signOut().then(() => {
                        sessionStorage.clear();
                        window.location.href = '/auth/login.html';
                    });
                }
            };
        }
        
        this.updateScrapPoolBadge();
        const nav = document.getElementById('sidebarNavLinks');
        if (nav) {
            // Dropdown toggling is handled via global event delegation at the bottom of the script
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

    async updateScrapPoolBadge() {
        const bid = this.businessId || localStorage.getItem('currentBusinessId');
        if (!bid) return;
        
        try {
            const poolLabel = document.getElementById('sidebarScrapPoolLabel');
            const poolBadge = document.getElementById('sidebarScrapPoolBadge');
            
            if (!poolLabel && !poolBadge) return;
            
            if (window.scrapVbaCore && typeof window.scrapVbaCore.getProfitPool === 'function') {
                const bal = await window.scrapVbaCore.getProfitPool(bid);
                const formatted = `Rs ${bal.toLocaleString()}`;
                if (poolLabel) poolLabel.textContent = formatted;
                if (poolBadge) {
                    poolBadge.textContent = formatted;
                    poolBadge.style.display = 'block';
                }
            }
        } catch (e) {
            console.warn('[Sidebar] Pool fetch failed:', e);
        }
    }

    initDynamicLedgerList() {
        const bid = this.businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
        if (!bid) return;
        if (!['retail', 'tire_centre'].includes(String(this.businessType).toLowerCase().trim())) return;

        if (typeof this.ledgerUnsubscribe === 'function') {
            this.ledgerUnsubscribe();
        }

        const fs = (typeof db !== 'undefined' && db) ? db : (window.db || (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore()));
        
        try {
            this.ledgerUnsubscribe = fs.collection('journal').doc(bid).collection('entries')
                .orderBy('date', 'desc')
                .onSnapshot(snapshot => {
                    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    window.sidebar.cachedJournalEntries = entries;
                    this.updateSidebarLedgerList(entries);
                }, error => {
                    console.warn('[Sidebar] Ledger list listener error:', error);
                });
        } catch (e) {
            console.warn('[Sidebar] Ledger list listener failed:', e);
        }
    }

    updateSidebarLedgerList(entries) {
        const itemsContainer = document.getElementById('ledgerDropdownItems');
        if (!itemsContainer) return;

        const glBalances = {};
        entries.forEach(entry => {
            if (entry.isReversed || entry.reversalOf) return;
            (entry.entries || []).forEach(row => {
                const code = row.accountCode || row.accountId || '';
                if (!code) return;
                
                let dr = Number(row.debit) || 0;
                let cr = Number(row.credit) || 0;
                if (row.amount !== undefined && row.type !== undefined) {
                    if (row.type === 'debit') dr = Number(row.amount) || 0;
                    if (row.type === 'credit') cr = Number(row.amount) || 0;
                }
                
                if (!glBalances[code]) {
                    glBalances[code] = {
                        code,
                        name: row.accountName || this.getFallbackGLName(code),
                        debit: 0,
                        credit: 0
                    };
                }
                glBalances[code].debit += dr;
                glBalances[code].credit += cr;
            });
        });

        const activeGL = [];
        for (const code in glBalances) {
            const acc = glBalances[code];
            const isDebitNormal = code.startsWith('1') || code.startsWith('5');
            const balance = isDebitNormal ? (acc.debit - acc.credit) : (acc.credit - acc.debit);
            
            if (Math.abs(balance) >= 0.01) {
                activeGL.push({
                    code,
                    name: acc.name,
                    balance
                });
            }
        }
        activeGL.sort((a, b) => a.code.localeCompare(b.code));

        const customerBalances = {};
        entries.forEach(entry => {
            if (entry.isReversed || entry.reversalOf) return;
            (entry.entries || []).forEach(row => {
                const code = row.accountCode || row.accountId || '';
                if (!code.startsWith('1-1030')) return;
                
                let dr = Number(row.debit) || 0;
                let cr = Number(row.credit) || 0;
                if (row.amount !== undefined && row.type !== undefined) {
                    if (row.type === 'debit') dr = Number(row.amount) || 0;
                    if (row.type === 'credit') cr = Number(row.amount) || 0;
                }
                
                const memo = entry.memo || '';
                let customerName = '';
                if (memo.includes('Customer - ')) {
                    customerName = memo.split('Customer - ')[1].trim();
                } else if (memo.includes('Received from ')) {
                    customerName = memo.split('Received from ')[1].split('.')[0].trim();
                } else if (memo.includes('Sale to ')) {
                    customerName = memo.split('Sale to ')[1].trim();
                } else if (memo.includes('Loan Given to ')) {
                    customerName = memo.split('Loan Given to ')[1].split(' - ')[0].trim();
                } else if (memo.includes('Loan Settled from ')) {
                    customerName = memo.split('Loan Settled from ')[1].trim();
                }
                
                if (!customerName) return;
                
                if (!customerBalances[customerName]) {
                    customerBalances[customerName] = { name: customerName, debit: 0, credit: 0 };
                }
                customerBalances[customerName].debit += dr;
                customerBalances[customerName].credit += cr;
            });
        });

        const activeCustomers = [];
        for (const name in customerBalances) {
            const cb = customerBalances[name];
            const balance = cb.debit - cb.credit;
            if (Math.abs(balance) >= 0.01) {
                activeCustomers.push({ name, balance });
            }
        }
        activeCustomers.sort((a, b) => a.name.localeCompare(b.name));

        const supplierBalances = {};
        entries.forEach(entry => {
            if (entry.isReversed || entry.reversalOf) return;
            (entry.entries || []).forEach(row => {
                const code = row.accountCode || row.accountId || '';
                if (!code.startsWith('2-2010')) return;
                
                let dr = Number(row.debit) || 0;
                let cr = Number(row.credit) || 0;
                if (row.amount !== undefined && row.type !== undefined) {
                    if (row.type === 'debit') dr = Number(row.amount) || 0;
                    if (row.type === 'credit') cr = Number(row.amount) || 0;
                }
                
                const memo = entry.memo || '';
                let supplierName = '';
                if (memo.includes('Supplier - ')) {
                    supplierName = memo.split('Supplier - ')[1].trim();
                } else if (memo.includes('Purchase - Order PO-')) {
                    if (memo.includes('(') && memo.includes(')')) {
                        supplierName = memo.split('(')[1].split(')')[0].trim();
                    }
                }
                
                if (!supplierName) return;
                
                if (!supplierBalances[supplierName]) {
                    supplierBalances[supplierName] = { name: supplierName, debit: 0, credit: 0 };
                }
                supplierBalances[supplierName].debit += dr;
                supplierBalances[supplierName].credit += cr;
            });
        });

        const activeSuppliers = [];
        for (const name in supplierBalances) {
            const sb = supplierBalances[name];
            const balance = sb.credit - sb.debit;
            if (Math.abs(balance) >= 0.01) {
                activeSuppliers.push({ name, balance });
            }
        }
        activeSuppliers.sort((a, b) => a.name.localeCompare(b.name));

        let html = '';
        const formatLKR = (val) => 'Rs. ' + Math.floor(val).toLocaleString();

        if (activeGL.length > 0) {
            html += `<div class="ledger-section-title">ලෙජර් ගිණුම් (General Ledgers)</div>`;
            html += activeGL.map(acc => `
                <a href="javascript:void(0)" onclick="window.sidebar.openLedgerModal('GL', '${acc.code}', '${acc.name}')" class="ledger-sub-item">
                    <span>📂 ${acc.code.replace('-01','')} - ${acc.name}</span>
                    <span class="ledger-balance-badge" style="color: ${acc.balance >= 0 ? '#34d399' : '#f87171'};">${formatLKR(acc.balance)}</span>
                </a>
            `).join('');
        }

        if (activeCustomers.length > 0) {
            html += `<div class="ledger-section-title" style="margin-top: 10px;">පාරිභෝගික ණය (Customers)</div>`;
            html += activeCustomers.map(cust => `
                <a href="javascript:void(0)" onclick="window.sidebar.openLedgerModal('CUSTOMER', 'debtor_${cust.name}', '${cust.name}')" class="ledger-sub-item">
                    <span>👤 ${cust.name}</span>
                    <span class="ledger-balance-badge" style="color: #f87171;">${formatLKR(cust.balance)}</span>
                </a>
            `).join('');
        }

        if (activeSuppliers.length > 0) {
            html += `<div class="ledger-section-title" style="margin-top: 10px;">සැපයුම්කරුවන් (Suppliers)</div>`;
            html += activeSuppliers.map(supp => `
                <a href="javascript:void(0)" onclick="window.sidebar.openLedgerModal('SUPPLIER', 'creditor_${supp.name}', '${supp.name}')" class="ledger-sub-item">
                    <span>🤝 ${supp.name}</span>
                    <span class="ledger-balance-badge" style="color: #fde68a;">${formatLKR(supp.balance)}</span>
                </a>
            `).join('');
        }

        if (activeGL.length === 0 && activeCustomers.length === 0 && activeSuppliers.length === 0) {
            html = `<div style="padding: 10px; font-size: 11px; color: rgba(255,255,255,0.4); text-align: center;">සක්‍රීය ලෙජරයන් කිසිවක් නැත. (No active ledgers)</div>`;
        }

        itemsContainer.innerHTML = html;
    }

    getFallbackGLName(code) {
        const dict = {
            '1-1010-01': 'CASH (ඇතැති මුදල්)',
            '1-1020-01': 'BANK (බැංකු ශේෂය)',
            '1-1030-01': 'Debtors (පාරිභෝගික ණය)',
            '1-1040-01': 'Inventory (තොග වටිනාකම)',
            '2-2010-01': 'Creditors (සැපයුම්කරුවන්ගේ ණය)',
            '3-3010-01': 'Equity (ප්‍රාග්ධනය)',
            '4-4010-01': 'Sales Revenue (විකුණුම්)',
            '5-5010-01': 'Cost of Goods Sold (COGS)',
            '5-5020-01': 'Expenses - Salaries',
            '5-5030-01': 'Expenses - Rent',
            '5-5040-01': 'Expenses - Utilities',
            '5-5050-01': 'Expenses - Marketing',
            '5-5060-01': 'Expenses - Other'
        };
        return dict[code] || 'General Ledger Account';
    }

    openLedgerModal(type, key, name) {
        let modal = document.getElementById('universalLedgerAuditorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'universalLedgerAuditorModal';
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 1000000; font-family: 'Inter', sans-serif;">
                <div style="background: white; border-radius: 24px; width: 90%; max-width: 850px; max-height: 85vh; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid rgba(226, 232, 240, 0.8); display: flex; flex-direction: column;">
                    <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                        <div>
                            <h3 style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: #0f3b2c; margin: 0;">${name}</h3>
                            <span style="font-size: 13px; color: #64748b; font-weight: 500;">Account Code / ID: ${key}</span>
                        </div>
                        <button onclick="document.getElementById('universalLedgerAuditorModal').style.display='none'" style="background: #f1f5f9; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s;">වහන්න (Close)</button>
                    </div>
                    <div style="padding: 24px; overflow-y: auto; flex: 1;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #e2e8f0; background: #f8fafc;">
                                    <th style="padding: 10px; color: #475569; font-weight: 700;">දිනය (Date)</th>
                                    <th style="padding: 10px; color: #475569; font-weight: 700;">ගනුදෙනුව (Reference/Memo)</th>
                                    <th style="padding: 10px; color: #475569; font-weight: 700; text-align: right;">Dr (+)</th>
                                    <th style="padding: 10px; color: #475569; font-weight: 700; text-align: right;">Cr (-)</th>
                                    <th style="padding: 10px; color: #475569; font-weight: 700; text-align: right;">ශේෂය (Balance)</th>
                                </tr>
                            </thead>
                            <tbody id="ledgerModalTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const body = document.getElementById('ledgerModalTableBody');
        const entries = this.cachedJournalEntries || [];
        
        const lines = [];
        entries.forEach(entry => {
            if (entry.isReversed || entry.reversalOf) return;
            
            const memo = entry.memo || '';
            const ref = entry.ref || '';
            let entryDate = null;
            if (entry.date) {
                entryDate = entry.date.toDate ? entry.date.toDate() : new Date(entry.date);
            }
            if (!entryDate || isNaN(entryDate.getTime())) {
                if (entry.createdAt) {
                    entryDate = entry.createdAt.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt);
                }
            }
            if (!entryDate || isNaN(entryDate.getTime())) {
                entryDate = new Date();
            }
            
            (entry.entries || []).forEach(row => {
                const code = row.accountCode || row.accountId || '';
                
                let isMatch = false;
                if (type === 'GL') {
                    isMatch = (code === key);
                } else if (type === 'CUSTOMER') {
                    isMatch = code.startsWith('1-1030') && (memo.toLowerCase().includes(name.toLowerCase()) || ref.toLowerCase().includes(name.toLowerCase()));
                } else if (type === 'SUPPLIER') {
                    isMatch = code.startsWith('2-2010') && (memo.toLowerCase().includes(name.toLowerCase()) || ref.toLowerCase().includes(name.toLowerCase()));
                }
                
                if (isMatch) {
                    let dr = Number(row.debit) || 0;
                    let cr = Number(row.credit) || 0;
                    if (row.amount !== undefined && row.type !== undefined) {
                        if (row.type === 'debit') dr = Number(row.amount) || 0;
                        if (row.type === 'credit') cr = Number(row.amount) || 0;
                    }
                    lines.push({
                        date: entryDate,
                        ref: ref,
                        memo: memo,
                        debit: dr,
                        credit: cr,
                        code: code
                    });
                }
            });
        });
        
        lines.sort((a, b) => a.date - b.date);
        
        if (lines.length === 0) {
            body.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">කිසිදු ගනුදෙනුවක් සොයාගත නොහැක. (No transactions found.)</td></tr>`;
            return;
        }

        const firstCode = lines[0].code;
        const isDebitNormal = firstCode.startsWith('1') || firstCode.startsWith('5');
        
        let runningBalance = 0;
        const formatLKR = (val) => 'Rs. ' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        body.innerHTML = lines.map(line => {
            const dr = line.debit;
            const cr = line.credit;
            
            if (isDebitNormal) {
                runningBalance += (dr - cr);
            } else {
                runningBalance += (cr - dr);
            }
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 10px;">${line.date.toLocaleDateString()}</td>
                    <td style="padding: 12px 10px;">
                        <div style="font-weight: 600; color: #1e293b;">${String(line.ref || '').startsWith('onboarding_') ? 'ආරම්භක සැකසුම (Setup Initialization)' : (line.ref || '-')}</div>
                        <div style="font-size: 12px; color: #64748b;">${line.memo}</div>
                    </td>
                    <td style="padding: 12px 10px; text-align: right; color: #059669; font-weight: 600;">${dr > 0 ? formatLKR(dr) : '-'}</td>
                    <td style="padding: 12px 10px; text-align: right; color: #ef4444; font-weight: 600;">${cr > 0 ? formatLKR(cr) : '-'}</td>
                    <td style="padding: 12px 10px; text-align: right; font-weight: 700; color: #0f3b2c;">${formatLKR(runningBalance)}</td>
                </tr>
            `;
        }).join('');
    }
}

function runPageTranslation() {
    const isApp = sessionStorage.getItem('is_android_app') === 'true';
    const bizType = localStorage.getItem('currentBusinessType') || '';
    const isScrapSystem = bizType === 'scrap_collection_center' || window.location.pathname.includes('/scrap-');
    const isRetailUrl = window.location.pathname.includes('/retail/') || 
                        window.location.pathname.includes('pos.html') || 
                        window.location.pathname.includes('purchases.html') || 
                        window.location.pathname.includes('grn.html') || 
                        window.location.pathname.includes('inventory.html') || 
                        window.location.pathname.includes('receivables.html') || 
                        window.location.pathname.includes('payables.html') ||
                        window.location.pathname.includes('credit-aging.html') ||
                        window.location.pathname.includes('sales-history.html') ||
                        window.location.pathname.includes('workbench.html');
    
    // Retail system is 100% Pure International English; Scrap system retains full Sinhala support
    const isRetailSystem = (bizType === 'retail' || isRetailUrl) && !isScrapSystem;
    const lang = isScrapSystem ? (localStorage.getItem('preferredLanguage') || 'si') : (localStorage.getItem('preferredLanguage') || 'en');
    
    if (lang === 'si') {
        const dict = {
            // Sidebar & Common
            "Dashboard": "Dashboard (ප්‍රධාන පුවරුව)",
            "Point of Sale": "Point of Sale (විකුණුම් පර්යන්තය)",
            "Stock purchases": "Stock purchases (මිලදී ගැනීම්)",
            "Stock": "Stock (තොගය)",
            "Customers": "Customers (පාරිභෝගිකයින්)",
            "Finance": "Finance (මූල්‍ය)",
            "Accounting": "Accounting (ගිණුම්කරණය)",
            "Reports": "Reports (වාර්තා)",
            "Settings": "Settings (සැකසුම්)",
            "Debts to be received by us": "අපිට එන්න තියන ණය",
            "Debts to be paid by us": "අපි ගෙවන්න තියන ණය",
            "Expenses": "වියදම් (Expenses)",
            "Ledger": "ලෙජර් ගිණුම් (Ledger)",
            "Revenue": "ආදායම් විශ්ලේෂණය (Revenue)",
            "Daily Transactions": "දෛනික ගනුදෙනු (Transactions)",
            
            // POS Page
            "Cart": "මිලදී ගන්නා භාණ්ඩ ලැයිස්තුව (Cart)",
            "Walk-in Customer": "සාමාන්‍ය පාරිභෝගිකයා",
            "Select Customer": "පාරිභෝගිකයෙකු තෝරන්න",
            "Subtotal": "එකතුව",
            "Discount": "වට්ටම්",
            "Tax": "බදු",
            "Total": "මුළු එකතුව",
            "Paid Amount": "ගෙවූ මුදල",
            "Balance Due": "ණය ශේෂය",
            "Payment Method": "ගෙවීම් ක්‍රමය",
            "Cash": "Cash (අත්පිට මුදල්)",
            "Card": "Card (කාඩ්පත්)",
            "Credit": "Credit (ණය)",
            "Complete Sale": "විකිණීම සම්පූර්ණ කරන්න",
            "Recent Sales": "මෑතකදී සිදු කළ විකුණුම්",
            "Change": "ඉතිරි මුදල",
            "Total Items": "මුළු අයිතම ගණන",
            "Search products...": "භාණ්ඩ සොයන්න...",
            "Hold": "ප්‍රමාද කරන්න",
            "Pay": "ගෙවන්න",
            "Search by name or phone...": "නම හෝ දුරකථන අංකයෙන් සොයන්න...",
            "Select a customer": "පාරිභෝගිකයෙකු තෝරන්න",
            "Invoice No": "Invoice අංකය",
            "Date": "දිනය",
            "Action": "ක්‍රියාව",
            
            // Stock purchases Page
            "Supplier Management": "සැපයුම්කරුවන් කළමනාකරණය",
            "Add Supplier": "නව සැපයුම්කරුවෙක් එක් කරන්න",
            "Total Suppliers": "මුළු සැපයුම්කරුවන්",
            "Active Suppliers": "සක්‍රිය සැපයුම්කරුවන්",
            "Total Purchases": "මුළු මිලදී ගැනීම්",
            "Outstanding": "සැපයුම්කරුවන්ට ගෙවීමට ඇති ණය",
            "All Suppliers": "සැපයුම්කරුවන් ලැයිස්තුව",
            "Purchase History": "මිලදී ගැනීමේ ඉතිහාසය",
            "Suppliers List": "සැපයුම්කරුවන්ගේ ලැයිස්තුව",
            "Purchase Orders": "මිලදී ගැනීමේ ඇණවුම්",
            "Add Purchase Order": "නව මිලදී ගැනීමේ ඇණවුම",
            "PO Number": "PO අංකය",
            "Supplier": "සැපයුම්කරු",
            "Status": "තත්ත්වය",
            "Pending": "ලැබීමට ඇති",
            "Received": "ලැබී ඇත",
            "Material": "භාණ්ඩය",
            "Quantity": "ප්‍රමාණය",
            "Unit Price": "ඒකක මිල",
            "Material Name": "භාණ්ඩයේ නම",
            "Unit": "ඒකකය",
            "Notes": "සටහන්",
            "Create Purchase Order": "මිලදී ගැනීමේ ඇණවුම සාදන්න",
            
            // Stock Page
            "Inventory Management": "තොග කළමනාකරණය (Stock)",
            "Stock Level": "වත්මන් තොගය",
            "Low Stock Alerts": "අඩු තොග අනතුරු ඇඟවීම්",
            "Total Value": "තොගයේ මුළු වටිනාකම",
            "Total Items": "මුළු භාණ්ඩ වර්ග ගණන",
            "Search Stock...": "තොගය පරීක්ෂා කරන්න...",
            "Stock List": "භාණ්ඩ තොග ලැයිස්තුව",
            "Item Name": "භාණ්ඩයේ නම",
            "SKU": "කේතය (SKU)",
            "Category": "වර්ගය",
            "Stock Qty": "තොග ප්‍රමාණය",
            "Cost Price": "ගැණුම් මිල",
            "Selling Price": "විකුණුම් මිල",
            "Alert Qty": "අවම තොගය",
            "Add Item": "නව භාණ්ඩයක් එක් කරන්න",
            "Edit Item": "භාණ්ඩය සංස්කරණය කරන්න",
            "Delete Item": "භාණ්ඩය ඉවත් කරන්න",
            
            // Customers Page
            "Universal Customers": "පාරිභෝගික කළමනාකරණය (Customers)",
            "Total Customers": "මුළු පාරිභෝගිකයින්",
            "Search Customers...": "පාරිභෝගිකයින් සොයන්න...",
            "Contact Person": "සම්බන්ධීකරණ පුද්ගලයා",
            "Email": "ඊමේල්",
            "WhatsApp Link": "WhatsApp පණිවිඩය",
            "Add Customer": "නව පාරිභෝගිකයෙක් එක් කරන්න",
            
            // Accounting Page
            "Advanced Accounting Dashboard": "ගිණුම්කරණ පුවරුව (Accounting)",
            "General Ledger": "ප්‍රධාන ලෙජරය",
            "Trial Balance": "ශේෂ පත්‍රය (Trial Balance)",
            "Balance Sheet": "ශේෂ පත්‍රය (Balance Sheet)",
            "Profit & Loss": "ලාභ අලාභ ගිණුම (Profit & Loss)",
            "Chart of Accounts": "ගිණුම් වර්ගීකරණය",
            "Journal Entries": "දිනපොත් සටහන් (Journal)",
            "Debit": "හර (Debit)",
            "Credit": "බැර (Credit)",
            "Net Income": "ශුද්ධ ලාභය",
            "Revenue": "ආදායම",
            "Expenses": "වියදම්",
            "Assets": "වත්කම්",
            "Liabilities": "වගකීම්",
            "Equity": "හිමිකම්",
            
            // Reports Page
            "Reports Dashboard": "වාර්තා පුවරුව (Reports Dashboard)",
            "Sales Report": "විකුණුම් වාර්තාව",
            "Product Sales History": "භාණ්ඩ අනුව විකුණුම් වාර්තාව",
            "Purchase Report": "මිලදී ගැනීමේ වාර්තාව",
            "Inventory Report": "තොග වාර්තාව",
            "Profit Report": "ලාභ වාර්තාව",
            "Generate Report": "වාර්තාව සකසන්න",
            "Start Date": "ආරම්භක දිනය",
            "End Date": "අවසාන දිනය",
            "Export to Excel": "Excel ගොනුවක් ලෙස ලබාගන්න",
            "Export to PDF": "PDF ගොනුවක් ලෙස ලබාගන්න",
            
            // Business Profile
            "Business Profile": "ව්‍යාපාරික පැතිකඩ (Profile)",
            "Owner Name": "හිමිකරුගේ නම",
            "Business Name": "ව්‍යාපාරයේ නම",
            "Email Address": "ඊමේල් ලිපිනය",
            "Address": "ලිපිනය",
            "Save Changes": "වෙනස්කම් සුරකින්න",
            "Upload Logo": "ලාංඡනය උඩුගත කරන්න",

            // Receivables & Payables Pages
            "Receivables & Loans Given": "අපිට එන්න තියන ණය (Receivables & Loans Given)",
            "Payables & Loans Received": "අපි ගෙවන්න තියන ණය (Payables & Loans Received)",
            "Record Hand Loan Given": "අතමාරු ණයක් සටහන් කරන්න",
            "Record Hand Loan Received": "අතමාරු ණයක් ලබාගන්න",
            "Customer Outstandings": "මුළු පාරිභෝගික ණය (Customer Outstandings)",
            "Hand Loans Given": "මුළු අතමාරු ණය (Hand Loans Given)",
            "Total Receivables": "මුළු ලැබීමට ඇති ණය (Total Receivables)",
            "Supplier Outstandings": "සැපයුම්කරුවන්ගේ ණය (Supplier Outstandings)",
            "Hand Loans Received": "ලබාගත් අතමාරු ණය (Hand Loans Received)",
            "Total Payables": "මුළු ගෙවීමට ඇති ණය (Total Payables)",
            "Customer Debts Tab": "පාරිභෝගික ණය (Customer Debts)",
            "Hand Loans Given Tab": "අතමාරු ණය දීම් (Hand Loans Given)",
            "Supplier Debts Tab": "සැපයුම්කරුවන්ගේ ණය (Supplier Debts)",
            "Hand Loans Received Tab": "ලබාගත් අතමාරු ණය (Hand Loans Received)",
            "Customer Debts List Title": "පාරිභෝගික ණය ලැයිස්තුව",
            "Supplier Debts List Title": "සැපයුම්කරුවන්ගේ ණය ඇණවුම් ලැයිස්තුව",
            "Hand Loans Given List Title": "අප විසින් ලබා දුන් අතමාරු ණය ලැයිස්තුව",
            "Hand Loans Received List Title": "ලබාගත් අතමාරු ණය ලැයිස්තුව",
            "Invoice No": "Invoice No",
            "PO No": "PO No",
            "Customer Name": "පාරිභෝගිකයාගේ නම",
            "Supplier Name": "සැපයුම්කරුගේ නම",
            "Phone Number": "දුරකථන අංකය",
            "Total Amount": "මුළු මුදල",
            "Paid Amount": "ගෙවූ මුදල",
            "Outstanding": "ණය මුදල",
            "Due Date": "ගෙවිය යුතු දිනය",
            "Actions": "ක්‍රියාකාරකම්",
            "Date": "දිනය",
            "Person Name": "පුද්ගලයාගේ නම",
            "Description": "විස්තරය",
            "Amount": "මුදල",
            "Payment Method": "ගෙවීම් ක්‍රමය",
            "Status": "තත්ත්වය",
            "Receive Payment Button": "මුදල් ලබාගන්න",
            "Pay Supplier Button": "මුදල් ගෙවන්න",
            "Settle Loan Button": "ණය පියවන්න",
            "Receive Payment Modal Title": "මුදල් අයකර ගැනීම (Receive Payment)",
            "Pay Supplier Modal Title": "සැපයුම්කරුට මුදල් ගෙවීම (Pay Supplier)",
            "Add Hand Loan Given Title": "අතමාරු ණයක් සටහන් කිරීම (Add Hand Loan Given)",
            "Add Hand Loan Received Title": "අතමාරු ණයක් සටහන් කිරීම (Add Hand Loan Received)",
            "Outstanding Balance": "ණය මුදල (Outstanding Balance)",
            "Outstanding Amount": "ගෙවීමට ඇති මුදල (Outstanding Amount)",
            "Amount Received": "ලැබුණු මුදල (Amount Received)",
            "Amount Paid": "ගෙවන මුදල (Amount Paid)",
            "Person Name Label": "පුද්ගලයාගේ නම (Person Name)",
            "Amount Label": "මුදල (Amount Rs.)",
            "Date Label": "දිනය (Date)",
            "Payment Method Label": "ගෙවීම් ක්‍රමය (Payment Method)",
            "Description Label": "විස්තරය (Description)",
            "Cancel": "Cancel",
            "Save Payment": "Save Payment",
            "Settle Payment": "Settle Payment",
            "Confirm & Save": "Confirm & Save",
            "Unpaid Badge": "ණය පියවා නැත",
            "Paid Badge": "පියවා ඇත",
            "Loading...": "පූරණය වෙමින්...",
            "No customer credit": "ලැබීමට ඇති පාරිභෝගික ණය කිසිවක් නැත. (No customer credit)",
            "No hand loans given": "ලබාදුන් අතමාරු ණය කිසිවක් නැත. (No hand loans given)",
            "No supplier payables": "ගෙවීමට ඇති සැපයුම්කරුවන්ගේ ණය කිසිවක් නැත. (No supplier payables)",
            "No hand loans received": "ලබාගත් අතමාරු ණය කිසිවක් නැත. (No hand loans received)",
            "Payment saved successfully!": "ගෙවීම සාර්ථකව සටහන් කරගන්නා ලදී!",
            "Hand loan recorded successfully!": "අතමාරු ණය සාර්ථකව සටහන් කරන ලදී!",
            "Hand loan settled successfully!": "අතමාරු ණය පියවීම සාර්ථකව සටහන් කරන ලදී!"
        };

        const translateNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue.trim();
                if (text && dict[text]) {
                    node.nodeValue = dict[text];
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.hasAttribute('placeholder')) {
                    const ph = node.getAttribute('placeholder');
                    if (dict[ph]) node.setAttribute('placeholder', dict[ph]);
                }
                if (node.hasAttribute('data-i18n-title')) {
                    const titleKey = node.getAttribute('data-i18n-title');
                    if (dict[titleKey]) node.setAttribute('title', dict[titleKey]);
                } else if (node.hasAttribute('title')) {
                    const t = node.getAttribute('title');
                    if (dict[t]) node.setAttribute('title', dict[t]);
                }
                if (node.tagName === 'INPUT' && (node.type === 'button' || node.type === 'submit')) {
                    const val = node.value.trim();
                    if (dict[val]) node.value = dict[val];
                }
                node.childNodes.forEach(translateNode);
            }
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    translateNode(node);
                });
            });
        });

        translateNode(document.body);

        observer.observe(document.body, { childList: true, subtree: true });
    } else if (isRetailSystem) {
        const siToEnMap = [
            [/\bපාරිභෝගිකයා\s*\(Customer\)/gi, "Customer"],
            [/\bපාරිභෝගිකයා\b/gi, "Customer"],
            [/\bනව ලියාපදිංචිය\b/gi, "Register Customer"],
            [/\bනව පාරිභෝගිකයෙකු ලියාපදිංචි කිරීම\s*\(Register Customer\)/gi, "Register New Customer"],
            [/\bනව පාරිභෝගිකයෙකු ලියාපදිංචි කිරීම\b/gi, "Register New Customer"],
            [/\bනම\s*\(Full Name\)/gi, "Full Name"],
            [/\bදුරකථන අංකය\s*\(Mobile Number\)/gi, "Mobile Number"],
            [/\bමුළු ණය ශේෂය\b/gi, "Total Outstanding Debt"],
            [/\bමුළු මිලදී ගැනීම්\b/gi, "Total Purchase Value"],
            [/\bගනුදෙනු ඉතිහාසය\s*\(History\)/gi, "Transaction History"],
            [/\bමිලදී ගැනීම් සහ ණය ගනුදෙනු\s*\(Log\)/gi, "Purchase & Credit Log"],
            [/\bමුදල් ගෙවීම්\s*\(Cash Payment\)/gi, "Cash Payment"],
            [/\bණය ගනුදෙනු\s*\(On Credit \/ Pay Later\)/gi, "On Credit / Pay Later"],
            [/\bචෙක්පත් ගෙවීම්\s*\(Cheque Payment\)/gi, "Cheque Payment"],
            [/\bබැංකු මාරු කිරීම්\s*\(Bank Transfer\)/gi, "Bank Transfer"],
            [/\bකාඩ්පත් ගෙවීම්\s*\(Card Payment\)/gi, "Card Payment"],
            [/\bප්‍රධාන පුවරුව\b/gi, "Dashboard"],
            [/\bවිකුණුම් පර්යන්තය\b/gi, "Point of Sale"],
            [/\bමිලදී ගැනීම්\b/gi, "Stock Purchases"],
            [/\bතොගය\b/gi, "Stock / Inventory"],
            [/\bපාරිභෝගිකයින්\b/gi, "Customers"],
            [/\bමූල්‍ය\b/gi, "Finance"],
            [/\bගිණුම්කරණය\b/gi, "Accounting"],
            [/\bවාර්තා\b/gi, "Reports"],
            [/\bසැකසුම්\b/gi, "Settings"],
            [/\bආදායම් විශ්ලේෂණය\b/gi, "Revenue Analysis"],
            [/\bඅපිට එන්න තියන ණය\b/gi, "Receivables"],
            [/\bඅපි ගෙවන්න තියන ණය\b/gi, "Payables"],
            [/\bදෛනික ගනුදෙනු\b/gi, "Daily Transactions"],
            [/\bවියදම්\b/gi, "Expenses"],
            [/\bලෙජර් ගිණුම්\b/gi, "Ledger Accounts"],
            [/\bසාමාන්‍ය පාරිභෝගිකයා\b/gi, "Walk-in Customer"],
            [/\bමුළු එකතුව\b/gi, "Total Amount"],
            [/\bගෙවූ මුදල\b/gi, "Paid Amount"],
            [/\bණය ශේෂය\b/gi, "Balance Due"],
            [/\bගෙවීම් ක්‍රමය\b/gi, "Payment Method"],
            [/\bඅත්පිට මුදල්\b/gi, "Cash"],
            [/\bකාඩ්පත්\b/gi, "Card"],
            [/\bඅවලංගු කරන්න\b/gi, "Cancel"],
            [/\bතහවුරු කරන්න\b/gi, "Confirm"],
            [/\bසාර්ථකයි\b/gi, "Success"],
            [/\bදෝෂයක්\b/gi, "Error"]
        ];

        const purgeSinhala = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.nodeValue;
                if (text && /[\u0D80-\u0DFF]/.test(text)) {
                    siToEnMap.forEach(([pattern, replacement]) => {
                        text = text.replace(pattern, replacement);
                    });
                    // Fallback cleanup for any residual Sinhala characters
                    node.nodeValue = text.replace(/[\u0D80-\u0DFF]+/g, '').trim();
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                ['placeholder', 'title', 'value', 'data-i18n-title'].forEach(attr => {
                    if (node.hasAttribute(attr)) {
                        let val = node.getAttribute(attr);
                        if (val && /[\u0D80-\u0DFF]/.test(val)) {
                            siToEnMap.forEach(([pattern, replacement]) => {
                                val = val.replace(pattern, replacement);
                            });
                            node.setAttribute(attr, val.replace(/[\u0D80-\u0DFF]+/g, '').trim());
                        }
                    }
                });
                node.childNodes.forEach(purgeSinhala);
            }
        };

        purgeSinhala(document.body);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => purgeSinhala(node));
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
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
    
    // Call page translator
    runPageTranslation();
}

// Global event delegation for sidebar dropdown menus (Loans, Finance, Settings)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#settingsDropdownToggle, #loansDropdownToggle, #financeDropdownToggle');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    let ddId = '';
    if (btn.id === 'settingsDropdownToggle') ddId = 'settingsDropdown';
    else if (btn.id === 'loansDropdownToggle') ddId = 'loansDropdown';
    else if (btn.id === 'financeDropdownToggle') ddId = 'financeDropdown';
    
    const dd = document.getElementById(ddId);
    if (dd) {
        dd.classList.toggle('open');
        const marker = btn.lastElementChild;
        if (marker) marker.textContent = dd.classList.contains('open') ? '▾' : '▸';
    }
});

// Primary path: run immediately at script evaluation time.
bootstrapSidebarImmediate();
// Safety fallback for unusual parser timing.
document.addEventListener('DOMContentLoaded', bootstrapSidebarImmediate);

console.log('✅ Sidebar Component Initialized - Retail Navbar v2');
console.log('Sidebar SHOULD_RESERVE_SIDEBAR_SPACE:', SHOULD_RESERVE_SIDEBAR_SPACE);
